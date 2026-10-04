from datetime import datetime, timedelta, timezone

from .composio import ATALHO, PASTA
from .util import agora, parse_data


def inventariar(ctx) -> dict:
    """Percorre a biblioteca e TODAS as subpastas, paginando. Ignora pastas de saída/revisão/controle e
    não segue atalhos. Grava ID, nome, caminho, formato e tamanho de cada arquivo."""
    cfg, est = ctx.cfg, ctx.estado
    raiz, excluir = ctx.ids["biblioteca"], ctx.excluidas()
    limite = datetime.now(timezone.utc) - timedelta(minutes=cfg["arquivos"]["estabilidade_minutos"])
    visto, visitadas, fila = agora(), set(), [(raiz, "", None)]
    resumo = {"pastas": 0, "arquivos": 0, "atalhos": 0, "instaveis": 0, "nativos_google": 0, "vazios": 0}
    est.x("DELETE FROM pastas")
    while fila:
        pasta_id, caminho, pai = fila.pop(0)
        if pasta_id in visitadas or pasta_id in excluir:
            continue
        visitadas.add(pasta_id)
        est.x("INSERT OR REPLACE INTO pastas VALUES(?,?,?)", pasta_id, caminho, pai)
        resumo["pastas"] += 1
        ctx.log(f"  pasta {resumo['pastas']}: /{caminho} (arquivos até agora: {resumo['arquivos']})")
        for it in ctx.drive.listar(pasta_id):
            if it["id"] in excluir:
                continue
            if it["mimeType"] == PASTA:
                fila.append((it["id"], f"{caminho}/{it['name']}".lstrip("/"), pasta_id))
                continue
            situacao = "ok"
            if it["mimeType"] == ATALHO:
                situacao = "atalho"
                resumo["atalhos"] += 1
            elif it["mimeType"].startswith("application/vnd.google-apps."):
                situacao = "nativo_google"
                resumo["nativos_google"] += 1
            elif not it["size"]:
                situacao = "vazio"            # upload possivelmente em andamento
                resumo["vazios"] += 1
            elif parse_data(it["modified"]) > limite or parse_data(it["created"]) > limite:
                situacao = "instavel"
                resumo["instaveis"] += 1
            if situacao == "ok" and not it["md5"]:
                it["md5"] = ctx.drive.metadados(it["id"])["md5"]   # a listagem pode omitir o campo
            est.x("INSERT INTO arquivos VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET "
                  "nome=excluded.nome, caminho=excluded.caminho, pasta_id=excluded.pasta_id, mime=excluded.mime, "
                  "tamanho=excluded.tamanho, md5=excluded.md5, criado=excluded.criado, "
                  "modificado=excluded.modificado, atalho=excluded.atalho, situacao=excluded.situacao, "
                  "visto_em=excluded.visto_em",
                  it["id"], it["name"], caminho, pasta_id, it["mimeType"], it["size"], it["md5"],
                  it["created"], it["modified"], int(situacao == "atalho"), situacao, visto)
            resumo["arquivos"] += 1
            if situacao in ("instavel", "vazio"):
                est.pendencia(it["id"], situacao, f"{caminho}/{it['name']}")
            else:
                est.resolver_pendencia(it["id"], "instavel")
                est.resolver_pendencia(it["id"], "vazio")
    # Arquivos que sumiram da varredura (movidos/removidos): ficam marcados, nunca apagados do histórico.
    est.x("UPDATE arquivos SET situacao='ausente' WHERE visto_em IS NOT ? AND situacao!='ausente'", visto)
    est.set_meta("ultimo_inventario", {"em": visto, **resumo})
    ctx.salvar()
    return resumo
