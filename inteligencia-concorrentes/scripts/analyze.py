import json

CAMPOS = ("gancho", "tema", "promessa", "por_que_funcionou", "adaptacao_galifrael")

ANALISE_PROMPT = """Você analisa conteúdos de alto engajamento de concorrentes do Instituto Galifrael, \
que investiga como seres humanos constroem, repetem e transformam a própria realidade.

Responda SOMENTE com um objeto JSON, sem texto antes ou depois, com estas chaves em português:
- "gancho": a técnica usada na primeira frase ou cena (ex.: pergunta provocativa, promessa, contraste)
- "tema": o tema central em poucas palavras
- "promessa": o que o público acredita que vai receber
- "por_que_funcionou": por que esse conteúdo engajou
- "adaptacao_galifrael": uma adaptação concreta ligada à tese "descubra quem você está repetindo — e experimente quem mais você consegue ser"

Conteúdo analisado:
Plataforma: {plataforma}
Formato: {formato}
Título ou legenda: {texto}
URL: {url}
"""


def select_top(ranked: dict[str, list[dict]], analisadas: set[str], config: dict) -> list[dict]:
    n = config["analise_por_plataforma"]
    top: list[dict] = []
    for lista in ranked.values():
        top.extend([p for p in lista if p["id"] not in analisadas][:n])
    return top


def analyze_post(post: dict, client, model: str) -> dict | None:
    prompt = ANALISE_PROMPT.format(
        plataforma=post["plataforma"],
        formato=post.get("formato", ""),
        texto=post.get("titulo_ou_legenda", ""),
        url=post.get("url", ""),
    )
    resp = client.messages.create(
        model=model, max_tokens=600, messages=[{"role": "user", "content": prompt}]
    )
    try:
        data = json.loads(resp.content[0].text)
    except (json.JSONDecodeError, IndexError, AttributeError):
        return None
    if not isinstance(data, dict) or any(k not in data for k in CAMPOS):
        return None
    return {"post_id": post["id"], **{k: data[k] for k in CAMPOS}}
