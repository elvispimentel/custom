"""Fase 0: confere quais campos de perfil a Business Discovery entrega de verdade.

Uso: META_ACCESS_TOKEN=... IG_USER_ID=... python scripts/verificar_campos.py --handle <perfil>
"""
import argparse
import os
import sys
from typing import Callable

from instagram import collect_perfil_publico, http_get_graph


def verificar(
    handle: str, ig_user_id: str, token: str, fetch: Callable[[str, dict], dict] = http_get_graph
) -> dict[str, bool]:
    perfil = collect_perfil_publico(handle, ig_user_id, token, fetch=fetch)
    return {
        "bio": bool(perfil["bio"]),
        "nome": bool(perfil["nome"]),
        "website": bool(perfil["website"]),
        "view_count": any(p["views"] is not None for p in perfil["posts"]),
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--handle", required=True)
    args = ap.parse_args(argv)
    token, ig_id = os.environ.get("META_ACCESS_TOKEN"), os.environ.get("IG_USER_ID")
    if not token or not ig_id:
        print("Faltam META_ACCESS_TOKEN e/ou IG_USER_ID.", file=sys.stderr)
        return 2
    for campo, ok in verificar(args.handle, ig_id, token).items():
        print(f"{campo}: {'OK' if ok else 'AUSENTE'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
