from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[2]
ARQ = RAIZ / ".github" / "workflows" / "semanal.yml"


def carregar():
    texto = ARQ.read_text(encoding="utf-8")
    wf = yaml.safe_load(texto)
    gatilhos = wf.get("on", wf.get(True))
    return texto, wf, gatilhos


def test_cron_semanal_segunda():
    _, _, g = carregar()
    assert g["schedule"] == [{"cron": "0 9 * * 1"}]


def test_tem_disparo_manual_com_modo():
    _, _, g = carregar()
    modo = g["workflow_dispatch"]["inputs"]["modo"]
    assert modo["options"] == ["coletar", "descobrir"]


def test_permissoes_minimas():
    _, wf, _ = carregar()
    assert wf["permissions"] == {"contents": "write", "issues": "write"}


def test_nunca_usa_force_push():
    texto, _, _ = carregar()
    for proibido in ("--force", "push -f", "+refs"):
        assert proibido not in texto


def test_push_so_na_branch_de_dados():
    texto, _, _ = carregar()
    pushes = [l for l in texto.splitlines() if "git push" in l]
    assert pushes and all("dados-concorrentes" in l for l in pushes)


def test_chaves_vem_de_secrets():
    texto, _, _ = carregar()
    for nome in ("YOUTUBE_API_KEY", "META_ACCESS_TOKEN", "IG_USER_ID", "ANTHROPIC_API_KEY"):
        assert f"${{{{ secrets.{nome} }}}}" in texto
