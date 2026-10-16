import json

from rubrica import CRITERIOS_B, RUBRICA_PROMPT, avaliar_camada_b, pontuar

CARTAO = {"cliente_de_alma": "terapeuta com agenda vazia", "objetivo_negocio": "12 vagas na mentoria",
          "identidade": "i", "proposito": "p", "mecanismo_unico": "m", "limites_inegociaveis": ["x"]}
LEGENDA = "Atendi 40 clientes em 2025 e mostro o passo a passo."
PERFIL = {"handle": "ana", "nome": "Ana", "bio": "Ajudo terapeutas a lotar a agenda", "posts": [
    {"titulo_ou_legenda": LEGENDA, "publicado_em": "2026-10-10T10:00:00+0000"}]}
IDS = [c[0] for c in CRITERIOS_B]


class FakeLLM:
    def __init__(self, text):
        self.text, self.calls = text, []

    def complete(self, prompt, model, max_tokens):
        self.calls.append({"prompt": prompt, "model": model, "max_tokens": max_tokens})
        return self.text


def resposta(**trocas):
    itens = [{"id": i, "nota": 2, "evidencia": "Atendi 40 clientes em 2025"} for i in IDS]
    for i in itens:
        i.update(trocas.get(i["id"], {}))
    return json.dumps({"criterios": itens})


def notas_por_id(notas):
    return {n["id"]: n for n in notas}


def test_resposta_valida_gera_seis_notas():
    notas = avaliar_camada_b(PERFIL, CARTAO, FakeLLM(resposta()), "m")
    assert [n["id"] for n in notas] == IDS
    assert all(n["nota"] == 2 and n["camada"] == "B" for n in notas)


def test_evidencia_inventada_anula_so_aquele_criterio():
    notas = notas_por_id(avaliar_camada_b(PERFIL, CARTAO, FakeLLM(resposta(prova={"evidencia": "Curei 500 pessoas"})), "m"))
    assert notas["prova"]["nota"] is None
    assert notas["prova"]["evidencia"] == "evidência não encontrada no perfil"
    assert notas["concretude"]["nota"] == 2


def test_evidencia_compara_sem_caixa_e_espacos():
    r = resposta(concretude={"evidencia": "ajudo   TERAPEUTAS a lotar"})
    assert notas_por_id(avaliar_camada_b(PERFIL, CARTAO, FakeLLM(r), "m"))["concretude"]["nota"] == 2


def test_nota_fora_da_faixa_ou_ausente():
    texto = json.loads(resposta(fluencia={"nota": 5}, excitacao={"nota": "3"}))
    texto["criterios"] = [c for c in texto["criterios"] if c["id"] != "parassocial"]
    notas = notas_por_id(avaliar_camada_b(PERFIL, CARTAO, FakeLLM(json.dumps(texto)), "m"))
    for cid in ("fluencia", "excitacao", "parassocial"):
        assert notas[cid]["nota"] is None and notas[cid]["evidencia"] == "resposta inválida da LLM"


def test_json_ilegivel_anula_tudo():
    notas = avaliar_camada_b(PERFIL, CARTAO, FakeLLM("não sei"), "m")
    assert len(notas) == 6 and all(n["nota"] is None for n in notas)


def test_perfil_sem_texto_nao_chama_llm():
    llm = FakeLLM(resposta())
    notas = avaliar_camada_b({"handle": "x", "nome": "", "bio": "", "posts": []}, CARTAO, llm, "m")
    assert llm.calls == [] and all(n["nota"] is None and n["evidencia"] == "sem texto" for n in notas)


def test_prompt_pede_json_literal_e_traz_cartao():
    llm = FakeLLM(resposta())
    avaliar_camada_b(PERFIL, CARTAO, llm, "modelo-x")
    prompt = llm.calls[0]["prompt"]
    assert "JSON" in prompt and "literal" in prompt and "terapeuta com agenda vazia" in prompt
    assert LEGENDA in prompt and llm.calls[0]["max_tokens"] == 1200
    assert "JSON" in RUBRICA_PROMPT


def test_evidencia_aceita_passa_pela_redacao():
    perfil = {**PERFIL, "bio": "Meu público é evangélico e fiel"}
    r = resposta(concretude={"evidencia": "Meu público é evangélico e fiel"})
    nota = notas_por_id(avaliar_camada_b(perfil, CARTAO, FakeLLM(r), "m"))["concretude"]
    assert "evangélico" not in nota["evidencia"]


def a(cid, nota):
    return {"id": cid, "camada": "A", "nota": nota, "evidencia": ""}


def test_pontuar_camada_a_ignora_none():
    notas = [a("engajamento", 3), a("originalidade", 3), a("palavra_chave", None), a("mix_formatos", 1)]
    p = pontuar(notas, [])
    assert p["camada_a"] == round((9 + 9 + 1) / (9 + 9 + 3) * 100, 1)
    assert p["camada_b"] is None and p["total"] == p["camada_a"]


def test_pontuar_penalidade_etica():
    notas = [a("engajamento", 3)]
    p = pontuar(notas, ["Últimas vagas para a mentoria"])
    assert p["penalidade_etica"] == 5 and p["total"] == 95.0
    assert p["alertas_copy"][0]["tipo"] == "escassez"


def test_pontuar_penalidade_tem_teto_e_total_nao_negativo():
    p = pontuar([a("engajamento", 0)], ["Últimas vagas! Só hoje! acaba em 1h, 3 vagas, corre que é a última vaga"])
    assert p["penalidade_etica"] == 20 and p["total"] == 0


def test_pontuar_sem_nenhuma_nota():
    assert pontuar([], [])["total"] is None


def test_erro_da_api_da_llm_anula_so_a_camada_b():
    class LLMQuebrada:
        def complete(self, prompt, model, max_tokens):
            raise RuntimeError("429 rate limit")

    notas = avaliar_camada_b(PERFIL, CARTAO, LLMQuebrada(), "m")
    assert len(notas) == 6 and all(n["nota"] is None and n["evidencia"] == "LLM indisponível" for n in notas)
