import json
from pathlib import Path

import pytest

from config import load_config

REAL = Path(__file__).resolve().parent.parent / "config" / "territorios.json"


def test_config_real_tem_valores_do_spec():
    cfg = load_config(REAL)
    assert cfg["limiares"]["youtube_views_validado"] == 1_000_000
    assert cfg["limiares"]["instagram_curtidas_validado"] == 50_000
    assert cfg["janela_dias"] == 90
    assert cfg["idade_minima_horas"] == 48


def test_config_sem_chave_obrigatoria_falha(tmp_path):
    p = tmp_path / "c.json"
    p.write_text(json.dumps({"territorio": "A"}))
    with pytest.raises(ValueError):
        load_config(p)


def test_dependencias_e_modelo_sao_da_openai():
    base = REAL.parent.parent
    reqs = (base / "requirements.txt").read_text().split()
    assert "openai" in reqs and "anthropic" not in reqs
    assert load_config(REAL)["modelo_analise"].startswith("gpt")


def test_config_tem_autores_obras_e_piso_de_inscritos():
    cfg = load_config(REAL)
    palavras = [p.lower() for p in cfg["palavras_chave"]]
    for termo in ("joe dispenza", "helio couto", "transurfing", "ressonância harmônica", "lei da atração", "hackeando a mente"):
        assert termo in palavras
    assert cfg["min_seguidores_candidato"] >= 1000
    assert cfg["max_buscas_youtube"] >= len(cfg["palavras_chave"])
