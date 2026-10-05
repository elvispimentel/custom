from datetime import datetime, timedelta, timezone
from pathlib import Path

from config import load_config
from instagram import SemAcesso, TokenExpirado
from run_weekly import Collectors, main, run
from storage import load_json, save_json

CFG = load_config(Path(__file__).resolve().parent.parent / "config" / "territorios.json")
NOW = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)


def mk_post(pid, conc, plat, curtidas=100):
    return {
        "id": pid, "concorrente_id": conc, "plataforma": plat, "formato": "short",
        "url": f"https://x/{pid}", "titulo_ou_legenda": pid,
        "publicado_em": (NOW - timedelta(days=10)).isoformat(),
        "views": 10 if plat == "youtube" else None,
        "curtidas": curtidas, "comentarios": 1, "coletado_em": NOW.isoformat(),
    }


def setup(tmp_path, concs):
    save_json(tmp_path / "data" / "concorrentes.json", concs)


def conc(cid, plat="youtube", status="aprovado"):
    return {"id": cid, "nome": f"Canal {cid}", "plataforma": plat, "status": status,
            "channel_id": cid, "handle": cid, "seguidores": 1000}


def yt_ok(c):
    return [mk_post(f"yt:{c['id']}", c["id"], "youtube")], 2000


def ig_ok(c):
    return [mk_post(f"ig:{c['id']}", c["id"], "instagram")], 3000


def analyzer_ok(p):
    return {"post_id": p["id"], "gancho": "g", "tema": "t", "promessa": "p",
            "por_que_funcionou": "w", "adaptacao_galifrael": "a"}


def test_nunca_coleta_candidato_nem_descartado(tmp_path):
    setup(tmp_path, [conc("a"), conc("b", status="candidato"), conc("c", status="descartado")])
    vistos = []
    run(CFG, tmp_path, NOW, Collectors(youtube=lambda c: (vistos.append(c["id"]), yt_ok(c))[1], instagram=None), analyzer_ok)
    assert vistos == ["a"]


def test_atualiza_seguidores_do_concorrente(tmp_path):
    setup(tmp_path, [conc("a")])
    run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=None), analyzer_ok)
    assert load_json(tmp_path / "data" / "concorrentes.json", [])[0]["seguidores"] == 2000


def test_sem_acesso_marca_status(tmp_path):
    setup(tmp_path, [conc("i1", "instagram")])

    def ig_sem_acesso(c):
        raise SemAcesso("não profissional")

    run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=ig_sem_acesso), analyzer_ok)
    assert load_json(tmp_path / "data" / "concorrentes.json", [])[0]["status"] == "sem_acesso"


def test_token_expirado_pula_instagram_e_avisa(tmp_path):
    setup(tmp_path, [conc("i1", "instagram"), conc("i2", "instagram"), conc("y1")])
    chamadas = []

    def ig_token(c):
        chamadas.append(c["id"])
        raise TokenExpirado("expirou")

    r = run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=ig_token), analyzer_ok)
    assert chamadas == ["i1"]
    assert any("renovar token Meta" in f for f in r.falhas)
    assert "yt:y1" in r.report_path.read_text(encoding="utf-8") or "Canal y1" in r.report_path.read_text(encoding="utf-8")


def test_falha_de_um_canal_nao_interrompe_os_outros(tmp_path):
    setup(tmp_path, [conc("a"), conc("b")])

    def yt_falha_a(c):
        if c["id"] == "a":
            raise RuntimeError("timeout")
        return yt_ok(c)

    r = run(CFG, tmp_path, NOW, Collectors(youtube=yt_falha_a, instagram=None), analyzer_ok)
    assert any("Canal a" in f and "timeout" in f for f in r.falhas)
    arquivos = list((tmp_path / "data" / "posts").glob("*.json"))
    posts = load_json(arquivos[0], [])
    assert [p["id"] for p in posts] == ["yt:b"]


def test_instagram_nao_configurado_gera_uma_falha(tmp_path):
    setup(tmp_path, [conc("i1", "instagram"), conc("i2", "instagram")])
    r = run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=None), analyzer_ok)
    assert sum("Instagram não configurado" in f for f in r.falhas) == 1


def test_nao_reanalisa_post_ja_analisado(tmp_path):
    setup(tmp_path, [conc("a")])
    save_json(tmp_path / "data" / "analises.json", {"yt:a": analyzer_ok({"id": "yt:a"})})
    chamadas = []
    run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=None), lambda p: chamadas.append(p["id"]))
    assert chamadas == []


def test_analise_malformada_nao_derruba_e_fica_pendente(tmp_path):
    setup(tmp_path, [conc("a")])
    run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=None), lambda p: None)
    assert load_json(tmp_path / "data" / "analises.json", {}) == {}


def test_coleta_repetida_preenche_anterior(tmp_path):
    setup(tmp_path, [conc("a")])
    for _ in range(2):
        run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=None), analyzer_ok)
    posts = load_json(next((tmp_path / "data" / "posts").glob("*.json")), [])
    assert len(posts) == 1 and posts[0]["anterior"] is not None


def test_dry_run_gera_relatorio_posts_e_issue_sem_rede(tmp_path):
    assert main(["--dry-run", "--data-dir", str(tmp_path)]) == 0
    assert list((tmp_path / "data" / "posts").glob("*.json"))
    assert list((tmp_path / "relatorios").glob("*.md"))
    assert (tmp_path / "issue.md").read_text(encoding="utf-8").strip()


def test_analise_invalida_vira_falha_visivel(tmp_path):
    setup(tmp_path, [conc("a")])
    r = run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=None), lambda p: None)
    assert any("análise inválida" in f and "yt:a" in f for f in r.falhas)


def test_sem_acesso_aparece_nas_falhas(tmp_path):
    setup(tmp_path, [conc("i1", "instagram")])

    def ig_sem_acesso(c):
        raise SemAcesso("não profissional")

    r = run(CFG, tmp_path, NOW, Collectors(youtube=yt_ok, instagram=ig_sem_acesso), analyzer_ok)
    assert any("sem_acesso" in f and "Canal i1" in f for f in r.falhas)


def test_main_sem_chaves_exige_openai(monkeypatch, tmp_path, capsys):
    monkeypatch.delenv("YOUTUBE_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert main(["--data-dir", str(tmp_path)]) == 2
    assert "OPENAI_API_KEY" in capsys.readouterr().err
