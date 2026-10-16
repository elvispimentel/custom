"""Fase 0: confere quais campos de perfil a Business Discovery entrega de verdade.

Uso: META_ACCESS_TOKEN=... IG_USER_ID=... python scripts/verificar_campos.py --handle <perfil>
"""
import argparse
import os
import sys
from typing import Callable

from instagram import CAMPOS_MIDIA_BASE, GraphError, _business_discovery, http_get_graph

# campo -> (campo extra de perfil, campos de mídia, onde procurar a resposta)
SONDAS = {
    "bio": ("biography,", "{" + CAMPOS_MIDIA_BASE + "}", "biography"),
    "nome": ("name,", "{" + CAMPOS_MIDIA_BASE + "}", "name"),
    "website": ("website,", "{" + CAMPOS_MIDIA_BASE + "}", "website"),
    "view_count": ("", "{" + CAMPOS_MIDIA_BASE + ",view_count}", None),
}


def verificar(
    handle: str, ig_user_id: str, token: str, fetch: Callable[[str, dict], dict] = http_get_graph
) -> dict[str, bool]:
    """Uma requisição por campo: a Graph API recusa a requisição inteira se um campo não existir."""
    resultado = {}
    for nome, (extra, midia, chave) in SONDAS.items():
        try:
            bd = _business_discovery(handle, extra, ig_user_id, token, fetch, 5, midia)
        except GraphError:
            resultado[nome] = False
            continue
        if chave:
            resultado[nome] = bool(bd.get(chave))
        else:
            resultado[nome] = any(m.get("view_count") is not None for m in bd.get("media", {}).get("data", []))
    return resultado


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
