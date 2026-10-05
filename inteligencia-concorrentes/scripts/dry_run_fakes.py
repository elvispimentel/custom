"""Coletores e analisador falsos para --dry-run: sem rede e sem chaves."""
from datetime import datetime, timedelta

from run_weekly import Collectors


def sample_concorrentes() -> list[dict]:
    return [
        {"id": "yt-demo", "nome": "Canal Demo YouTube", "plataforma": "youtube", "channel_id": "UC_demo",
         "handle": "@demo", "pais": "BR", "idioma": "pt", "seguidores": 100000, "territorio": "A",
         "status": "aprovado", "motivo": "exemplo de dry-run", "descoberto_em": "2026-10-05"},
        {"id": "ig-demo", "nome": "Perfil Demo Instagram", "plataforma": "instagram", "handle": "demo",
         "pais": "US", "idioma": "en", "seguidores": 50000, "territorio": "A",
         "status": "aprovado", "motivo": "exemplo de dry-run", "descoberto_em": "2026-10-05"},
    ]


def _posts(c: dict, now: datetime, prefixo: str, plat: str) -> list[dict]:
    posts = []
    for i in range(4):
        posts.append({
            "id": f"{prefixo}:{c['id']}-{i}", "concorrente_id": c["id"], "plataforma": plat,
            "url": f"https://exemplo.invalid/{c['id']}/{i}", "formato": "short" if plat == "youtube" else "reel",
            "publicado_em": (now - timedelta(days=5 + i)).isoformat(),
            "titulo_ou_legenda": f"Exemplo {i} de {c['nome']}",
            "views": 1_200_000 - i * 300_000 if plat == "youtube" else None,
            "curtidas": 60_000 - i * 10_000, "comentarios": 800 - i * 100, "coletado_em": now.isoformat(),
        })
    return posts


def collectors(now: datetime) -> Collectors:
    return Collectors(
        youtube=lambda c: (_posts(c, now, "yt", "youtube"), 100000),
        instagram=lambda c: (_posts(c, now, "ig", "instagram"), 50000),
    )


def analyzer(post: dict) -> dict:
    return {"post_id": post["id"], "gancho": "pergunta provocativa", "tema": "autossabotagem",
            "promessa": "entender o próprio padrão", "por_que_funcionou": "identificação imediata (dry-run)",
            "adaptacao_galifrael": "Descubra quem você está repetindo (exemplo de dry-run)"}
