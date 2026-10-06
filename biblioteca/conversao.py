"""Converte livros que não são PDF (docx, doc, txt, rtf, odt, epub, mobi, azw3) em PDF, para que entrem nos lotes.
O original fica onde está; o PDF convertido vai para <pasta de PDFs>/<conversao.pasta>/<caminho do original>."""
import os
import subprocess
import tempfile
from pathlib import Path

from . import lotes as lt
from .pdfs import abrir_leitor
from .util import agora, md5_bytes, natural_key, nome_seguro

LIBREOFFICE = {"doc", "docx", "rtf", "odt", "txt"}
CALIBRE = {"epub", "mobi", "azw3"}


class ErroConversao(Exception):
    pass


def extensao(nome: str) -> str:
    return os.path.splitext(nome)[1].lower().lstrip(".")


def converter_bytes(dados: bytes, ext: str, timeout_s: int = 300) -> bytes:
    """Converte em um diretório temporário. LibreOffice para documentos de texto; Calibre para e-books."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        entrada, saida = tmp / f"livro.{ext}", tmp / "saida"
        saida.mkdir()
        entrada.write_bytes(dados)
        env = {**os.environ, "HOME": str(tmp), "QT_QPA_PLATFORM": "offscreen", "QTWEBENGINE_CHROMIUM_FLAGS": "--no-sandbox"}
        if ext in LIBREOFFICE:
            cmd = ["soffice", f"-env:UserInstallation=file://{tmp}/lo", "--headless", "--norestore",
                   "--convert-to", "pdf", "--outdir", str(saida), str(entrada)]
            esperado = saida / "livro.pdf"
        elif ext in CALIBRE:
            esperado = saida / "livro.pdf"
            cmd = ["ebook-convert", str(entrada), str(esperado)]
        else:
            raise ErroConversao(f"formato sem conversor: {ext}")
        try:
            r = subprocess.run(cmd, capture_output=True, timeout=timeout_s, env=env, text=True)
        except FileNotFoundError as e:
            raise ErroConversao(f"programa de conversão ausente: {cmd[0]}") from e
        except subprocess.TimeoutExpired as e:
            raise ErroConversao(f"conversão passou de {timeout_s}s") from e
        if not esperado.exists() or esperado.stat().st_size == 0:
            raise ErroConversao(f"conversão não gerou PDF (código {r.returncode}): {(r.stderr or r.stdout)[-200:]}")
        pdf = esperado.read_bytes()
    try:
        leitor, _ = abrir_leitor(pdf)
        if len(leitor.pages) < 1:
            raise ErroConversao("PDF convertido sem páginas")
    except ErroConversao:
        raise
    except Exception as e:
        raise ErroConversao(f"PDF convertido não abre: {type(e).__name__}") from e
    return pdf


def candidatos(ctx) -> list[dict]:
    """Livros não-PDF, estáveis e não duplicados, ainda sem conversão concluída para a versão atual."""
    cfg = ctx.cfg["conversao"]
    formatos = {f.lower().lstrip(".") for f in cfg["formatos"]}
    dups = {r["file_id"] for r in ctx.estado.q("SELECT file_id FROM membros_dup WHERE papel='duplicado'")}
    feitos = {(r["file_id"], r["md5"]) for r in ctx.estado.q("SELECT file_id, md5 FROM conversoes WHERE status IN ('done','falha')")}
    saida = []
    for r in ctx.estado.q("SELECT * FROM arquivos WHERE situacao='ok'"):
        if extensao(r["nome"]) in formatos and r["id"] not in dups and (r["tamanho"] or 0) > 0 \
                and (r["id"], r["md5"] or "") not in feitos:
            saida.append(dict(r))
    saida.sort(key=lambda r: natural_key(r["caminho"] + "/" + r["nome"]))
    return saida


def converter_pendentes(ctx, limite=0) -> dict:
    est, cfg = ctx.estado, ctx.cfg["conversao"]
    res = {"convertidos": 0, "falhas": 0, "erros": 0, "interrompido": False}
    lista = candidatos(ctx)
    ctx.log(f"conversão: {len(lista)} livro(s) para converter" + (f" (limite desta execução: {limite})" if limite else ""))
    for n, f in enumerate(lista, 1):
        if limite and res["convertidos"] + res["falhas"] + res["erros"] >= limite:
            break
        if ctx.orcamento.esgotado():
            res["interrompido"] = True
            break
        ext, md5 = extensao(f["nome"]), f["md5"] or ""
        try:
            dados = ctx.drive.baixar(f["id"])
            if md5 and md5_bytes(dados) != md5:
                raise IOError(f"checksum do download difere do Drive para {f['nome']}")
            try:
                pdf = converter_bytes(dados, ext, cfg["timeout_s"])
            except ErroConversao as e:                       # falha do conteúdo: não adianta repetir
                est.x("INSERT OR REPLACE INTO conversoes VALUES(?,?,?,?,?,?,?,?,?,?)",
                      f["id"], md5, ext, None, None, None, None, "falha", str(e)[:300], agora())
                est.pendencia(f["id"], "conversao", str(e)[:300])
                res["falhas"] += 1
                ctx.log(f"conversão falhou: {f['nome']}: {e}")
                continue
            nome_pdf = nome_seguro(f"{os.path.splitext(f['nome'])[0]} [{ext}] {f['id'][:6]}") + ".pdf"
            destino = lt.pasta_saida_para(ctx, "/".join(p for p in (cfg["pasta"], f["caminho"]) if p))
            existentes = [i for i in ctx.drive.listar(destino) if i["name"] == nome_pdf]
            pdf_id = ctx.drive.enviar(nome_pdf, pdf, destino, "application/pdf",
                                      atualizar_id=existentes[0]["id"] if existentes else None)
            est.x("INSERT OR REPLACE INTO conversoes VALUES(?,?,?,?,?,?,?,?,?,?)",
                  f["id"], md5, ext, pdf_id, md5_bytes(pdf), len(pdf), nome_pdf, "done", None, agora())
            est.resolver_pendencia(f["id"], "conversao")
            res["convertidos"] += 1
        except Exception as e:                               # download/upload: transitório, tenta de novo na próxima
            est.pendencia(f["id"], "conversao", f"erro transitório: {str(e)[:250]}")
            res["erros"] += 1
            ctx.log(f"erro ao converter {f['nome']}: {e}")
        if n % 10 == 0:
            ctx.salvar()
    ctx.salvar()
    return res
