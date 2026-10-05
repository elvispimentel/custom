import json
from pathlib import Path

import pytest

from instagram import SemAcesso, TokenExpirado, collect_instagram

FIX = Path(__file__).resolve().parent / "fixtures"
CONC = {"id": "c2", "plataforma": "instagram", "handle": "canalx"}


def fetch_from(name, calls=None):
    def fetch(url, params):
        if calls is not None:
            calls.append((url, params))
        return json.loads((FIX / f"{name}.json").read_text())
    return fetch


def test_collect_instagram_mapeia_formatos():
    posts, seguidores = collect_instagram(CONC, "IGID", "TOKEN", fetch=fetch_from("ig_business_discovery"))
    assert seguidores == 50000
    assert [p["formato"] for p in posts] == ["reel", "carrossel", "imagem"]
    p = posts[0]
    assert p["id"] == "ig:1"
    assert p["concorrente_id"] == "c2"
    assert p["plataforma"] == "instagram"
    assert p["url"] == "https://www.instagram.com/reel/AAA/"
    assert p["titulo_ou_legenda"] == "Você repete padrões?"
    assert p["views"] is None
    assert (p["curtidas"], p["comentarios"]) == (120000, 900)


def test_curtidas_ocultas_viram_none():
    posts, _ = collect_instagram(CONC, "IGID", "TOKEN", fetch=fetch_from("ig_business_discovery"))
    assert posts[2]["curtidas"] is None
    assert posts[2]["comentarios"] == 15


def test_pede_o_handle_e_o_limite():
    calls = []
    collect_instagram(CONC, "IGID", "TOKEN", fetch=fetch_from("ig_business_discovery", calls), limit=7)
    url, params = calls[0]
    assert url.endswith("/IGID")
    assert "username(canalx)" in params["fields"] and "limit(7)" in params["fields"]
    assert params["access_token"] == "TOKEN"


def test_nao_profissional_levanta_sem_acesso():
    with pytest.raises(SemAcesso):
        collect_instagram(CONC, "IGID", "TOKEN", fetch=fetch_from("ig_error_nao_profissional"))


def test_token_expirado_levanta_token_expirado():
    with pytest.raises(TokenExpirado):
        collect_instagram(CONC, "IGID", "TOKEN", fetch=fetch_from("ig_error_token"))


def test_erro_de_limite_nao_vira_sem_acesso():
    from instagram import GraphError

    with pytest.raises(GraphError):
        collect_instagram(CONC, "IGID", "TOKEN", fetch=fetch_from("ig_error_limite"))
