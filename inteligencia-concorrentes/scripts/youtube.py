import json
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Callable

API = "https://www.googleapis.com/youtube/v3"
SHORT_MAX_SEGUNDOS = 180


class YouTubeAPIError(RuntimeError):
    """Erro da API do YouTube com o motivo informado pelo Google (sem a chave)."""


def http_get_json(url: str, params: dict) -> dict:
    full = f"{url}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(full, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode("utf-8")).get("error", {})
        except ValueError:
            err = {}
        motivos = ", ".join(x.get("reason", "") for x in err.get("errors", []) if isinstance(x, dict))
        raise YouTubeAPIError(f"HTTP {e.code}: {err.get('message', e.reason)} [{motivos}]") from None


def _segundos(duracao: str) -> int:
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duracao or "")
    if not m:
        return 0
    h, mi, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mi * 60 + s


def _int_or_none(v):
    return int(v) if v is not None else None


def collect_youtube(
    concorrente: dict,
    api_key: str,
    fetch: Callable[[str, dict], dict] = http_get_json,
    max_videos: int = 30,
) -> tuple[list[dict], int]:
    canal = fetch(
        f"{API}/channels",
        {"part": "contentDetails,statistics", "id": concorrente["channel_id"], "key": api_key},
    )["items"][0]
    seguidores = int(canal["statistics"].get("subscriberCount", 0))
    uploads = canal["contentDetails"]["relatedPlaylists"]["uploads"]

    itens = fetch(
        f"{API}/playlistItems",
        {"part": "contentDetails", "playlistId": uploads, "maxResults": max_videos, "key": api_key},
    )["items"]
    ids = [i["contentDetails"]["videoId"] for i in itens]
    if not ids:
        return [], seguidores

    videos = fetch(
        f"{API}/videos",
        {"part": "snippet,contentDetails,statistics", "id": ",".join(ids), "key": api_key},
    )["items"]
    agora = datetime.now(timezone.utc).isoformat()
    posts = []
    for v in videos:
        st = v.get("statistics", {})
        posts.append(
            {
                "id": f"yt:{v['id']}",
                "concorrente_id": concorrente["id"],
                "plataforma": "youtube",
                "url": f"https://www.youtube.com/watch?v={v['id']}",
                "formato": "short" if _segundos(v["contentDetails"]["duration"]) <= SHORT_MAX_SEGUNDOS else "video",
                "publicado_em": v["snippet"]["publishedAt"],
                "titulo_ou_legenda": v["snippet"]["title"],
                "views": _int_or_none(st.get("viewCount")),
                "curtidas": _int_or_none(st.get("likeCount")),
                "comentarios": _int_or_none(st.get("commentCount")),
                "coletado_em": agora,
            }
        )
    return posts, seguidores
