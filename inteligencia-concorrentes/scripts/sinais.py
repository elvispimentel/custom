"""Camada A: sinais públicos que as plataformas declaram, calculados sem LLM."""
from collections import Counter
from datetime import datetime, timedelta
from statistics import median

from scoring import _parse

MARCAS_REPOST = ("repost", "via @", "créditos", "credito", "cc:", "📸 @", "regram")
ALERTA_ORIGINALIDADE = "inelegível para recomendação a não seguidores (regra IG abr/2026)"
REFERENCIA_ENGAJAMENTO = "referência 0,52–0,55%"


def _pct(fracao: float) -> str:
    return f"{fracao * 100:.2f}".replace(".", ",") + "%"


def _encontradas(texto: str, palavras: list[str]) -> list[str]:
    texto = texto.lower()
    return [p for p in palavras if p.lower() in texto]


def metricas_publicas(perfil: dict, palavras_chave: list[str], now: datetime) -> dict:
    posts = perfil.get("posts", [])
    seguidores = perfil.get("seguidores") or 0
    engajamento = None
    if seguidores > 0 and posts:
        engajamento = median(((p.get("curtidas") or 0) + (p.get("comentarios") or 0)) / seguidores for p in posts)

    formatos = Counter(p.get("formato", "imagem") for p in posts)
    mix = {f: n / len(posts) for f, n in formatos.items()} if posts else {}

    recentes = [p for p in posts if _parse(p["publicado_em"]) >= now - timedelta(days=30)]
    taxa_repost = None
    if recentes:
        reposts = sum(1 for p in recentes if _encontradas(p.get("titulo_ou_legenda", ""), list(MARCAS_REPOST)))
        taxa_repost = reposts / len(recentes)

    legendas = " ".join(p.get("titulo_ou_legenda", "") for p in posts)
    alertas = [ALERTA_ORIGINALIDADE] if taxa_repost is not None and taxa_repost > 0.5 else []
    return {
        "engajamento_por_seguidor": engajamento,
        "mix_formatos": mix,
        "palavras_no_nome": _encontradas(perfil.get("nome", ""), palavras_chave),
        "palavras_na_bio": _encontradas(perfil.get("bio", ""), palavras_chave),
        "palavras_nas_legendas": _encontradas(legendas, palavras_chave),
        "taxa_repost_30d": taxa_repost,
        "alertas": alertas,
    }


def _nota(cid: str, nota, evidencia: str) -> dict:
    return {"id": cid, "camada": "A", "nota": nota, "evidencia": evidencia}


def notas_camada_a(m: dict) -> list[dict]:
    notas = []

    eng = m["engajamento_por_seguidor"]
    if eng is None:
        notas.append(_nota("engajamento", None, "sem seguidores ou sem posts"))
    else:
        n = 0 if eng < 0.0025 else 1 if eng < 0.005 else 2 if eng < 0.01 else 3
        ev = f"engajamento por seguidor {_pct(eng)} (curtidas+comentários)/seguidores; {REFERENCIA_ENGAJAMENTO}"
        notas.append(_nota("engajamento", n, ev))

    nome, bio, legendas = m["palavras_no_nome"], m["palavras_na_bio"], m["palavras_nas_legendas"]
    n = 3 if nome and bio else 2 if bio else 1 if legendas else 0
    ev = f"nome: {nome or '—'}; bio: {bio or '—'}; legendas: {legendas or '—'}"
    notas.append(_nota("palavra_chave", n, ev))

    taxa = m["taxa_repost_30d"]
    if taxa is None:
        notas.append(_nota("originalidade", None, "sem posts nos últimos 30 dias"))
    else:
        n = 0 if taxa > 0.5 else 2 if taxa > 0.2 else 3
        notas.append(_nota("originalidade", n, f"repost estimado em {_pct(taxa)} dos posts de 30 dias (marcas na legenda)"))

    mix = m["mix_formatos"]
    if not mix:
        notas.append(_nota("mix_formatos", None, "sem posts"))
    else:
        n = 3 if sum(1 for f in mix.values() if f >= 0.2) >= 2 else 1
        notas.append(_nota("mix_formatos", n, ", ".join(f"{k} {_pct(v)}" for k, v in sorted(mix.items()))))
    return notas
