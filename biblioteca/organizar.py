"""Fase 'temas e autores': <Biblioteca>/<Tema>/<Autor>/arquivo.
Primeiro gera um PLANO (simulação) para revisão; só move depois, com registro para restaurar."""
import csv
import io
import json
import re
import time
import unicodedata

import requests

from .controle import achar_ou_criar_pasta
from .util import agora, nome_seguro, natural_key

def _norm(t: str) -> str:
    return unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().casefold()


def _sem_ext(nome: str) -> str:
    return re.sub(r"\.[A-Za-z0-9]{2,5}$", "", nome)


PARTICULAS = {"de", "da", "do", "dos", "das", "di", "del", "van", "von", "la", "le", "bin"}
PALAVRAS_DE_TITULO = {"e", "o", "a", "os", "as", "um", "uma", "para", "com", "sem", "em", "no", "na", "que", "como", "of", "the", "and"}
SO_LETRAS = re.compile(r"^[^\W\d_]+(?:[.'’-][^\W\d_]+)*\.?,?$")


def _eh_nome(c: str) -> bool:
    """Parece nome de pessoa: 2 a 5 palavras só com letras, sem palavras típicas de título."""
    palavras = c.split()
    if not 2 <= len(palavras) <= 5 or len(c) > 60:
        return False
    return all(SO_LETRAS.match(w) for w in palavras) and not any(w.lower() in PALAVRAS_DE_TITULO for w in palavras)


def extrair_autor(nome: str) -> str | None:
    """Convenções do nome do arquivo: 'Título (Autor)', 'Autor - Título' (preferida) e 'Título - Autor'."""
    base = _sem_ext(nome)
    cand = []
    m = re.search(r"\(([^()]{3,60})\)\s*$", base)
    if m:
        cand.append(m.group(1))
    partes = re.split(r"\s+[-–—]\s+", base)
    if len(partes) >= 2:
        cand += [partes[0], partes[-1]]
    for c in cand:
        c = re.sub(r"\s+", " ", c.strip(" ._-"))
        if _eh_nome(c):
            return c
    return None


def eh_livro(nome: str, formatos) -> bool:
    ext = nome.rsplit(".", 1)[-1].lower() if "." in nome else ""
    return ext in {x.lower().lstrip(".") for x in formatos}


def classificar_regras(f, temas: dict[str, list[str]]):
    texto = _norm(f"{f['caminho']} {_sem_ext(f['nome'])}")
    pontos = {t: sum(texto.count(_norm(k)) for k in kws) for t, kws in temas.items()}
    ordenados = sorted(pontos.items(), key=lambda kv: -kv[1])
    if not ordenados or ordenados[0][1] == 0:
        tema, conf = None, 0.0
    elif len(ordenados) > 1 and ordenados[0][1] == ordenados[1][1]:
        tema, conf = ordenados[0][0], 0.5          # empate: baixa confiança, vai para revisão
    else:
        tema, conf = ordenados[0][0], 0.9 if ordenados[0][1] >= 2 else 0.75
    return tema, extrair_autor(f["nome"]), conf


def _prompt(temas, bloco):
    itens = [{"id": f["id"], "arquivo": f["nome"], "pasta_atual": f["caminho"]} for f in bloco]
    return ("Classifique cada livro/arquivo da lista abaixo. Escolha 'tema' EXATAMENTE entre: "
            + json.dumps(temas, ensure_ascii=False) + " ou null se não houver encaixe claro. "
            "'autor' é o autor do livro se o nome do arquivo permitir identificar com segurança "
            "(ignore prefixos numéricos de download, hífens no lugar de espaços e sufixos como z-lib, pdf, free); "
            "senão null; não invente. 'confianca' vai de 0 a 1. Responda SOMENTE um array JSON de objetos "
            "{id, tema, autor, confianca}.\n" + json.dumps(itens, ensure_ascii=False))


def _ler_resposta(ctx, texto, temas, out):
    try:
        dado = json.loads(texto[texto.index("["): texto.rindex("]") + 1])
        for o in dado:
            tema = o.get("tema") if o.get("tema") in temas else None
            out[o["id"]] = (tema, o.get("autor") or None, float(o.get("confianca") or 0) if tema else 0.0)
    except (ValueError, KeyError, TypeError, AttributeError):
        ctx.log("AVISO: resposta do classificador ilegível para um bloco; esses arquivos ficam sem classificação")


def _chamar_claude(cfg, prompt):
    r = requests.post("https://api.anthropic.com/v1/messages", timeout=120, headers={
        "x-api-key": cfg.anthropic_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        json={"model": cfg["organizacao"]["modelo_claude"], "max_tokens": 4000,
              "messages": [{"role": "user", "content": prompt}]})
    r.raise_for_status()
    return r.json()["content"][0]["text"]


def _com_retry(fn, tentativas=4):
    """Repete em 429/5xx/queda de rede com espera crescente; erro definitivo (401, 400…) sobe na hora."""
    for i in range(tentativas):
        try:
            return fn()
        except requests.HTTPError as e:
            cod = e.response.status_code if e.response is not None else 0
            if cod not in (429, 500, 502, 503, 504) or i == tentativas - 1:
                raise
        except (requests.ConnectionError, requests.Timeout):
            if i == tentativas - 1:
                raise
        time.sleep(5 * 2 ** i)


def _chamar_openai(cfg, prompt):
    r = requests.post("https://api.openai.com/v1/chat/completions", timeout=120, headers={
        "Authorization": f"Bearer {cfg.openai_key}", "content-type": "application/json"},
        json={"model": cfg["organizacao"].get("modelo_openai", "gpt-4o-mini"), "temperature": 0,
              "messages": [{"role": "user", "content": prompt}]})
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def classificar_ia(ctx, arquivos, ao_bloco=None):
    """Classificador opcional (claude ou openai): tema fechado (lista do config) + autor, 40 nomes por chamada."""
    cfg = ctx.cfg
    temas = list(cfg["organizacao"]["temas"])
    chamar = _chamar_openai if cfg["organizacao"]["classificador"] == "openai" else _chamar_claude
    out = {}
    for i in range(0, len(arquivos), 40):
        bloco = arquivos[i:i + 40]
        antes = set(out)
        _ler_resposta(ctx, _com_retry(lambda: chamar(cfg, _prompt(temas, bloco))), temas, out)
        ctx.log(f"classificador: {min(i + 40, len(arquivos))}/{len(arquivos)}")
        if ao_bloco:
            ao_bloco(bloco, {k: out[k] for k in out if k not in antes})
    return out


def carregar_manual(ctx) -> dict:
    """classificacao_manual.csv na pasta de controle (colunas: id_drive,tema,autor). Vence qualquer regra."""
    if not ctx.controle:
        return {}
    try:
        item = ctx.controle._achar("classificacao_manual.csv")
        if not item:
            return {}
        linhas = csv.DictReader(io.StringIO(ctx.drive.baixar(item["id"]).decode("utf-8-sig")))
        return {l["id_drive"].strip(): (l["tema"].strip() or None, (l.get("autor") or "").strip() or None)
                for l in linhas if l.get("id_drive")}
    except Exception as e:
        ctx.log(f"AVISO: não consegui ler classificacao_manual.csv: {e}")
        return {}


def planejar_temas(ctx) -> list[dict]:
    est, cfg = ctx.estado, ctx.cfg
    org = cfg["organizacao"]
    dups = {r["file_id"] for r in est.q("SELECT file_id FROM membros_dup WHERE papel='duplicado'")}
    arqs = [dict(r) for r in est.q("SELECT * FROM arquivos WHERE situacao IN ('ok','instavel','vazio')")
            if r["id"] not in dups]
    arqs.sort(key=lambda f: natural_key(f["caminho"] + "/" + f["nome"]))
    manual = carregar_manual(ctx)
    cache = {r["file_id"]: r for r in est.q("SELECT * FROM classif")}
    usa_ia = org["classificador"] in ("claude", "openai")
    formatos = org.get("formatos_livro") or ["pdf", "epub", "mobi", "azw3", "doc", "docx", "txt", "rtf", "odt"]
    # cache só vale para o classificador pago; regras são baratas e mudam com o config
    novos = [f for f in arqs if f["id"] not in manual and eh_livro(f["nome"], formatos) and
             not (usa_ia and f["id"] in cache and cache[f["id"]]["md5"] == (f["md5"] or "")
                  and cache[f["id"]]["fonte"] == org["classificador"])]
    ia = {}
    if org["classificador"] == "claude" and not cfg.anthropic_key:
        raise RuntimeError("classificador 'claude' exige o Secret ANTHROPIC_API_KEY")
    if org["classificador"] == "openai" and not cfg.openai_key:
        raise RuntimeError("classificador 'openai' exige o Secret OPENAI_API_KEY")
    if usa_ia:
        contagem = {"blocos": 0}

        def guardar(bloco, resp):          # grava local a cada lote e sobe ao Drive a cada 10 (e não derruba a execução)
            for f in bloco:
                t, a, c = resp.get(f["id"], (None, None, 0.0))
                est.x("INSERT OR REPLACE INTO classif VALUES(?,?,?,?,?,?)", f["id"], f["md5"] or "", t, a,
                      org["classificador"], c)
            contagem["blocos"] += 1
            if contagem["blocos"] % 10 == 0:
                try:
                    ctx.salvar()
                except Exception as e:
                    ctx.log(f"AVISO: não consegui subir o estado ao Drive agora ({type(e).__name__}); sigo e tento no fim")
        ia = classificar_ia(ctx, novos, guardar)
    for f in novos:
        if usa_ia:
            tema, autor, conf = ia.get(f["id"], (None, None, 0.0))
            fonte = org["classificador"]
        else:
            tema, autor, conf = classificar_regras(f, org["temas"])
            fonte = "regras"
        est.x("INSERT OR REPLACE INTO classif VALUES(?,?,?,?,?,?)", f["id"], f["md5"] or "", tema, autor, fonte, conf)
    canon: dict[str, str] = {}      # variações de grafia do mesmo autor viram uma só pasta
    plano = []
    for f in arqs:
        if f["id"] in manual:
            tema, autor, fonte, conf = manual[f["id"]][0], manual[f["id"]][1], "manual", 1.0
        else:
            c = est.q("SELECT * FROM classif WHERE file_id=?", f["id"])
            c = c[0] if c else {"tema": None, "autor": None, "fonte": "formato", "confianca": 0.0}
            tema, autor, fonte, conf = c["tema"], c["autor"], c["fonte"], c["confianca"]
        if autor:
            autor = canon.setdefault(_norm(autor), nome_seguro(autor))
        if f["id"] not in manual and not eh_livro(f["nome"], formatos):
            acao, destino, tema, autor, fonte, conf = "fora_do_escopo_nao_livro", "", None, None, "formato", 0.0
        elif f["situacao"] != "ok":
            acao, destino = "aguardar_upload_terminar", ""
        elif not tema or conf < org["confianca_minima"]:
            if org["mover_nao_classificados"]:
                acao, destino = "mover", nome_seguro(org["pasta_nao_classificados"])
            else:
                acao, destino = "manter_nao_classificado", ""
        else:
            destino = f"{nome_seguro(tema)}/{autor or nome_seguro(org['pasta_sem_autor'])}"
            acao = "ja_organizado" if f["caminho"] == destino else "mover"
        plano.append({"id": f["id"], "nome": f["nome"], "pasta_id": f["pasta_id"], "caminho_atual": f["caminho"],
                      "tema": tema, "autor": autor, "fonte": fonte, "confianca": conf, "destino": destino, "acao": acao})
    ctx.salvar()
    return plano


def plano_csv(plano) -> str:
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["id_drive", "arquivo", "caminho_atual", "tema", "autor", "fonte", "confianca", "destino", "acao"])
    for p in plano:
        w.writerow([p["id"], p["nome"], p["caminho_atual"], p["tema"] or "", p["autor"] or "", p["fonte"],
                    f"{p['confianca']:.2f}", p["destino"], p["acao"]])
    return out.getvalue()


def aplicar_temas(ctx, plano) -> dict:
    est, drive, raiz = ctx.estado, ctx.drive, ctx.ids["biblioteca"]
    res = {"movidos": 0, "ja_feitos": 0, "erros": 0, "interrompido": False}
    cache_pastas: dict[str, str] = {}

    def pasta(caminho):
        atual = raiz
        acum = ""
        for seg in caminho.split("/"):
            acum = f"{acum}/{seg}".lstrip("/")
            if acum not in cache_pastas:
                cache_pastas[acum] = achar_ou_criar_pasta(drive, seg, atual)
            atual = cache_pastas[acum]
        return atual

    for p in plano:
        if p["acao"] != "mover":
            continue
        if ctx.orcamento.esgotado():
            res["interrompido"] = True
            break
        try:
            destino_id = pasta(p["destino"])
            if est.q("SELECT 1 FROM movimentos WHERE file_id=? AND tipo='tema' AND para_pasta=? AND status='done'",
                     p["id"], destino_id):
                res["ja_feitos"] += 1
                continue
            atual = drive.metadados(p["id"])
            if destino_id not in atual["parents"]:
                drive.mover(p["id"], destino_id, atual["parents"] or [p["pasta_id"]])
            est.x("INSERT OR REPLACE INTO movimentos VALUES(?,?,?,?,?,?,?,?,?)", p["id"], "tema", p["pasta_id"],
                  destino_id, f"{p['caminho_atual']}/{p['nome']}", f"{p['destino']}/{p['nome']}", "done", None, agora())
            est.resolver_pendencia(p["id"], "mover_tema")
            res["movidos"] += 1
        except Exception as e:
            est.pendencia(p["id"], "mover_tema", str(e)[:300])
            res["erros"] += 1
        if (res["movidos"] + res["erros"]) % 25 == 0:
            ctx.salvar()
    ctx.salvar()
    return res
