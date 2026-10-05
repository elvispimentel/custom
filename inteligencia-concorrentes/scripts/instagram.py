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


def collect_instagram(
    concorrente: dict,
    ig_user_id: str,
    token: str,
    fetch: Callable[[str, dict], dict] = http_get_graph,
    limit: int = 30,
) -> tuple[list[dict], int]:
    campos = (
        f"business_discovery.username({concorrente['handle']})"
        f"{{followers_count,media.limit({limit})"
        "{id,caption,media_type,permalink,timestamp,like_count,comments_count}}"
    )
    resp = fetch(f"{GRAPH}/{ig_user_id}", {"fields": campos, "access_token": token})
    if "error" in resp:
        if resp["error"].get("code") == CODIGO_TOKEN:
            raise TokenExpirado(resp["error"].get("message", ""))
        if resp["error"].get("code") == CODIGO_USUARIO_INVALIDO:
            raise SemAcesso(resp["error"].get("message", ""))
        raise GraphError(f"erro {resp['error'].get('code')}: {resp['error'].get('message', '')}")

    bd = resp["business_discovery"]
    agora = datetime.now(timezone.utc).isoformat()
    posts = []
    for m in bd.get("media", {}).get("data", []):
        posts.append(
            {
                "id": f"ig:{m['id']}",
                "concorrente_id": concorrente["id"],
                "plataforma": "instagram",
                "url": m["permalink"],
                "formato": FORMATOS.get(m["media_type"], "imagem"),
                "publicado_em": m["timestamp"],
                "titulo_ou_legenda": m.get("caption", ""),
                "views": None,
                "curtidas": m.get("like_count"),
                "comentarios": m.get("comments_count"),
                "coletado_em": agora,
            }
        )
    return posts, int(bd.get("followers_count", 0))
