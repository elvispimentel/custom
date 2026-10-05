import json
from pathlib import Path

from config import load_config
from discover import merge_candidates, youtube_candidates

FIX = Path(__file__).resolve().parent / "fixtures"
CFG = load_config(Path(__file__).resolve().parent.parent / "config" / "territorios.json")


VIDEOS = {
    "v1": {"id": "v1", "snippet": {"title": "Vídeo 1"}, "statistics": {"viewCount": "50000", "commentCount": "100"}},
    "v2": {"id": "v2", "snippet": {"title": "Vídeo 2"}, "statistics": {"viewCount": "2000000", "commentCount": "5000"}},
    "v3": {"id": "v3", "snippet": {"title": "Vídeo 3"}, "statistics": {"viewCount": "300000", "commentCount": "800"}},
}


def make_fetch(calls):
    def fetch(url, params):
        calls.append((url, params))
        if url.endswith("/search"):
            return json.loads((FIX / "youtube_search.json").read_text())
        if url.endswith("/videos"):
            return {"items": [VIDEOS[i] for i in params["id"].split(",") if i in VIDEOS]}
        if url.endswith("/channels"):
            todos = {
                "UC1": {"id": "UC1", "statistics": {"subscriberCount": "5000"}, "snippet": {"country": "BR"}},
                "UC2": {"id": "UC2", "statistics": {"subscriberCount": "90000"}, "snippet": {}},
            }
            return {"items": [todos[i] for i in params["id"].split(",") if i in todos]}
        raise AssertionError(url)
    return fetch


def sem_piso(**kw):
    return {**CFG, "min_views_video": 0, **kw}


def test_busca_videos_mais_vistos_e_respeita_max_buscas():
    calls = []
    cfg = sem_piso(palavras_chave=["a", "b", "c"], max_buscas_youtube=1)
    youtube_candidates(cfg, "KEY", fetch=make_fetch(calls))
    buscas = [p for u, p in calls if u.endswith("/search")]
    assert len(buscas) == 1
    assert buscas[0]["type"] == "video" and buscas[0]["order"] == "viewCount"


def test_candidato_traz_motivo_status_e_o_video_mais_visto_como_prova():
    cfg = sem_piso(palavras_chave=["joe dispenza"], max_buscas_youtube=1)
    achados = youtube_candidates(cfg, "KEY", fetch=make_fetch([]))
    c = next(x for x in achados if x["channel_id"] == "UC2")
    assert c["status"] == "candidato" and c["plataforma"] == "youtube"
    assert c["motivo"] == "vídeos muito vistos para: joe dispenza"
    assert c["video_mais_visto"] == {
        "titulo": "Vídeo 2", "url": "https://www.youtube.com/watch?v=v2", "views": 2_000_000, "comentarios": 5000,
    }
    assert c["id"] == "yt-UC2" and c["territorio"] == "A" and c["seguidores"] == 90000


def test_filtra_pelas_views_do_melhor_video_e_nao_pelos_inscritos():
    cfg = {**CFG, "min_views_video": 100_000, "palavras_chave": ["x"], "max_buscas_youtube": 1}
    achados = youtube_candidates(cfg, "KEY", fetch=make_fetch([]))
    assert [c["channel_id"] for c in achados] == ["UC2"]


def test_canal_pequeno_com_video_viral_entra():
    def fetch(url, params):
        if url.endswith("/search"):
            return {"items": [{"id": {"videoId": "v9"}, "snippet": {"channelId": "UCpequeno", "channelTitle": "Pequeno"}}]}
        if url.endswith("/videos"):
            return {"items": [{"id": "v9", "snippet": {"title": "Viral"}, "statistics": {"viewCount": "3000000", "commentCount": "9000"}}]}
        return {"items": [{"id": "UCpequeno", "statistics": {"subscriberCount": "300"}, "snippet": {}}]}

    cfg = {**CFG, "palavras_chave": ["x"], "max_buscas_youtube": 1}
    assert [c["channel_id"] for c in youtube_candidates(cfg, "KEY", fetch=fetch)] == ["UCpequeno"]


def test_canal_em_mais_palavras_vem_primeiro():
    def fetch_dois_termos(url, params):
        if url.endswith("/search"):
            vids = [("v1", "UC1")] if params["q"] == "a" else [("v1", "UC1"), ("v2", "UC2")]
            return {"items": [{"id": {"videoId": v}, "snippet": {"channelId": c, "channelTitle": c}} for v, c in vids]}
        return make_fetch([])(url, params)

    cfg = sem_piso(palavras_chave=["a", "b"], max_buscas_youtube=2)
    r = youtube_candidates(cfg, "KEY", fetch=fetch_dois_termos)
    assert [c["channel_id"] for c in r] == ["UC1", "UC2"]
    assert r[0]["motivo"] == "vídeos muito vistos para: a, b"


def test_videos_e_canais_em_lotes_de_50_ids():
    calls = []

    def fetch(url, params):
        calls.append((url, params))
        if url.endswith("/search"):
            return {"items": [{"id": {"videoId": f"v{i}"}, "snippet": {"channelId": f"UC{i}", "channelTitle": f"C{i}"}} for i in range(120)]}
        ids = params["id"].split(",")
        if url.endswith("/videos"):
            return {"items": [{"id": i, "snippet": {"title": i}, "statistics": {"viewCount": "500000", "commentCount": "1"}} for i in ids]}
        return {"items": [{"id": i, "statistics": {"subscriberCount": "20000"}, "snippet": {}} for i in ids]}

    r = youtube_candidates(sem_piso(palavras_chave=["a"], max_buscas_youtube=1), "KEY", fetch=fetch)
    for sufixo in ("/videos", "/channels"):
        lotes = [p["id"].split(",") for u, p in calls if u.endswith(sufixo)]
        assert len(lotes) == 3 and all(len(l) <= 50 for l in lotes)
    assert len(r) == 120


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


def test_main_mostra_erro_da_api_sem_traceback(monkeypatch, tmp_path, capsys):
    import discover
    from youtube import YouTubeAPIError

    def falha(config, key):
        raise YouTubeAPIError("HTTP 403: chave sem permissão [accessNotConfigured]")

    monkeypatch.setenv("YOUTUBE_API_KEY", "k")
    monkeypatch.setattr(discover, "youtube_candidates", falha)
    assert discover.main(["--data-dir", str(tmp_path)]) == 1
    assert "accessNotConfigured" in capsys.readouterr().err
