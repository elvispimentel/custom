"""Duplicados exatos pelo conteúdo binário: checksum do Drive para achar candidatos; SHA-256 dos
arquivos baixados para confirmar. Nome igual, tamanho igual ou título parecido NÃO provam nada."""
from collections import defaultdict

from .controle import achar_ou_criar_pasta
from .util import agora, natural_key, parse_data, sha256_bytes


def em_pasta_de_copias(caminho: str, padroes) -> bool:
    return any(p.lower() in seg for seg in caminho.lower().split("/") for p in padroes)


def data_mais_antiga(m) -> str:
    """Menor data entre criação e modificação. A criação no Drive é a do upload (igual para um lote inteiro);
    a modificação preserva a data original do arquivo, então a menor das duas representa melhor 'o mais antigo'."""
    datas = [d for d in (m["criado"], m["modificado"]) if d]
    return min(datas, key=lambda d: parse_data(d)) if datas else "9999-12-31T00:00:00+00:00"


def escolher_exemplar(membros, padroes):
    """Regra determinística: (1) fora de pastas de cópias; (2) data mais antiga (criação ou modificação);
    (3) caminho; (4) id."""
    def chave(m):
        return (em_pasta_de_copias(m["caminho"], padroes), parse_data(data_mais_antiga(m)),
                natural_key(m["caminho"] + "/" + m["nome"]), m["id"])
    ex = sorted(membros, key=chave)[0]
    fora = [m for m in membros if not em_pasta_de_copias(m["caminho"], padroes)]
    if not fora:
        motivo = "data mais antiga (criação/modificação); todos os candidatos estão em pastas de cópias"
    elif len(fora) == len(membros):
        motivo = "data mais antiga (criação/modificação) entre os candidatos"
    elif len(fora) == 1:
        motivo = "único candidato fora de pastas de cópias"
    else:
        motivo = "data mais antiga (criação/modificação) entre os que estão fora de pastas de cópias"
    return ex, motivo


def _sha(ctx, f) -> str:
    r = ctx.estado.q("SELECT sha256 FROM hashes WHERE file_id=? AND md5=?", f["id"], f["md5"] or "")
    if r:
        return r[0]["sha256"]
    h = sha256_bytes(ctx.drive.baixar(f["id"]))
    ctx.estado.x("INSERT OR REPLACE INTO hashes VALUES(?,?,?)", f["id"], f["md5"] or "", h)
    return h


def detectar(ctx) -> list[dict]:
    est, cfg = ctx.estado, ctx.cfg
    arqs = [dict(r) for r in est.q("SELECT * FROM arquivos WHERE situacao='ok'")]
    por_md5, sem_md5 = defaultdict(list), defaultdict(list)
    for f in arqs:
        (por_md5[f["md5"]] if f["md5"] else sem_md5[f["tamanho"]]).append(f)
    candidatos = [g for g in list(por_md5.values()) + list(sem_md5.values()) if len(g) > 1]
    faltam = sum(1 for g in candidatos for f in g if not est.q(
        "SELECT 1 FROM hashes WHERE file_id=? AND md5=?", f["id"], f["md5"] or ""))
    ctx.log(f"duplicados: {len(candidatos)} grupo(s) candidato(s) pelo checksum do Drive; "
            f"{faltam} arquivo(s) a baixar para confirmar por SHA-256")
    feitos = 0
    grupos = []
    for g in candidatos:
        por_sha = defaultdict(list)
        for f in g:
            if ctx.orcamento.esgotado():
                ctx.salvar()
                raise TimeoutError("tempo esgotado durante a verificação SHA-256; execute 'retomar'")
            ja = est.q("SELECT 1 FROM hashes WHERE file_id=? AND md5=?", f["id"], f["md5"] or "")
            por_sha[_sha(ctx, f)].append(f)
            if not ja:
                feitos += 1
                if feitos % 10 == 0:
                    ctx.log(f"  SHA-256: {feitos}/{faltam} arquivos conferidos")
                if feitos % 25 == 0:
                    ctx.salvar()          # o que já foi baixado não se perde se a execução cair
        for sha, membros in por_sha.items():
            if len(membros) > 1:
                ex, motivo = escolher_exemplar(membros, cfg["arquivos"]["pastas_de_copias"])
                dups = sorted([m for m in membros if m["id"] != ex["id"]],
                              key=lambda m: natural_key(m["caminho"] + "/" + m["nome"]))
                grupos.append({"sha256": sha, "exemplar": ex, "motivo": motivo, "duplicados": dups})
    grupos.sort(key=lambda g: natural_key(g["exemplar"]["caminho"] + "/" + g["exemplar"]["nome"]))
    est.x("DELETE FROM grupos_dup")
    est.x("DELETE FROM membros_dup")
    for g in grupos:
        est.x("INSERT INTO grupos_dup VALUES(?,?,?)", g["sha256"], g["exemplar"]["id"], g["motivo"])
        est.x("INSERT INTO membros_dup VALUES(?,?,?)", g["exemplar"]["id"], g["sha256"], "exemplar")
        for d in g["duplicados"]:
            est.x("INSERT INTO membros_dup VALUES(?,?,?)", d["id"], g["sha256"], "duplicado")
    ctx.salvar()
    return grupos


def mover_duplicados(ctx, grupos) -> dict:
    """Move (nunca exclui, nunca envia à lixeira) cada duplicado para a pasta de revisão, em subpasta por
    conteúdo. Registra a origem para restauração. Sem permissão -> pendência e segue."""
    est, drive = ctx.estado, ctx.drive
    destino_raiz = ctx.ids["duplicados"]
    res = {"movidos": 0, "ja_feitos": 0, "erros": 0, "interrompido": False}
    pastas_grupo: dict[str, str] = {}
    for g in grupos:
        for d in g["duplicados"]:
            if ctx.orcamento.esgotado():
                res["interrompido"] = True
                ctx.salvar()
                return res
            nome_g = f"conteudo-{g['sha256'][:12]}"
            try:
                if nome_g not in pastas_grupo:
                    pastas_grupo[nome_g] = achar_ou_criar_pasta(drive, nome_g, destino_raiz)
                destino = pastas_grupo[nome_g]
                if est.q("SELECT 1 FROM movimentos WHERE file_id=? AND tipo='duplicado' AND para_pasta=? "
                         "AND status='done'", d["id"], destino):
                    res["ja_feitos"] += 1
                    continue
                atual = drive.metadados(d["id"])           # idempotência: confere onde o arquivo está agora
                if destino not in atual["parents"]:
                    drive.mover(d["id"], destino, atual["parents"] or [d["pasta_id"]])
                est.x("INSERT OR REPLACE INTO movimentos VALUES(?,?,?,?,?,?,?,?,?)", d["id"], "duplicado",
                      d["pasta_id"], destino, f"{d['caminho']}/{d['nome']}", f"{nome_g}/{d['nome']}",
                      "done", None, agora())
                est.resolver_pendencia(d["id"], "mover")
                res["movidos"] += 1
            except Exception as e:                      # sem permissão etc.: registra e continua
                est.x("INSERT OR REPLACE INTO movimentos VALUES(?,?,?,?,?,?,?,?,?)", d["id"], "duplicado",
                      d["pasta_id"], pastas_grupo.get(nome_g, ""), f"{d['caminho']}/{d['nome']}", "", "erro",
                      str(e)[:300], agora())
                est.pendencia(d["id"], "mover", str(e)[:300])
                res["erros"] += 1
            if (res["movidos"] + res["erros"]) % 25 == 0:
                ctx.salvar()
    ctx.salvar()
    return res


def restaurar(ctx, tipo="duplicado") -> dict:
    """Devolve ao local original os arquivos movidos (histórico na tabela 'movimentos')."""
    res = {"restaurados": 0, "erros": 0}
    for m in ctx.estado.q("SELECT * FROM movimentos WHERE tipo=? AND status='done'", tipo):
        try:
            atual = ctx.drive.metadados(m["file_id"])
            ctx.drive.mover(m["file_id"], m["de_pasta"], atual["parents"])
            ctx.estado.x("UPDATE movimentos SET status='restaurado', em=? WHERE file_id=? AND tipo=? AND para_pasta=?",
                         agora(), m["file_id"], tipo, m["para_pasta"])
            res["restaurados"] += 1
        except Exception as e:
            ctx.estado.pendencia(m["file_id"], "restaurar", str(e)[:300])
            res["erros"] += 1
    ctx.salvar()
    return res
