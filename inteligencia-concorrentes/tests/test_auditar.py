import json
from datetime import datetime, timezone
from pathlib import Path

from auditar import AVISO_IA, build_auditoria_md, main, run_auditoria
from instagram import SemAcesso, TokenExpirado
from storage import save_json

BASE = Path(__file__).resolve().parent.parent
NOW = datetime(2026, 10, 16, tzinfo=timezone.utc)
CFG = {"palavras_chave": ["terapeutas"], "max_posts_auditoria": 24,
       "clientes": [{"id": "ana", "handle": "ana", "cartao": "config/clientes/exemplo/cartao.json", "proprio": False}]}


def perfil(handle, posts=True):
    lista = [{"id": f"ig:{handle}1", "formato": "reel", "titulo_ou_legenda": "Atendi 40 terapeutas",
              "curtidas": 100, "comentarios": 5, "publicado_em": "2026-10-10T10:00:00+0000"}] if posts else []
    return {"handle": handle, "nome": "Nome", "bio": "Ajudo terapeutas", "website": "", "seguidores": 10000,
            "posts": lista}


def avaliador(p, cartao):
    return [{"id": "concretude", "camada": "B", "nota": None if not p["posts"] else 2, "evidencia": "Ajudo terapeutas"}]


def concorrentes(tmp_path, lista):
    save_json(tmp_path / "data" / "concorrentes.json", lista)


CONC = [
    {"id": "c1", "plataforma": "instagram", "handle": "rival", "nome": "Rival", "status": "aprovado"},
    {"id": "c2", "plataforma": "youtube", "handle": "@yt", "nome": "YT", "status": "aprovado"},
    {"id": "c3", "plataforma": "instagram", "handle": "cand", "nome": "Cand", "status": "candidato"},
]


def test_audita_cliente_e_concorrentes_instagram_aprovados(tmp_path):
    concorrentes(tmp_path, CONC)
    mds, falhas = run_auditoria(CFG, tmp_path, NOW, perfil, None, avaliador, BASE)
    dados = json.loads((tmp_path / "data" / "auditorias" / "ana" / "2026-10-16.json").read_text())
    assert dados["cliente_id"] == "ana"
    assert [p["handle"] for p in dados["perfis"]] == ["ana", "rival"]
    assert mds == [tmp_path / "relatorios" / "auditorias" / "ana-2026-10-16.md"]
    md = mds[0].read_text(encoding="utf-8")
    assert md.rstrip().endswith(AVISO_IA) and falhas == []


def test_cartao_nao_aprovado_pula_cliente(tmp_path):
    cartao = json.loads((BASE / "config/clientes/exemplo/cartao.json").read_text())
    cartao["aprovado"] = False
    (tmp_path / "cartao.json").write_text(json.dumps(cartao))
    cfg = {**CFG, "clientes": [{**CFG["clientes"][0], "cartao": str(tmp_path / "cartao.json")}]}
    concorrentes(tmp_path, CONC)
    mds, falhas = run_auditoria(cfg, tmp_path, NOW, perfil, None, avaliador, BASE)
    assert mds == [] and any("não aprovado" in f for f in falhas)
    assert not (tmp_path / "data" / "auditorias").exists()


def test_concorrente_sem_acesso_vira_falha(tmp_path):
    concorrentes(tmp_path, CONC)

    def coletar(handle):
        if handle == "rival":
            raise SemAcesso("privado")
        return perfil(handle)

    mds, falhas = run_auditoria(CFG, tmp_path, NOW, coletar, None, avaliador, BASE)
    assert len(mds) == 1 and any("rival" in f for f in falhas)


def test_token_expirado_para_o_instagram(tmp_path):
    concorrentes(tmp_path, CONC)

    def coletar(handle):
        raise TokenExpirado("x")

    mds, falhas = run_auditoria(CFG, tmp_path, NOW, coletar, None, avaliador, BASE)
    assert mds == [] and falhas == ["renovar token Meta (Instagram)"]


def test_perfil_sem_posts_sai_com_camada_b_nula(tmp_path):
    concorrentes(tmp_path, [])
    run_auditoria(CFG, tmp_path, NOW, lambda h: perfil(h, posts=False), None, avaliador, BASE)
    dados = json.loads((tmp_path / "data" / "auditorias" / "ana" / "2026-10-16.json").read_text())
    assert dados["perfis"][0]["pontuacao"]["camada_b"] is None


def test_cliente_proprio_usa_coleta_autenticada(tmp_path):
    concorrentes(tmp_path, [])
    cfg = {**CFG, "clientes": [{**CFG["clientes"][0], "proprio": True}]}
    autenticado = perfil("ana")
    autenticado["posts"][0]["insights"] = {"reach": 1000, "shares": 40, "likes": 100, "saved": 10}
    run_auditoria(cfg, tmp_path, NOW, perfil, lambda: autenticado, avaliador, BASE)
    dados = json.loads((tmp_path / "data" / "auditorias" / "ana" / "2026-10-16.json").read_text())
    assert dados["perfis"][0]["metricas_autenticadas"]["sends_por_alcance"] == 0.04


def test_md_ordena_concorrentes_e_mostra_evidencia():
    r = lambda h, total: {"handle": h, "notas": [{"id": "prova", "camada": "B", "nota": 2, "evidencia": "40 casos"}],
                          "pontuacao": {"camada_a": 50.0, "camada_b": 60.0, "total": total, "penalidade_etica": 0,
                                        "alertas_copy": []}, "metricas": {"alertas": []}, "metricas_autenticadas": None}
    md = build_auditoria_md("ana", [r("ana", 10.0), r("baixo", 20.0), r("alto", 90.0)], ["uma falha"], NOW)
    assert md.index("| ana") < md.index("| alto") < md.index("| baixo")
    assert "40 casos" in md and "uma falha" in md and md.rstrip().endswith(AVISO_IA)


def test_dry_run(tmp_path):
    assert main(["--data-dir", str(tmp_path), "--dry-run"]) == 0
    assert (tmp_path / "issue.md").read_text(encoding="utf-8").strip()
    assert list((tmp_path / "relatorios" / "auditorias").glob("*.md"))
