import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from config import load_config
from storage import load_json, save_json
from youtube import API, YouTubeAPIError, http_get_json

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config" / "territorios.json"


def _chave(c: dict):
    return (c["plataforma"], c.get("channel_id") or c.get("handle"))


def merge_candidates(existing: list[dict], found: list[dict]) -> list[dict]:
    vistos = {_chave(c) for c in existing}
    novos = []
    for c in found:
        if _chave(c) not in vistos:
            vistos.add(_chave(c))
            novos.append(c)
    return [*existing, *novos]


def youtube_candidates(
    config: dict, api_key: str, fetch: Callable[[str, dict], dict] = http_get_json
) -> list[dict]:
    achados: dict[str, dict] = {}
    for termo in config["palavras_chave"][: config["max_buscas_youtube"]]:
        resp = fetch(
            f"{API}/search",
            {"part": "snippet", "q": termo, "type": "channel", "maxResults": 5, "key": api_key},
        )
        for item in resp.get("items", []):
            cid = item["id"]["channelId"]
            achados.setdefault(cid, {"nome": item["snippet"]["channelTitle"], "termo": termo})
    if not achados:
        return []

    stats = fetch(
        f"{API}/channels",
        {"part": "statistics,snippet", "id": ",".join(achados), "key": api_key},
    ).get("items", [])
    detalhes = {s["id"]: s for s in stats}
    hoje = datetime.now(timezone.utc).date().isoformat()
    return [
        {
            "id": f"yt-{cid}",
            "nome": info["nome"],
            "plataforma": "youtube",
            "channel_id": cid,
            "pais": detalhes.get(cid, {}).get("snippet", {}).get("country", ""),
            "idioma": "",
            "seguidores": int(detalhes.get(cid, {}).get("statistics", {}).get("subscriberCount", 0)),
            "territorio": config["territorio"],
            "status": "candidato",
            "motivo": f"palavra-chave: {info['termo']}",
            "descoberto_em": hoje,
        }
        for cid, info in achados.items()
    ]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(DEFAULT_CONFIG))
    ap.add_argument("--data-dir", required=True)
    args = ap.parse_args(argv)
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        print("Falta YOUTUBE_API_KEY.", file=sys.stderr)
        return 2
    config = load_config(Path(args.config))
    arq = Path(args.data_dir) / "data" / "concorrentes.json"
    try:
        achados = youtube_candidates(config, key)
    except YouTubeAPIError as e:
        print(f"Erro da API do YouTube: {e}", file=sys.stderr)
        return 1
    merged = merge_candidates(load_json(arq, []), achados)
    save_json(arq, merged)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
