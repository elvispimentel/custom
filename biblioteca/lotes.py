import csv
import io

from .controle import achar_ou_criar_pasta
from .pdfs import Info, analisar, chamadas_merge, formar_lotes, juntar_ordenado, validar_final
from .util import agora, md5_bytes, natural_key, nome_seguro, sha256_bytes


class ErroLote(Exception):
    pass


def _eh_pdf(r) -> bool:
    return r["mime"] == "application/pdf" or r["nome"].lower().endswith(".pdf")


def pdfs_unicos(ctx) -> dict[str, list[dict]]:
    """PDFs estáveis, não duplicados (exemplares e únicos), agrupados por pasta e em ordem natural."""
    dups = {r["file_id"] for r in ctx.estado.q("SELECT file_id FROM membros_dup WHERE papel='duplicado'")}
    por_pasta: dict[str, list[dict]] = {}
    for r in ctx.estado.q("SELECT * FROM arquivos WHERE situacao='ok'"):
        if _eh_pdf(r) and r["id"] not in dups:
            por_pasta.setdefault(r["caminho"], []).append(dict(r))
    for lista in por_pasta.values():
        lista.sort(key=lambda r: natural_key(r["nome"]))
    return dict(sorted(por_pasta.items(), key=lambda kv: natural_key(kv[0])))


def info_de(ctx, f, baixar=True) -> Info | None:
    r = ctx.estado.q("SELECT * FROM pdf_info WHERE file_id=? AND md5=?", f["id"], f["md5"] or "")
    if r:
        r = r[0]
        return Info(r["situacao"], r["paginas"], r["palavras"], r["chars_pag"], r["detalhe"])
    if not baixar:
        return None
    dados = ctx.drive.baixar(f["id"])
    if f["md5"] and md5_bytes(dados) != f["md5"]:
        raise ErroLote(f"checksum do download difere do Drive para {f['nome']}")
    i = analisar(dados, ctx.cfg)
    ctx.estado.x("INSERT OR REPLACE INTO pdf_info VALUES(?,?,?,?,?,?,?)", f["id"], f["md5"] or "",
                 i.paginas, i.palavras, i.chars_pag, i.situacao, i.detalhe)
    return i


def chave_lote(itens) -> str:
    return sha256_bytes("|".join(f"{i['id']}:{i['md5']}" for i in itens).encode())[:16]


def planejar(ctx, analisar_tudo=True, parar_em=None) -> list[dict]:
    """Analisa os PDFs (baixando-os uma vez; resultado fica no banco) e forma os lotes por pasta.
    Protegidos/inválidos viram pendências; grandes demais viram 'avulsos' (subir separadamente)."""
    est, plano = ctx.estado, []
    for caminho, arqs in pdfs_unicos(ctx).items():
        elegiveis = []
        for f in arqs:
            if ctx.orcamento.esgotado():
                ctx.salvar()
                raise TimeoutError("tempo esgotado durante a análise; execute 'retomar'")
            try:
                i = info_de(ctx, f, baixar=analisar_tudo)
            except Exception as e:
                est.pendencia(f["id"], "analise", str(e)[:300])
                continue
            if i is None:
                continue
            est.resolver_pendencia(f["id"], "analise")
            if i.situacao in ("protegido", "invalido"):
                est.pendencia(f["id"], i.situacao, i.detalhe)
                continue
            est.resolver_pendencia(f["id"], "protegido")
            est.resolver_pendencia(f["id"], "invalido")
            if i.situacao == "ocr":
                est.pendencia(f["id"], "ocr", i.detalhe)
            else:
                est.resolver_pendencia(f["id"], "ocr")
            elegiveis.append({**f, "tamanho": f["tamanho"], "palavras": i.palavras, "paginas": i.paginas,
                              "situacao_pdf": i.situacao})
        lotes, avulsos = formar_lotes(elegiveis, ctx.cfg)
        for a in avulsos:
            est.x("INSERT OR REPLACE INTO avulsos VALUES(?,?,?)", a["id"], f"{caminho}/{a['nome']}".lstrip("/"), a["motivo"])
            est.pendencia(a["id"], "enviar_separadamente", a["motivo"])
        chaves = set()
        for seq, itens in enumerate(lotes, 1):
            k = chave_lote(itens)
            chaves.add(k)
            base = nome_seguro(caminho.split("/")[-1] or ctx.cfg["biblioteca"]["nome"])
            nome = f"{base}_lote_{seq:03d}_{k[:6]}.pdf"
            est.x("INSERT INTO lotes(chave,pasta,seq,status,saida_nome,atualizado) VALUES(?,?,?,?,?,?) "
                  "ON CONFLICT(chave) DO UPDATE SET obsoleto=0, seq=excluded.seq, saida_nome=excluded.saida_nome",
                  k, caminho, seq, "pendente", nome, agora())
            est.x("DELETE FROM lote_itens WHERE chave=?", k)
            pag = 1
            for ordem, it in enumerate(itens):
                est.x("INSERT INTO lote_itens VALUES(?,?,?,?,?,?)", k, ordem, it["id"], it["nome"], pag, pag + it["paginas"] - 1)
                pag += it["paginas"]
            plano.append({"chave": k, "pasta": caminho, "seq": seq, "nome": nome, "itens": itens,
                          "paginas": pag - 1, "palavras": sum(i["palavras"] for i in itens), "tamanho": sum(i["tamanho"] for i in itens)})
        for r in est.q("SELECT chave FROM lotes WHERE pasta=? AND obsoleto=0", caminho):
            if r["chave"] not in chaves:   # composição mudou (novos livros chegando): resultado antigo fica, marcado
                est.x("UPDATE lotes SET obsoleto=1 WHERE chave=?", r["chave"])
        if parar_em and len([p for p in plano if est.q("SELECT status FROM lotes WHERE chave=?", p["chave"])[0]["status"] != "done"]) >= parar_em:
            break
    ctx.salvar()
    return plano


def estimar_uso(ctx, plano) -> dict:
    mx = ctx.pdf.max_arquivos
    pend = [p for p in plano if ctx.estado.q("SELECT status FROM lotes WHERE chave=?", p["chave"])[0]["status"] != "done"]
    n_arq = sum(len(p["itens"]) for p in pend)
    merges = sum(chamadas_merge(len(p["itens"]), mx) for p in pend)
    return {"lotes_pendentes": len(pend), "arquivos_a_juntar": n_arq, "chamadas_merge_ilovepdf": merges if getattr(ctx.pdf, "consome_creditos", True) else 0,
            "chamadas_merge_total": merges,
            "downloads_drive": n_arq, "uploads_drive": len(pend),
            "chamadas_composio_aprox": n_arq * 2 + len(pend) * 4 + (merges * 2 + n_arq if getattr(ctx.pdf, "consome_creditos", True) else 0)}


def pasta_saida_para(ctx, caminho: str) -> str:
    atual = ctx.ids["pdfs"]
    acum = ""
    for seg in [s for s in caminho.split("/") if s]:
        acum = f"{acum}/{seg}".lstrip("/")
        chave = f"pasta_saida:{acum}"
        pid = ctx.estado.meta(chave)
        if not pid:
            pid = achar_ou_criar_pasta(ctx.drive, seg, atual)
            ctx.estado.set_meta(chave, pid)
        atual = pid
    return atual


def verificar_ilovepdf(ctx, uso) -> dict:
    """Confirma conexão e capacidade ANTES de processar. Valores ausentes viram aviso, zero bloqueia."""
    info = ctx.pdf.conta()
    ctx.log(f"iLovePDF conta: {info}")
    reserva = ctx.cfg["ilovepdf"]["reservar_creditos"]
    for chave, necessario in (("remaining_credits", uso["chamadas_merge_ilovepdf"] + reserva),
                              ("remaining_files", uso["arquivos_a_juntar"])):
        restante = info.get(chave)
        if restante is not None and restante <= 0:
            raise ErroLote(f"iLovePDF sem {chave} disponível ({restante})")
        if restante is not None and restante < necessario:
            ctx.log(f"AVISO: {chave}={restante} é menor que o estimado ({necessario}); o processamento pode parar no meio e poderá ser retomado.")
    return info


def executar_lote(ctx, p) -> dict:
    est, cfg = ctx.estado, ctx.cfg
    mx = ctx.pdf.max_arquivos
    arquivos = []
    for it in p["itens"]:
        dados = ctx.drive.baixar(it["id"])
        if it["md5"] and md5_bytes(dados) != it["md5"]:
            raise ErroLote(f"checksum do download difere do Drive para {it['nome']}")
        arquivos.append((it["nome"], dados))
    if p["palavras"] > cfg["lotes"]["limite_palavras"]:
        raise ErroLote(f"lote com ~{p['palavras']} palavras excede o teto do NotebookLM ({cfg['lotes']['limite_palavras']})")
    final = juntar_ordenado(ctx.pdf, arquivos, p["nome"], mx)
    v = validar_final(final, p["paginas"], cfg)
    if not v["ok"]:
        raise ErroLote("validação do PDF final falhou: " + "; ".join(v["avisos"]))
    destino = pasta_saida_para(ctx, p["pasta"])
    existentes = [i for i in ctx.drive.listar(destino) if i["name"] == p["nome"]]
    if len(existentes) > 1:
        raise ErroLote(f"{len(existentes)} arquivos '{p['nome']}' já existem na saída; resolva manualmente")
    if existentes and existentes[0]["size"] == len(final):
        saida_id = existentes[0]["id"]            # execução anterior interrompida depois do upload: reaproveita
    else:
        saida_id = ctx.drive.enviar(p["nome"], final, destino, "application/pdf",
                                    atualizar_id=existentes[0]["id"] if existentes else None)
    est.x("UPDATE lotes SET status='done', saida_id=?, paginas=?, tamanho=?, erro=NULL, atualizado=? WHERE chave=?",
          saida_id, v["paginas"], v["tamanho"], agora(), p["chave"])
    if not v["texto"]:
        est.pendencia(saida_id, "ocr_final", f"{p['nome']}: " + "; ".join(v["avisos"]))
    return v


def processar(ctx, plano, max_lotes=0) -> dict:
    est, res = ctx.estado, {"concluidos": 0, "erros": 0, "interrompido": False}
    for p in plano:
        if est.q("SELECT status FROM lotes WHERE chave=?", p["chave"])[0]["status"] == "done":
            continue
        if max_lotes and res["concluidos"] + res["erros"] >= max_lotes:
            break
        if ctx.orcamento.esgotado():
            res["interrompido"] = True
            break
        try:
            executar_lote(ctx, p)
            res["concluidos"] += 1
            ctx.log(f"lote ok: {p['nome']} ({p['paginas']} págs)")
        except Exception as e:
            est.x("UPDATE lotes SET status='erro', erro=?, atualizado=? WHERE chave=?", str(e)[:400], agora(), p["chave"])
            res["erros"] += 1
            ctx.log(f"lote com erro: {p['nome']}: {e}")
        ctx.salvar()
    return res


def indice_csv(ctx) -> str:
    est = ctx.estado
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["arquivo_original", "id_drive", "caminho_original", "pdf_final", "id_pdf_final",
                "pagina_inicial", "pagina_final", "status", "observacao"])
    for r in est.q("""SELECT l.saida_nome, l.saida_id, l.status, l.obsoleto, l.erro, i.nome, i.file_id,
                      i.pagina_ini, i.pagina_fim, a.caminho FROM lotes l JOIN lote_itens i ON i.chave=l.chave
                      LEFT JOIN arquivos a ON a.id=i.file_id ORDER BY l.pasta, l.seq, i.ordem"""):
        status = "obsoleto" if r["obsoleto"] else r["status"]
        w.writerow([r["nome"], r["file_id"], r["caminho"], r["saida_nome"] if r["status"] == "done" else "",
                    r["saida_id"] or "", r["pagina_ini"], r["pagina_fim"], status, r["erro"] or ""])
    for r in est.q("SELECT a.*, v.caminho AS cam, v.motivo FROM avulsos v JOIN arquivos a ON a.id=v.file_id"):
        w.writerow([r["nome"], r["id"], r["cam"], "", "", "", "", "enviar_separadamente", r["motivo"]])
    for r in est.q("SELECT p.*, a.nome, a.caminho FROM pendencias p JOIN arquivos a ON a.id=p.file_id "
                   "WHERE p.tipo IN ('protegido','invalido','ocr')"):
        w.writerow([r["nome"], r["file_id"], r["caminho"], "", "", "", "", r["tipo"], r["detalhe"]])
    return out.getvalue()
