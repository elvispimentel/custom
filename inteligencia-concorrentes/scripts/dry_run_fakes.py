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


def cliente_exemplo() -> dict:
    return {"id": "exemplo", "handle": "exemplo", "cartao": "config/clientes/exemplo/cartao.json", "proprio": False}


def perfil_falso(handle: str) -> dict:
    agora = datetime.now().astimezone()
    posts = [
        {"id": f"ig:{handle}-{i}", "concorrente_id": handle, "plataforma": "instagram",
         "url": f"https://exemplo.invalid/{handle}/{i}", "formato": ("reel", "carrossel")[i % 2],
         "publicado_em": (agora - timedelta(days=3 + i)).isoformat(),
         "titulo_ou_legenda": f"Atendi {10 + i} terapeutas este mês e conto como (dry-run)",
         "views": None, "curtidas": 400 - i * 50, "comentarios": 30 - i, "coletado_em": agora.isoformat()}
        for i in range(4)
    ]
    return {"handle": handle, "nome": f"Perfil {handle}", "bio": "Ajudo terapeutas a lotar a agenda sem pressão",
            "website": "", "seguidores": 20000, "posts": posts}


def avaliador_b_falso(perfil: dict, cartao: dict) -> list[dict]:
    from rubrica import CRITERIOS_B

    return [{"id": cid, "camada": "B", "nota": 2, "evidencia": perfil["bio"]} for cid, _, _ in CRITERIOS_B]
