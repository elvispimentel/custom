import json
import os
from datetime import datetime
from pathlib import Path


def load_json(path: Path, default):
    path = Path(path)
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def posts_path(data_dir: Path, now: datetime) -> Path:
    return Path(data_dir) / "data" / "posts" / f"{now:%Y-%m}.json"


_METRICAS = ("views", "curtidas", "comentarios", "coletado_em")


def merge_posts(existing: list[dict], new: list[dict]) -> list[dict]:
    by_id = {p["id"]: p for p in existing}
    for p in new:
        antigo = by_id.get(p["id"])
        if antigo is None:
            by_id[p["id"]] = dict(p)
        else:
            by_id[p["id"]] = {
                **antigo,
                **p,
                "anterior": {k: antigo.get(k) for k in _METRICAS},
            }
    return list(by_id.values())
