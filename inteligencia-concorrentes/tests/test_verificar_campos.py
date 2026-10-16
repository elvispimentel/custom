import json
from pathlib import Path

from verificar_campos import main, verificar

FIX = Path(__file__).resolve().parent / "fixtures"


def fetch_de(nome):
    return lambda url, params: json.loads((FIX / f"{nome}.json").read_text())


def test_verificar_tudo_presente():
    r = verificar("canalx", "IGID", "TOKEN", fetch=fetch_de("ig_business_discovery_perfil"))
    assert r == {"bio": True, "nome": True, "website": True, "view_count": True}


def test_verificar_tudo_ausente():
    r = verificar("canalx", "IGID", "TOKEN", fetch=fetch_de("ig_business_discovery"))
    assert r == {"bio": False, "nome": False, "website": False, "view_count": False}


def test_main_sem_variaveis_de_ambiente(monkeypatch):
    monkeypatch.delenv("META_ACCESS_TOKEN", raising=False)
    monkeypatch.delenv("IG_USER_ID", raising=False)
    assert main(["--handle", "x"]) == 2


def test_campo_rejeitado_pela_api_vira_ausente():
    def fetch(url, params):
        if "view_count" in params["fields"]:
            return {"error": {"code": 100, "message": "Tried accessing nonexisting field (view_count)"}}
        return json.loads((FIX / "ig_business_discovery_perfil.json").read_text())

    r = verificar("canalx", "IGID", "TOKEN", fetch=fetch)
    assert r == {"bio": True, "nome": True, "website": True, "view_count": False}
