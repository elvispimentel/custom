import argparse
import os
import sys
import time
import traceback
from pathlib import Path

from . import duplicados as dup
from . import lotes as lt
from . import organizar as org
from . import relatorios as rel
from .composio import Composio, DriveComposio, ILovePDFComposio
from .config import ConfigError, carregar, exigir_credenciais
from .contexto import Contexto, Orcamento
from .controle import BibliotecaOcupada, Controle, PastaAmbigua
from .inventario import inventariar
from .util import humano

COMANDOS = ["verificar", "localizar", "simular", "mover-duplicados", "simular-temas", "aplicar-temas",
            "testar-lote", "processar-lotes", "retomar", "restaurar", "status"]
FERRAMENTAS = ["GOOGLEDRIVE_FIND_FILE", "GOOGLEDRIVE_FIND_FOLDER", "GOOGLEDRIVE_GET_FILE_METADATA",
               "GOOGLEDRIVE_DOWNLOAD_FILE", "GOOGLEDRIVE_CREATE_FOLDER", "GOOGLEDRIVE_MOVE_FILE",
               "GOOGLEDRIVE_UPLOAD_FILE", "GOOGLEDRIVE_RESUMABLE_UPLOAD", "I_LOVE_PDF_GET_ACCOUNT_INFO",
               "I_LOVE_PDF_MERGE_PDFS"]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def resumo_actions(texto):
    destino = os.environ.get("GITHUB_STEP_SUMMARY")
    if destino:
        with open(destino, "a", encoding="utf-8") as f:
            f.write(texto + "\n")


def servicos(cfg):
    c = Composio(cfg.api_key, cfg.user_id, cfg["composio"]["base_url"], cfg["composio"]["versao_ferramentas"],
                 cfg["composio"]["contas"])
    return c, DriveComposio(c), ILovePDFComposio(c, cfg["ilovepdf"]["max_arquivos_por_chamada"])


def _pasta(drive, nome, id_cfg, pai, criar):
    if id_cfg:
        return id_cfg
    achadas = drive.achar_pastas(nome, pai)
    if len(achadas) > 1:
        raise PastaAmbigua(nome, achadas)
    if achadas:
        return achadas[0]["id"]
    return drive.criar_pasta(nome, pai) if criar else ""


def cmd_localizar(cfg, drive):
    nome = cfg["biblioteca"]["nome"]
    achadas = drive.achar_pastas(nome)
    if not achadas:
        raise SystemExit(f"Nenhuma pasta chamada '{nome}' encontrada na conta conectada.")
    linhas = [f"- ID `{a['id']}` | criada {a['created']} | modificada {a['modified']} | pai {','.join(a['parents']) or '(raiz)'}"
              for a in achadas]
    if len(achadas) == 1:
        txt = (f"### Pasta encontrada\n{linhas[0]}\n\nConfirme e grave este ID na variável do repositório "
               f"`BIBLIOTECA_ID` (ou em config.yaml). Nenhuma outra ação foi executada.")
        print(txt)
        resumo_actions(txt)
        return 0
    txt = (f"### Há {len(achadas)} pastas chamadas '{nome}'. Escolha uma e grave o ID em `BIBLIOTECA_ID`:\n"
           + "\n".join(linhas))
    print(txt)
    resumo_actions(txt)
    return 3


def cmd_verificar(cfg, c, drive, pdf):
    ok = True
    for tk in ("googledrive", "i_love_pdf"):
        try:
            ativas = c.contas_ativas(tk)
            log(f"conexão {tk}: {'ATIVA' if ativas else 'SEM CONEXÃO ATIVA'} ({len(ativas)})")
            ok &= bool(ativas)
        except Exception as e:
            log(f"conexão {tk}: falha ao consultar: {e}")
            ok = False
    for slug in FERRAMENTAS:
        try:
            c.esquema_ferramenta(slug)
            log(f"ferramenta {slug}: disponível")
        except Exception as e:
            log(f"ferramenta {slug}: INDISPONÍVEL ({e})")
            ok = False
    try:
        log(f"iLovePDF: {pdf.conta()}")
    except Exception as e:
        log(f"iLovePDF: falha ({e})")
        ok = False
    bid = cfg["biblioteca"]["id"]
    if bid:
        try:
            m = drive.metadados(bid)
            log(f"biblioteca: '{m['name']}' ({m['mimeType']})")
            amostra = next((i for i in drive.listar(bid) if i["size"]), None)
            if amostra:
                log(f"listagem traz md5Checksum: {'sim' if amostra['md5'] else 'NÃO (será consultado por arquivo)'}")
        except Exception as e:
            log(f"biblioteca: falha ({e})")
            ok = False
    else:
        log("biblioteca: ID não configurado (rode 'localizar')")
    return 0 if ok else 1


def preparar(cfg, args, drive, pdf, criar_saidas: bool, run_id):
    bid = cfg["biblioteca"]["id"]
    if not bid:
        raise ConfigError("ID da biblioteca não configurado. Rode 'localizar' e grave BIBLIOTECA_ID.")
    meta = drive.metadados(bid)
    if meta["mimeType"] != "application/vnd.google-apps.folder":
        raise ConfigError(f"BIBLIOTECA_ID ({bid}) não é uma pasta")
    if meta["name"] != cfg["biblioteca"]["nome"]:
        log(f"AVISO: a pasta configurada se chama '{meta['name']}', não '{cfg['biblioteca']['nome']}'")
    S = cfg["pastas_saida"]
    pai = S["pai_id"] or (meta["parents"][0] if meta["parents"] else None)
    if pai == bid:
        raise ConfigError("As pastas de saída não podem ficar dentro da biblioteca (pai_id == biblioteca)")
    ids = {"biblioteca": bid}
    ids["controle"] = _pasta(drive, S["controle_nome"], S["controle_id"], pai, True)
    ids["pdfs"] = _pasta(drive, S["pdfs_nome"], S["pdfs_id"], pai, criar_saidas)
    ids["duplicados"] = _pasta(drive, S["duplicados_nome"], S["duplicados_id"], pai, criar_saidas)
    if bid in (ids["controle"], ids["pdfs"], ids["duplicados"]):
        raise ConfigError("ID de pasta de saída igual ao da biblioteca")
    ctrl = Controle(drive, ids["controle"], Path(cfg["execucao"]["pasta_trabalho"]), run_id)
    ctrl.adquirir_trava()
    estado = ctrl.abrir_estado()
    ctx = Contexto(cfg, drive, pdf, estado, Orcamento(cfg["execucao"]["tempo_max_minutos"]),
                   salvar=lambda: ctrl.salvar_estado(estado), log=log, ids=ids, controle=ctrl)
    return ctx, ctrl


def publicar_relatorios(ctx, extra=None):
    c, est = ctx.controle, ctx.estado
    c.salvar_relatorio("inventario.csv", rel.inventario_csv(est))
    c.salvar_relatorio("relatorio_duplicados.csv", rel.duplicados_csv(est))
    c.salvar_relatorio("historico_movimentacoes.csv", rel.movimentacoes_csv(est))
    c.salvar_relatorio("indice_pdfs.csv", lt.indice_csv(ctx))
    c.salvar_relatorio("pendencias.csv", rel.pendencias_csv(est))
    for nome, texto in (extra or {}).items():
        c.salvar_relatorio(nome, texto)


def mostrar_grupos(grupos):
    linhas = [f"Grupos de duplicados exatos: {len(grupos)}"]
    for g in grupos:
        ex = g["exemplar"]
        linhas.append(f"- SHA-256 {g['sha256'][:12]}… | MANTER: {ex['caminho']}/{ex['nome']} ({humano(ex['tamanho'])}) — {g['motivo']}")
        for d in g["duplicados"]:
            linhas.append(f"    mover para revisão: {d['caminho']}/{d['nome']} [{d['id']}]")
    return "\n".join(linhas)


def executar(args):
    cfg = carregar(args.config)
    exigir_credenciais(cfg)
    c, drive, pdf = servicos(cfg)
    if args.comando == "localizar":
        return cmd_localizar(cfg, drive)
    if args.comando == "verificar":
        return cmd_verificar(cfg, c, drive, pdf)
    precisa_saidas = args.comando in ("mover-duplicados", "testar-lote", "processar-lotes", "retomar")
    ctx, ctrl = preparar(cfg, args, drive, pdf, precisa_saidas, os.environ.get("GITHUB_RUN_ID", "local"))
    try:
        return rodar(ctx, args, c)
    finally:
        try:
            ctx.estado.somar_uso(dict(c.chamadas))
            ctx.salvar()
            ctrl.liberar_trava()
        except Exception:
            traceback.print_exc()


def rodar(ctx, args, c):
    cmd, est = args.comando, ctx.estado
    if cmd == "status":
        for t in ("arquivos", "grupos_dup", "movimentos", "lotes", "avulsos", "pendencias"):
            log(f"{t}: {est.q(f'SELECT COUNT(*) n FROM {t}')[0]['n']}")
        log(f"uso acumulado da API: {[(r['chave'], r['n']) for r in est.q('SELECT * FROM uso_api')]}")
        return 0
    if cmd == "restaurar":
        r = dup.restaurar(ctx, args.tipo)
        log(f"restauração: {r}")
        publicar_relatorios(ctx)
        return 0
    log("1/ inventário (paginado, com subpastas)…")
    resumo = inventariar(ctx)
    log(f"inventário: {resumo}")
    if cmd in ("simular-temas", "aplicar-temas"):
        log("2/ duplicados (para não organizar cópias)…")
    else:
        log("2/ duplicados exatos (checksum do Drive + SHA-256 dos baixados)…")
    grupos = dup.detectar(ctx)
    texto = mostrar_grupos(grupos)
    print(texto)
    resumo_actions("```\n" + texto + "\n```")
    extra = {"simulacao_duplicados.md": texto}
    if cmd == "simular":
        if args.com_lotes:
            plano = lt.planejar(ctx)
            uso = lt.estimar_uso(ctx, plano)
            log(f"lotes planejados: {len(plano)} | estimativa de uso: {uso}")
            resumo_actions(f"Estimativa de uso: `{uso}`")
        else:
            n = len(lt.pdfs_unicos(ctx))
            log(f"PDFs únicos em {n} pasta(s); use --com-lotes para analisar (baixa os PDFs) e estimar lotes/APIs.")
    elif cmd == "mover-duplicados":
        r = dup.mover_duplicados(ctx, grupos)
        log(f"movimentação: {r}")
    elif cmd in ("simular-temas", "aplicar-temas"):
        plano = org.planejar_temas(ctx)
        extra["plano_temas.csv"] = org.plano_csv(plano)
        contagem = {}
        for p in plano:
            contagem[p["acao"]] = contagem.get(p["acao"], 0) + 1
        log(f"plano de temas/autores: {contagem}")
        resumo_actions(f"Plano de temas/autores: `{contagem}` (veja plano_temas.csv na pasta de controle)")
        if cmd == "aplicar-temas":
            log(f"movimentação por tema/autor: {org.aplicar_temas(ctx, plano)}")
    else:  # testar-lote | processar-lotes | retomar
        limite = 1 if cmd == "testar-lote" else args.max_lotes
        plano = lt.planejar(ctx, parar_em=limite or None)
        uso = lt.estimar_uso(ctx, plano)
        log(f"lotes pendentes: {uso['lotes_pendentes']} | estimativa de uso: {uso}")
        if uso["lotes_pendentes"]:
            lt.verificar_ilovepdf(ctx, uso)
        r = lt.processar(ctx, plano, limite)
        log(f"processamento: {r}")
        resumo_actions(f"Processamento: `{r}`" + ("\n\nTempo esgotado: rode **Retomar**." if r["interrompido"] else ""))
    publicar_relatorios(ctx, extra)
    pend = est.q("SELECT tipo, COUNT(*) n FROM pendencias GROUP BY tipo")
    if pend:
        log("pendências: " + ", ".join(f"{p['tipo']}={p['n']}" for p in pend))
    log(f"chamadas ao Composio nesta execução: {dict(c.chamadas)}")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="biblioteca", description=__doc__)
    ap.add_argument("comando", choices=COMANDOS)
    ap.add_argument("--config")
    ap.add_argument("--max-lotes", type=int, default=0, help="0 = todos")
    ap.add_argument("--com-lotes", action="store_true", help="em 'simular': analisa PDFs e estima lotes/uso de API")
    ap.add_argument("--tipo", choices=["duplicado", "tema"], default="duplicado")
    try:
        return executar(ap.parse_args(argv))
    except PastaAmbigua as e:
        print(f"{e}")
        for o in e.opcoes:
            print(f"  - {o['id']} | criada {o['created']} | pai {','.join(o['parents'])}")
        print("Grave o ID escolhido na variável correspondente (PASTA_*_ID) e rode de novo.")
        return 3
    except BibliotecaOcupada as e:
        print(f"BIBLIOTECA OCUPADA: {e}")
        return 4
    except ConfigError as e:
        print(f"CONFIGURAÇÃO: {e}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
