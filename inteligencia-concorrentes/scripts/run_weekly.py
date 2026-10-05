import argparse
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from analyze import select_top
from config import load_config
from instagram import SemAcesso, TokenExpirado
from report import build_issue_body, build_report
from scoring import _parse, rank
from storage import load_json, merge_posts, posts_path, save_json

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config" / "territorios.json"


@dataclass
class Collectors:
    youtube: Callable[[dict], tuple[list[dict], int]]
    instagram: Optional[Callable[[dict], tuple[list[dict], int]]]


@dataclass
class RunResult:
    report_path: Path
    issue_body: str
    falhas: list[str]


def _salvar_posts(data_dir: Path, novos: list[dict]) -> None:
    por_mes: dict[Path, list[dict]] = {}
    for p in novos:
        por_mes.setdefault(posts_path(data_dir, _parse(p["publicado_em"])), []).append(p)
    for caminho, lote in por_mes.items():
        save_json(caminho, merge_posts(load_json(caminho, []), lote))


def _todos_os_posts(data_dir: Path) -> list[dict]:
    posts: list[dict] = []
    for arquivo in sorted((Path(data_dir) / "data" / "posts").glob("*.json")):
        posts.extend(load_json(arquivo, []))
    return posts


def run(
    config: dict,
    data_dir: Path,
    now: datetime,
    collectors: Collectors,
    analyzer: Callable[[dict], Optional[dict]],
) -> RunResult:
    data_dir = Path(data_dir)
    concorrentes = load_json(data_dir / "data" / "concorrentes.json", [])
    falhas: list[str] = []
    novos: list[dict] = []
    token_expirado = False
    ig_nao_configurado = False

    for c in concorrentes:
        if c.get("status") != "aprovado":
            continue
        if c["plataforma"] == "youtube":
            coletor = collectors.youtube
        else:
            if token_expirado:
                continue
            if collectors.instagram is None:
                if not ig_nao_configurado:
                    falhas.append("Instagram não configurado (META_ACCESS_TOKEN / IG_USER_ID)")
                    ig_nao_configurado = True
                continue
            coletor = collectors.instagram
        try:
            posts, seguidores = coletor(c)
        except SemAcesso:
            c["status"] = "sem_acesso"
            falhas.append(f"{c.get('nome', c['id'])} marcado como sem_acesso: manter ou descartar?")
            continue
        except TokenExpirado:
            token_expirado = True
            falhas.append("renovar token Meta (Instagram) — coleta do Instagram pulada")
            continue
        except Exception as e:  # uma fonte falha, as outras continuam
            falhas.append(f"{c['plataforma']} {c.get('nome', c['id'])}: {e}")
            continue
        c["seguidores"] = seguidores
        novos.extend(posts)

    _salvar_posts(data_dir, novos)
    save_json(data_dir / "data" / "concorrentes.json", concorrentes)

    ranked = rank(_todos_os_posts(data_dir), concorrentes, config, now)

    caminho_analises = data_dir / "data" / "analises.json"
    analises = load_json(caminho_analises, {})
    for p in select_top(ranked, set(analises), config):
        try:
            a = analyzer(p)
        except Exception as e:
            falhas.append(f"análise de {p['id']}: {e}")
            continue
        if a:
            analises[a["post_id"]] = a
        else:
            falhas.append(f"análise inválida de {p['id']} (tentaremos de novo na próxima execução)")
    save_json(caminho_analises, analises)

    no_ranking = {p["id"] for lista in ranked.values() for p in lista}
    relevantes = {k: v for k, v in analises.items() if k in no_ranking}
    md = build_report(ranked, concorrentes, relevantes, falhas, now)
    caminho = data_dir / "relatorios" / f"{now:%Y-%m-%d}.md"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(md, encoding="utf-8")
    issue = build_issue_body(md, falhas)
    (data_dir / "issue.md").write_text(issue, encoding="utf-8")
    return RunResult(report_path=caminho, issue_body=issue, falhas=falhas)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(DEFAULT_CONFIG))
    ap.add_argument("--data-dir", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    config = load_config(Path(args.config))
    data_dir = Path(args.data_dir)
    now = datetime.now(timezone.utc)

    if args.dry_run:
        from dry_run_fakes import analyzer, collectors, sample_concorrentes

        arq = data_dir / "data" / "concorrentes.json"
        if not load_json(arq, []):
            save_json(arq, sample_concorrentes())
        run(config, data_dir, now, collectors(now), analyzer)
        return 0

    yt_key = os.environ.get("YOUTUBE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not yt_key or not openai_key:
        print("Faltam YOUTUBE_API_KEY e/ou OPENAI_API_KEY.", file=sys.stderr)
        return 2
    import openai

    from analyze import analyze_post
    from instagram import collect_instagram
    from llm import OpenAILLM
    from youtube import collect_youtube

    llm = OpenAILLM(openai.OpenAI(api_key=openai_key))
    meta, ig_id = os.environ.get("META_ACCESS_TOKEN"), os.environ.get("IG_USER_ID")
    ig = (lambda c: collect_instagram(c, ig_id, meta, limit=config["max_posts_por_concorrente"])) if meta and ig_id else None
    cols = Collectors(
        youtube=lambda c: collect_youtube(c, yt_key, max_videos=config["max_posts_por_concorrente"]),
        instagram=ig,
    )
    run(config, data_dir, now, cols, lambda p: analyze_post(p, llm, config["modelo_analise"]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
