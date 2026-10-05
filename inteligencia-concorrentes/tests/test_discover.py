import json
from pathlib import Path

from config import load_config
from discover import merge_candidates, youtube_candidates

FIX = Path(__file__).resolve().parent / "fixtures"
CFG = load_config(Path(__file__).resolve().parent.parent / "config" / "territorios.json")


def make_fetch(calls):
    def fetch(url, params):
        calls.append((url, params))
        if url.endswith("/search"):
            return json.loads((FIX / "youtube_search.json").read_text())
        if url.endswith("/channels"):
            return {"items": [
                {"id": "UC1", "statistics": {"subscriberCount": "5000"}, "snippet": {"country": "BR"}},
                {"id": "UC2", "statistics": {"subscriberCount": "90000"}, "snippet": {}},
            ]}
        raise AssertionError(url)
    return fetch


def test_youtube_candidates_respeita_max_buscas():
    calls = []
    cfg = {**CFG, "palavras_chave": ["a", "b", "c"], "max_buscas_youtube": 1}
    youtube_candidates(cfg, "KEY", fetch=make_fetch(calls))
    assert sum(1 for u, _ in calls if u.endswith("/search")) == 1


def test_candidato_traz_motivo_e_status():
    cfg = {**CFG, "palavras_chave": ["autossabotagem"], "max_buscas_youtube": 1}
    achados = youtube_candidates(cfg, "KEY", fetch=make_fetch([]))
    c = achados[0]
    assert c["status"] == "candidato" and c["plataforma"] == "youtube"
    assert c["channel_id"] == "UC1" and c["nome"] == "Canal Um"
    assert c["motivo"] == "palavra-chave: autossabotagem"
    assert c["seguidores"] == 5000 and c["pais"] == "BR" and c["territorio"] == "A"
    assert c["id"] == "yt-UC1"


def test_merge_nao_duplica_nem_rebaixa_aprovado():
    existente = [{"id": "yt-UC1", "plataforma": "youtube", "channel_id": "UC1", "status": "aprovado", "nome": "Canal Um"}]
    achados = [
        {"id": "yt-UC1", "plataforma": "youtube", "channel_id": "UC1", "status": "candidato", "nome": "Canal Um"},
        {"id": "yt-UC2", "plataforma": "youtube", "channel_id": "UC2", "status": "candidato", "nome": "Canal Dois"},
    ]
    r = merge_candidates(existente, achados)
    assert len(r) == 2
    assert next(c for c in r if c["channel_id"] == "UC1")["status"] == "aprovado"
    assert next(c for c in r if c["channel_id"] == "UC2")["status"] == "candidato"
