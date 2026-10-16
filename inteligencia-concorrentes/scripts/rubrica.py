"""Camada B (neuromarketing com evidência) dada pela LLM, e pontuação das camadas A e B.

Toda nota da camada B precisa citar um trecho literal do perfil; citação
que não existe no perfil anula a nota (proteção contra alucinação).
"""
import json
import re

from etica import linter_copy, redigir_inferencias

CRITERIOS_B = (
    ("concretude", 3, "promessa diz público, resultado, prazo ou mecanismo"),
    ("excitacao", 2, "ganchos usam emoção de alta excitação (admiração, indignação, ansiedade com resolução); "
                     "tristeza ou medo sem saída valem menos"),
    ("fluencia", 2, "frases curtas, sem jargão, uma chamada para ação por peça"),
    ("prova", 3, "casos, números ou depoimentos verificáveis"),
    ("parassocial", 2, "fala direta, bastidores, resposta a comentários, rosto"),
    ("encaixe_cartao", 3, "fala com o cliente_de_alma e o objetivo_negocio do cartão"),
)
PESOS_A = {"engajamento": 3, "originalidade": 3, "palavra_chave": 2, "mix_formatos": 1}
PESOS_B = {cid: peso for cid, peso, _ in CRITERIOS_B}
MAX_LEGENDAS = 12

RUBRICA_PROMPT = """Você audita um perfil de Instagram para saber se ele atrai o cliente de alma descrito no cartão abaixo.

Cartão do cliente de alma (definido e aprovado pelo dono do perfil):
{cartao}

Perfil:
Nome: {nome}
Bio: {bio}
Legendas mais recentes:
{legendas}

Dê uma nota inteira de 0 a 3 para cada critério:
{criterios}

Regras:
- "evidencia" deve ser cópia literal de um trecho da bio ou de uma legenda, sem parafrasear.
- Não faça nenhuma inferência sobre religião, saúde, sexualidade ou política do público.

Responda SOMENTE com um objeto JSON, sem texto antes ou depois:
{{"criterios": [{{"id": "<id>", "nota": 0, "evidencia": "<trecho literal>"}}]}}
"""


def _normalizar(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip().lower()


def _nota(cid: str, nota, evidencia: str) -> dict:
    return {"id": cid, "camada": "B", "nota": nota, "evidencia": evidencia}


def _todos_nulos(motivo: str) -> list[dict]:
    return [_nota(cid, None, motivo) for cid, _, _ in CRITERIOS_B]


def avaliar_camada_b(perfil: dict, cartao: dict, llm, model: str) -> list[dict]:
    legendas = [p.get("titulo_ou_legenda", "") for p in perfil.get("posts", [])]
    legendas = [t for t in legendas if t.strip()][:MAX_LEGENDAS]
    bio = perfil.get("bio", "")
    if not bio.strip() and not legendas:
        return _todos_nulos("sem texto")

    prompt = RUBRICA_PROMPT.format(
        cartao=json.dumps({k: v for k, v in cartao.items() if not k.startswith("_")}, ensure_ascii=False, indent=2),
        nome=perfil.get("nome", ""),
        bio=bio,
        legendas="\n".join(f"{i}. {t}" for i, t in enumerate(legendas, 1)),
        criterios="\n".join(f'- "{cid}": {desc}' for cid, _, desc in CRITERIOS_B),
    )
    try:
        texto = llm.complete(prompt, model, 1200)
    except Exception:  # cota, rede, chave inválida: camada A segue, camada B fica sem nota
        return _todos_nulos("LLM indisponível")
    try:
        data = json.loads(texto[texto.index("{") : texto.rindex("}") + 1])
        itens = {c["id"]: c for c in data["criterios"] if isinstance(c, dict) and "id" in c}
    except (ValueError, KeyError, TypeError):
        return _todos_nulos("resposta inválida da LLM")

    corpus = _normalizar(" ".join([bio, *legendas]))
    notas = []
    for cid, _, _ in CRITERIOS_B:
        item = itens.get(cid, {})
        nota, evidencia = item.get("nota"), item.get("evidencia")
        if type(nota) is not int or not 0 <= nota <= 3 or not isinstance(evidencia, str) or not evidencia.strip():
            notas.append(_nota(cid, None, "resposta inválida da LLM"))
        elif _normalizar(evidencia) not in corpus:
            notas.append(_nota(cid, None, "evidência não encontrada no perfil"))
        else:
            notas.append(_nota(cid, nota, redigir_inferencias(evidencia)[0]))
    return notas


def _camada(notas: list[dict], pesos: dict[str, int]):
    validas = [(pesos[n["id"]], n["nota"]) for n in notas if n["id"] in pesos and n["nota"] is not None]
    if not validas:
        return None
    return round(sum(p * v for p, v in validas) / sum(p * 3 for p, _ in validas) * 100, 1)


def pontuar(notas: list[dict], textos: list[str]) -> dict:
    camada_a = _camada([n for n in notas if n["camada"] == "A"], PESOS_A)
    camada_b = _camada([n for n in notas if n["camada"] == "B"], PESOS_B)
    alertas = linter_copy("\n".join(textos))
    penalidade = min(5 * len(alertas), 20)
    existentes = [c for c in (camada_a, camada_b) if c is not None]
    total = None
    if existentes:
        total = max(round(sum(existentes) / len(existentes) - penalidade, 1), 0)
    return {"camada_a": camada_a, "camada_b": camada_b, "total": total,
            "penalidade_etica": penalidade, "alertas_copy": alertas}
