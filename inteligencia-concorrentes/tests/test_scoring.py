from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from config import load_config
from scoring import in_window, is_validated, rank

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


def test_score_e_a_media_das_posicoes_em_views_e_comentarios():
    posts = [post("A", views=100, comentarios=1), post("B", views=50, comentarios=10), post("C", views=10, comentarios=5)]
    r = rank(posts, [conc("c1")], CFG, NOW)["youtube"]
    assert [p["id"] for p in r] == ["B", "A", "C"]
    assert {p["id"]: p["score"] for p in r} == pytest.approx({"A": 0.5, "B": 2 / 3, "C": 1 / 3})


def test_inscritos_nao_entram_no_score():
    posts = [post("A", conc="g", views=100, comentarios=10), post("B", conc="p", views=100, comentarios=10)]
    concs = [conc("g", seg=10_000_000), conc("p", seg=10)]
    r = rank(posts, concs, CFG, NOW)["youtube"]
    assert r[0]["score"] == r[1]["score"]


def test_canal_sem_seguidores_nao_quebra_o_ranking():
    r = rank([post("A", views=10, comentarios=1)], [conc("c1", seg=0)], CFG, NOW)["youtube"]
    assert r[0]["score"] == pytest.approx(0.5)


def test_views_ocultas_contam_zero_no_youtube():
    posts = [post("A", views=None, comentarios=3), post("B", views=10, comentarios=3)]
    r = rank(posts, [conc("c1")], CFG, NOW)["youtube"]
    assert [p["id"] for p in r] == ["B", "A"]


def test_instagram_usa_curtidas_e_comentarios_e_aceita_curtidas_ocultas():
    posts = [
        post("a", plat="instagram", conc="c2", curtidas=None, comentarios=10, views=None),
        post("b", plat="instagram", conc="c2", curtidas=100, comentarios=20, views=None),
    ]
    r = rank(posts, [conc("c2", plat="instagram")], CFG, NOW)["instagram"]
    assert [p["id"] for p in r] == ["b", "a"]
    assert r[1]["score"] == pytest.approx(0.25)


def test_validado_youtube_no_limite():
    assert not is_validated(post(views=999_999), CFG)
    assert is_validated(post(views=1_000_000), CFG)


def test_validado_instagram_usa_curtidas():
    assert is_validated(post(plat="instagram", curtidas=50_000, views=None), CFG)
    assert not is_validated(post(plat="instagram", curtidas=49_999, views=None), CFG)


def test_janela_exclui_menos_de_48h_e_mais_antigo_que_a_janela():
    cfg90 = {**CFG, "janela_dias": 90}
    assert not in_window(post(ago=timedelta(hours=47)), NOW, cfg90)
    assert in_window(post(ago=timedelta(hours=49)), NOW, cfg90)
    assert not in_window(post(ago=timedelta(days=91)), NOW, cfg90)


def test_config_real_aceita_videos_antigos_que_viralizaram():
    assert in_window(post(ago=timedelta(days=400)), NOW, CFG)


def test_rank_separa_plataformas_e_ordena():
    posts = [
        post("a", views=100),
        post("b", views=5000, comentarios=10),
        post("c", plat="instagram", conc="c2", curtidas=100, views=None),
    ]
    concs = [conc("c1"), conc("c2", plat="instagram")]
    r = rank(posts, concs, CFG, NOW)
    assert [p["id"] for p in r["youtube"]] == ["b", "a"]
    assert [p["id"] for p in r["instagram"]] == ["c"]
    assert r["youtube"][0]["score"] > r["youtube"][1]["score"]
    assert "validado" in r["youtube"][0]


def test_rank_ignora_concorrente_descartado_e_candidato():
    posts = [post("a", conc="c1", views=10), post("b", conc="c2", views=10), post("c", conc="c3", views=10)]
    concs = [conc("c1"), conc("c2", status="descartado"), conc("c3", status="candidato")]
    r = rank(posts, concs, CFG, NOW)
    assert [p["id"] for p in r["youtube"]] == ["a"]
