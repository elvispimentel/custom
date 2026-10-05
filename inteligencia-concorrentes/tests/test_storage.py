from datetime import datetime, timezone

from storage import load_json, merge_posts, posts_path, save_json


def test_save_json_atomico_e_load_default(tmp_path):
    p = tmp_path / "sub" / "x.json"
    assert load_json(p, []) == []
    save_json(p, {"nome": "Reflexão"})
    assert load_json(p, None) == {"nome": "Reflexão"}
    assert "Reflexão" in p.read_text(encoding="utf-8")
    assert list(p.parent.glob("*.tmp")) == []


def test_posts_path_usa_ano_mes(tmp_path):
    now = datetime(2026, 10, 5, tzinfo=timezone.utc)
    assert posts_path(tmp_path, now) == tmp_path / "data" / "posts" / "2026-10.json"


def test_merge_nao_duplica_e_preenche_anterior():
    antigo = {"id": "yt:1", "views": 100, "curtidas": 10, "comentarios": 1, "coletado_em": "2026-09-28"}
    novo = {"id": "yt:1", "views": 300, "curtidas": 30, "comentarios": 3, "coletado_em": "2026-10-05"}
    r = merge_posts([antigo], [novo])
    assert len(r) == 1
    assert r[0]["views"] == 300
    assert r[0]["anterior"] == {"views": 100, "curtidas": 10, "comentarios": 1, "coletado_em": "2026-09-28"}


def test_merge_post_novo_vem_sem_anterior():
    r = merge_posts([], [{"id": "yt:2", "views": 5, "curtidas": 1, "comentarios": 0, "coletado_em": "x"}])
    assert r[0].get("anterior") is None
