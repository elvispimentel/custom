from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from config import load_config
from scoring import in_window, is_validated, rank, score_post

CFG = load_config(Path(__file__).resolve().parent.parent / "config" / "territorios.json")
NOW = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)


def post(pid="p1", plat="youtube", conc="c1", ago=timedelta(days=10), **kw):
    base = {
        "id": pid,
        "concorrente_id": conc,
        "plataforma": plat,
        "publicado_em": (NOW - ago).isoformat(),
        "views": 0,
        "curtidas": 0,
        "comentarios": 0,
    }
    base.update(kw)
    return base


def conc(cid="c1", plat="youtube", seg=1000, status="aprovado"):
    return {"id": cid, "plataforma": plat, "seguidores": seg, "status": status}


def test_score_formula():
    p = post(curtidas=100, comentarios=10)
    assert score_post(p, 1000) == pytest.approx(0.12)


def test_score_seguidores_zero_retorna_zero():
    assert score_post(post(curtidas=100), 0) == 0.0


def test_score_curtidas_ocultas_contam_zero():
    p = post(plat="instagram", curtidas=None, comentarios=10)
    assert score_post(p, 100) == pytest.approx(0.2)


def test_validado_youtube_no_limite():
    assert not is_validated(post(views=999_999), CFG)
    assert is_validated(post(views=1_000_000), CFG)


def test_validado_instagram_usa_curtidas():
    assert is_validated(post(plat="instagram", curtidas=50_000, views=None), CFG)
    assert not is_validated(post(plat="instagram", curtidas=49_999, views=None), CFG)


def test_janela_exclui_menos_de_48h_e_mais_de_90d():
    assert not in_window(post(ago=timedelta(hours=47)), NOW, CFG)
    assert in_window(post(ago=timedelta(hours=49)), NOW, CFG)
    assert not in_window(post(ago=timedelta(days=91)), NOW, CFG)


def test_rank_separa_plataformas_e_ordena():
    posts = [
        post("a", curtidas=10),
        post("b", curtidas=500),
        post("c", plat="instagram", conc="c2", curtidas=100, views=None),
    ]
    concs = [conc("c1"), conc("c2", plat="instagram")]
    r = rank(posts, concs, CFG, NOW)
    assert [p["id"] for p in r["youtube"]] == ["b", "a"]
    assert [p["id"] for p in r["instagram"]] == ["c"]
    assert r["youtube"][0]["score"] > r["youtube"][1]["score"]
    assert "validado" in r["youtube"][0]


def test_rank_ignora_concorrente_descartado_e_candidato():
    posts = [post("a", conc="c1", curtidas=10), post("b", conc="c2", curtidas=10), post("c", conc="c3", curtidas=10)]
    concs = [conc("c1"), conc("c2", status="descartado"), conc("c3", status="candidato")]
    r = rank(posts, concs, CFG, NOW)
    assert [p["id"] for p in r["youtube"]] == ["a"]
