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
            todos = {
                "UC1": {"id": "UC1", "statistics": {"subscriberCount": "5000"}, "snippet": {"country": "BR"}},
                "UC2": {"id": "UC2", "statistics": {"subscriberCount": "90000"}, "snippet": {}},
            }
            return {"items": [todos[i] for i in params["id"].split(",") if i in todos]}
        raise AssertionError(url)
    return fetch


def sem_piso(**kw):
    return {**CFG, "min_seguidores_candidato": 0, **kw}


def test_busca_videos_mais_vistos_e_respeita_max_buscas():
    calls = []
    cfg = sem_piso(palavras_chave=["a", "b", "c"], max_buscas_youtube=1)
    youtube_candidates(cfg, "KEY", fetch=make_fetch(calls))
    buscas = [p for u, p in calls if u.endswith("/search")]
    assert len(buscas) == 1
    assert buscas[0]["type"] == "video" and buscas[0]["order"] == "viewCount"


def test_candidato_traz_motivo_e_status():
    cfg = sem_piso(palavras_chave=["joe dispenza"], max_buscas_youtube=1)
    achados = youtube_candidates(cfg, "KEY", fetch=make_fetch([]))
    c = next(x for x in achados if x["channel_id"] == "UC1")
    assert c["status"] == "candidato" and c["plataforma"] == "youtube"
    assert c["nome"] == "Canal Um"
    assert c["motivo"] == "vídeos muito vistos para: joe dispenza"
    assert c["seguidores"] == 5000 and c["pais"] == "BR" and c["territorio"] == "A"
    assert c["id"] == "yt-UC1"


def test_filtra_canais_abaixo_do_piso_de_seguidores():
    cfg = {**CFG, "min_seguidores_candidato": 10_000, "palavras_chave": ["x"], "max_buscas_youtube": 1}
    achados = youtube_candidates(cfg, "KEY", fetch=make_fetch([]))
    assert [c["channel_id"] for c in achados] == ["UC2"]


def test_canal_em_mais_palavras_vem_primeiro():
    cfg = sem_piso(palavras_chave=["a"], max_buscas_youtube=1)
    base = youtube_candidates(cfg, "KEY", fetch=make_fetch([]))
    assert base[0]["channel_id"] == "UC2"  # tem 90 mil e aparece em 2 vídeos da mesma busca, mas 1 palavra

    def fetch_dois_termos(url, params):
        if url.endswith("/search"):
            ids = ["UC1"] if params["q"] == "a" else ["UC1", "UC2"]
            return {"items": [{"id": {"videoId": "v"}, "snippet": {"channelId": i, "channelTitle": i}} for i in ids]}
        return make_fetch([])(url, params)

    cfg2 = sem_piso(palavras_chave=["a", "b"], max_buscas_youtube=2)
    r = youtube_candidates(cfg2, "KEY", fetch=fetch_dois_termos)
    assert [c["channel_id"] for c in r] == ["UC1", "UC2"]
    assert r[0]["motivo"] == "vídeos muito vistos para: a, b"


def test_channels_list_em_lotes_de_50_ids():
    calls = []

    def fetch(url, params):
        calls.append((url, params))
        if url.endswith("/search"):
            return {"items": [{"id": {"videoId": "v"}, "snippet": {"channelId": f"UC{i}", "channelTitle": f"C{i}"}} for i in range(120)]}
        ids = params["id"].split(",")
        return {"items": [{"id": i, "statistics": {"subscriberCount": "20000"}, "snippet": {}} for i in ids]}

    cfg = sem_piso(palavras_chave=["a"], max_buscas_youtube=1)
    r = youtube_candidates(cfg, "KEY", fetch=fetch)
    lotes = [p["id"].split(",") for u, p in calls if u.endswith("/channels")]
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
