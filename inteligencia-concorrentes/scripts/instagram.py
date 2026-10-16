"""Coletor Instagram via Business Discovery (Graph API da Meta).

ATENÇÃO: formato dos campos, versão da API e códigos de erro (190 = token,
110 = usuário inválido/não profissional) vieram de conhecimento prévio e NÃO
foram confirmados na documentação oficial. Confirmar na primeira chamada real.
"""
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Callable

GRAPH = "https://graph.facebook.com/v21.0"
CODIGO_TOKEN = 190
CODIGO_USUARIO_INVALIDO = 110
FORMATOS = {"VIDEO": "reel", "CAROUSEL_ALBUM": "carrossel", "IMAGE": "imagem"}


class SemAcesso(Exception):
    """Perfil inexistente, privado ou não profissional/criador."""


class GraphError(Exception):
    """Qualquer outro erro da Graph API (limite de taxa, permissão, instabilidade)."""


class TokenExpirado(Exception):
    """Token da Meta inválido ou expirado: renovar."""


def http_get_graph(url: str, params: dict) -> dict:
    full = f"{url}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(full, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode("utf-8"))


def checar_erro(resp: dict) -> None:
    if "error" not in resp:
        return
    codigo = resp["error"].get("code")
    mensagem = resp["error"].get("message", "")
    if codigo == CODIGO_TOKEN:
        raise TokenExpirado(mensagem)
    if codigo == CODIGO_USUARIO_INVALIDO:
        raise SemAcesso(mensagem)
    raise GraphError(f"erro {codigo}: {mensagem}")


# view_count: NÃO VERIFICADO — confirmar na Fase 0
CAMPOS_MIDIA = "{id,caption,media_type,permalink,timestamp,like_count,comments_count,view_count}"


def _mapear_post(m: dict, dono_id: str, agora: str) -> dict:
    return {
        "id": f"ig:{m['id']}",
        "concorrente_id": dono_id,
        "plataforma": "instagram",
        "url": m["permalink"],
        "formato": FORMATOS.get(m["media_type"], "imagem"),
        "publicado_em": m["timestamp"],
        "titulo_ou_legenda": m.get("caption", ""),
        "views": m.get("view_count"),
        "curtidas": m.get("like_count"),
        "comentarios": m.get("comments_count"),
        "coletado_em": agora,
    }


def _business_discovery(handle: str, extras: str, ig_user_id: str, token: str, fetch, limit: int) -> dict:
    campos = f"business_discovery.username({handle}){{{extras}followers_count,media.limit({limit}){CAMPOS_MIDIA}}}"
    resp = fetch(f"{GRAPH}/{ig_user_id}", {"fields": campos, "access_token": token})
    checar_erro(resp)
    return resp["business_discovery"]


def collect_instagram(
    concorrente: dict,
    ig_user_id: str,
    token: str,
    fetch: Callable[[str, dict], dict] = http_get_graph,
    limit: int = 30,
) -> tuple[list[dict], int]:
    bd = _business_discovery(concorrente["handle"], "", ig_user_id, token, fetch, limit)
    agora = datetime.now(timezone.utc).isoformat()
    posts = [_mapear_post(m, concorrente["id"], agora) for m in bd.get("media", {}).get("data", [])]
    return posts, int(bd.get("followers_count", 0))


def collect_perfil_publico(
    handle: str,
    ig_user_id: str,
    token: str,
    fetch: Callable[[str, dict], dict] = http_get_graph,
    limit: int = 30,
) -> dict:
    # biography, name, website: NÃO VERIFICADO — confirmar na Fase 0
    bd = _business_discovery(handle, "username,name,biography,website,", ig_user_id, token, fetch, limit)
    agora = datetime.now(timezone.utc).isoformat()
    return {
        "handle": handle,
        "nome": bd.get("name") or "",
        "bio": bd.get("biography") or "",
        "website": bd.get("website") or "",
        "seguidores": int(bd.get("followers_count", 0)),
        "posts": [_mapear_post(m, handle, agora) for m in bd.get("media", {}).get("data", [])],
    }
