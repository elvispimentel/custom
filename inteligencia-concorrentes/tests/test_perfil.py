import json
from pathlib import Path

import pytest

from instagram import TokenExpirado
from perfil import collect_perfil_autenticado, metricas_autenticadas

FIX = Path(__file__).resolve().parent / "fixtures"


def carregar(nome):
    return json.loads((FIX / f"{nome}.json").read_text())


def fetch_falso(calls, insights_por_midia=None):
    def fetch(url, params):
        calls.append((url, params))
        if url.endswith("/insights"):
            midia = url.rsplit("/", 2)[-2]
            return (insights_por_midia or {}).get(midia) or carregar("ig_media_insights")
        return carregar("ig_me")
    return fetch


def test_coleta_perfil_e_insights_por_post():
    calls = []
    perfil = collect_perfil_autenticado("IGID", "TOKEN", fetch=fetch_falso(calls))
    assert len(calls) == 3
    assert perfil["handle"] == "anaterapeuta" and perfil["bio"] == "Ajudo terapeutas a lotar a agenda"
    assert perfil["seguidores"] == 8000
    assert perfil["posts"][0]["insights"]["shares"] == 40
    assert "biography" in calls[0][1]["fields"] and "limit(24)" in calls[0][1]["fields"]
    assert "shares" in calls[1][1]["metric"]


def test_metricas_autenticadas_por_alcance():
    perfil = collect_perfil_autenticado("IGID", "TOKEN", fetch=fetch_falso([]))
    m = metricas_autenticadas(perfil)
    assert m == {"sends_por_alcance": 0.04, "likes_por_alcance": 0.3, "saves_por_alcance": 0.05}


def test_erro_de_insights_num_post_nao_derruba():
    perfil = collect_perfil_autenticado(
        "IGID", "TOKEN", fetch=fetch_falso([], {"11": {"error": {"code": 100, "message": "x"}}}))
    assert perfil["posts"][0]["insights"] == {}
    assert perfil["posts"][1]["insights"]["reach"] == 1000


def test_token_expirado_em_insights_interrompe():
    with pytest.raises(TokenExpirado):
        collect_perfil_autenticado("IGID", "TOKEN", fetch=fetch_falso([], {"11": carregar("ig_error_token")}))


def test_sem_alcance_vira_none():
    perfil = {"posts": [{"insights": {}}, {"insights": {"reach": 0, "shares": 3}}]}
    assert metricas_autenticadas(perfil) == {
        "sends_por_alcance": None, "likes_por_alcance": None, "saves_por_alcance": None}
