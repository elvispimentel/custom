from datetime import datetime, timedelta, timezone


def _parse(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def score_post(post: dict, seguidores: int) -> float:
    if not seguidores or seguidores <= 0:
        return 0.0
    curtidas = post.get("curtidas") or 0
    comentarios = post.get("comentarios") or 0
    return (curtidas + 2 * comentarios) / seguidores


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


def rank(posts: list[dict], concorrentes: list[dict], config: dict, now: datetime) -> dict[str, list[dict]]:
    aprovados = {c["id"]: c for c in concorrentes if c.get("status") == "aprovado"}
    out: dict[str, list[dict]] = {"youtube": [], "instagram": []}
    for p in posts:
        c = aprovados.get(p["concorrente_id"])
        if c is None or p["plataforma"] not in out or not in_window(p, now, config):
            continue
        out[p["plataforma"]].append(
            {**p, "score": score_post(p, c.get("seguidores") or 0), "validado": is_validated(p, config)}
        )
    for lista in out.values():
        lista.sort(key=lambda x: x["score"], reverse=True)
    return out
