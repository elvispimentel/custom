import json
from pathlib import Path

REQUIRED = (
    "territorio",
    "palavras_chave",
    "limiares",
    "janela_dias",
    "idade_minima_horas",
    "analise_por_plataforma",
    "modelo_analise",
    "max_buscas_youtube",
    "min_seguidores_candidato",
    "max_posts_por_concorrente",
)


def load_config(path: Path) -> dict:
    cfg = json.loads(Path(path).read_text(encoding="utf-8"))
    missing = [k for k in REQUIRED if k not in cfg]
    if missing:
        raise ValueError(f"config sem chaves obrigatórias: {', '.join(missing)}")
    return cfg
