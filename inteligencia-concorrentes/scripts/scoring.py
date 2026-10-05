from bisect import bisect_left, bisect_right
from datetime import datetime, timedelta, timezone


def _parse(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_validated(post: dict, config: dict) -> bool:
    limiares = config["limiares"]
    if post["plataforma"] == "youtube":
        return (post.get("views") or 0) >= limiares["youtube_views_validado"]
    return (post.get("curtidas") or 0) >= limiares["instagram_curtidas_validado"]


def in_window(post: dict, now: datetime, config: dict) -> bool:
    idade = now - _parse(post["publicado_em"])
    return (
        timedelta(hours=config["idade_minima_horas"])
        <= idade
        <= timedelta(days=config["janela_dias"])
    )


METRICAS = {"youtube": ("views", "comentarios"), "instagram": ("curtidas", "comentarios")}


def _posicoes(valores: list[int]) -> list[float]:
    """Posição de cada valor entre todos, de 0 a 1 (empates dividem a posição)."""
    ordenados = sorted(valores)
    n = len(ordenados)
    out = []
    for v in valores:
        menores = bisect_left(ordenados, v)
        iguais = bisect_right(ordenados, v) - menores
        out.append((menores + 0.5 * iguais) / n)
    return out


def rank(posts: list[dict], concorrentes: list[dict], config: dict, now: datetime) -> dict[str, list[dict]]:
    """Ranking por plataforma: média das posições em visualizações (ou curtidas) e comentários.

    O tamanho do canal (inscritos) não entra na conta: vídeo muito visto vale
    pelo que foi visto, venha de um canal grande ou pequeno.
    """
    aprovados = {c["id"] for c in concorrentes if c.get("status") == "aprovado"}
    out: dict[str, list[dict]] = {}
    for plataforma, metricas in METRICAS.items():
        elegiveis = [
            p for p in posts
            if p["plataforma"] == plataforma and p["concorrente_id"] in aprovados and in_window(p, now, config)
        ]
        if not elegiveis:
            out[plataforma] = []
            continue
        por_metrica = [_posicoes([p.get(m) or 0 for p in elegiveis]) for m in metricas]
        ranqueados = [
            {**p, "score": sum(col[i] for col in por_metrica) / len(metricas), "validado": is_validated(p, config)}
            for i, p in enumerate(elegiveis)
        ]
        ranqueados.sort(key=lambda x: x["score"], reverse=True)
        out[plataforma] = ranqueados
    return out
