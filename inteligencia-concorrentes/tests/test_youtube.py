import json
from pathlib import Path

from youtube import collect_youtube

FIX = Path(__file__).resolve().parent / "fixtures"
CONC = {"id": "c1", "plataforma": "youtube", "channel_id": "UC_abc", "handle": "@canal"}


def make_fetch(calls):
    def fetch(url, params):
        calls.append(url)
        for key, name in (("channels", "youtube_channel"), ("playlistItems", "youtube_playlist"), ("videos", "youtube_videos")):
            if url.endswith("/" + key):
                return json.loads((FIX / f"{name}.json").read_text())
        raise AssertionError(f"chamada inesperada: {url}")
    return fetch


def test_collect_youtube_mapeia_campos():
    posts, seguidores = collect_youtube(CONC, "KEY", fetch=make_fetch([]))
    assert seguidores == 12345
    p = posts[0]
    assert p["id"] == "yt:v1"
    assert p["concorrente_id"] == "c1"
    assert p["plataforma"] == "youtube"
    assert p["url"] == "https://www.youtube.com/watch?v=v1"
    assert p["titulo_ou_legenda"] == "Por que você se sabota"
    assert (p["views"], p["curtidas"], p["comentarios"]) == (1_500_000, 20_000, 900)
    assert p["publicado_em"] == "2026-09-01T10:00:00Z"
    assert p["coletado_em"]


def test_collect_youtube_classifica_short_por_duracao():
    posts, _ = collect_youtube(CONC, "KEY", fetch=make_fetch([]))
    assert [p["formato"] for p in posts] == ["short", "video"]


def test_collect_youtube_curtidas_ocultas_viram_none():
    posts, _ = collect_youtube(CONC, "KEY", fetch=make_fetch([]))
    assert posts[1]["curtidas"] is None


def test_collect_youtube_nunca_usa_search():
    calls = []
    collect_youtube(CONC, "KEY", fetch=make_fetch(calls))
    assert calls and all("search" not in c for c in calls)


def test_http_get_json_mostra_o_motivo_do_erro_sem_vazar_a_chave(monkeypatch):
    import io
    import urllib.error

    import pytest

    from youtube import YouTubeAPIError, http_get_json

    corpo = json.dumps(
        {"error": {"code": 403, "message": "YouTube Data API v3 has not been used", "errors": [{"reason": "accessNotConfigured"}]}}
    ).encode()

    def fake_urlopen(url, timeout):
        raise urllib.error.HTTPError(url, 403, "Forbidden", {}, io.BytesIO(corpo))

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    with pytest.raises(YouTubeAPIError) as e:
        http_get_json("https://exemplo.invalid/x", {"key": "SEGREDO123"})
    msg = str(e.value)
    assert "403" in msg and "accessNotConfigured" in msg and "has not been used" in msg
    assert "SEGREDO123" not in msg
