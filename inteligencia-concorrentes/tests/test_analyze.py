import json
from pathlib import Path
from types import SimpleNamespace

from analyze import ANALISE_PROMPT, analyze_post, select_top
from config import load_config

CFG = load_config(Path(__file__).resolve().parent.parent / "config" / "territorios.json")


class FakeClient:
    def __init__(self, text):
        self.text = text
        self.calls = []
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(content=[SimpleNamespace(text=self.text)])


def p(pid, plat="youtube"):
    return {"id": pid, "plataforma": plat, "titulo_ou_legenda": "t", "formato": "short", "url": "u", "score": 1.0}


def test_select_top_respeita_limite_por_plataforma():
    ranked = {
        "youtube": [p(f"y{i}") for i in range(8)],
        "instagram": [p(f"i{i}", "instagram") for i in range(8)],
    }
    top = select_top(ranked, set(), CFG)
    assert len(top) == 10
    assert sum(1 for x in top if x["plataforma"] == "youtube") == 5


def test_select_top_pula_ja_analisados():
    ranked = {"youtube": [p("y0"), p("y1"), p("y2")], "instagram": []}
    top = select_top(ranked, {"y0"}, CFG)
    assert [x["id"] for x in top] == ["y1", "y2"]


def test_analyze_post_json_valido():
    resposta = {
        "gancho": "pergunta provocativa",
        "tema": "autossabotagem",
        "promessa": "entender o padrão",
        "por_que_funcionou": "identificação imediata",
        "adaptacao_galifrael": "Descubra quem você está repetindo",
    }
    client = FakeClient(json.dumps(resposta))
    r = analyze_post(p("y1"), client, "modelo-x")
    assert r == {"post_id": "y1", **resposta}
    assert client.calls[0]["model"] == "modelo-x"
    assert client.calls[0]["max_tokens"] == 600


def test_analyze_post_texto_fora_do_json_retorna_none():
    assert analyze_post(p("y1"), FakeClient("Claro! Aqui vai a análise..."), "m") is None


def test_analyze_post_json_sem_chaves_retorna_none():
    assert analyze_post(p("y1"), FakeClient('{"gancho": "x"}'), "m") is None


def test_prompt_pede_json_e_cita_a_tese():
    assert "JSON" in ANALISE_PROMPT
    assert "descubra quem você está repetindo" in ANALISE_PROMPT.lower()


def test_analyze_post_aceita_json_dentro_de_cerca_de_codigo():
    resposta = {k: "x" for k in ("gancho", "tema", "promessa", "por_que_funcionou", "adaptacao_galifrael")}
    texto = "```json\n" + json.dumps(resposta) + "\n```"
    r = analyze_post(p("y1"), FakeClient(texto), "m")
    assert r is not None and r["post_id"] == "y1"


def test_analyze_post_rejeita_campos_que_nao_sao_texto():
    resposta = {k: "x" for k in ("gancho", "promessa", "por_que_funcionou", "adaptacao_galifrael")}
    resposta["tema"] = ["a", "b"]
    assert analyze_post(p("y1"), FakeClient(json.dumps(resposta)), "m") is None
