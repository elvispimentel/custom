"""Coleta autenticada do perfil do próprio cliente (token dele), com insights por post.

ATENÇÃO: os nomes das métricas de insights seguem a Graph API pós-abril/2025
(sem `impressions`/`plays`) segundo a pesquisa, mas NÃO foram confirmados
contra a API real. Confirmar na Fase 0.
"""
from datetime import datetime, timezone
from statistics import median
from typing import Callable

from instagram import CAMPOS_MIDIA, GRAPH, GraphError, SemAcesso, _mapear_post, checar_erro, http_get_graph

# NÃO VERIFICADO — confirmar na Fase 0
METRICAS_MIDIA = ("reach", "likes", "comments", "saved", "shares", "views")


def _insights(media_id: str, token: str, fetch) -> dict[str, int]:
    resp = fetch(f"{GRAPH}/{media_id}/insights", {"metric": ",".join(METRICAS_MIDIA), "access_token": token})
    try:
        checar_erro(resp)
    except (GraphError, SemAcesso):
        return {}
    valores = {}
    for item in resp.get("data", []):
        lista = item.get("values") or [{}]
        if isinstance(lista[0].get("value"), int):
            valores[item["name"]] = lista[0]["value"]
    return valores


def collect_perfil_autenticado(
    ig_user_id: str,
    token: str,
    fetch: Callable[[str, dict], dict] = http_get_graph,
    limit: int = 24,
) -> dict:
    campos = f"username,name,biography,website,followers_count,media.limit({limit}){CAMPOS_MIDIA}"
    resp = fetch(f"{GRAPH}/{ig_user_id}", {"fields": campos, "access_token": token})
    checar_erro(resp)
    handle = resp.get("username") or ig_user_id
    agora = datetime.now(timezone.utc).isoformat()
    posts = []
    for m in resp.get("media", {}).get("data", []):
        post = _mapear_post(m, handle, agora)
        post["insights"] = _insights(m["id"], token, fetch)
        posts.append(post)
    return {
        "handle": handle,
        "nome": resp.get("name") or "",
        "bio": resp.get("biography") or "",
        "website": resp.get("website") or "",
        "seguidores": int(resp.get("followers_count", 0)),
        "posts": posts,
    }


def _mediana_por_alcance(posts: list[dict], metrica: str):
    taxas = [
        p["insights"].get(metrica, 0) / p["insights"]["reach"]
        for p in posts
        if p.get("insights", {}).get("reach", 0) > 0
    ]
    return median(taxas) if taxas else None


def metricas_autenticadas(perfil: dict) -> dict:
    posts = perfil.get("posts", [])
    return {
        "sends_por_alcance": _mediana_por_alcance(posts, "shares"),
        "likes_por_alcance": _mediana_por_alcance(posts, "likes"),
        "saves_por_alcance": _mediana_por_alcance(posts, "saved"),
    }
