import json
from pathlib import Path

import pytest

from cartao import CartaoInvalido, load_cartao

EXEMPLO = Path(__file__).resolve().parent.parent / "config" / "clientes" / "exemplo" / "cartao.json"


def gravar(tmp_path, mudar):
    dados = json.loads(EXEMPLO.read_text(encoding="utf-8"))
    dados["aprovado"] = True
    mudar(dados)
    caminho = tmp_path / "cartao.json"
    caminho.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")
    return caminho


def test_exemplo_aprovado_carrega(tmp_path):
    c = load_cartao(gravar(tmp_path, lambda d: d.update(aprovado=True)))
    assert c["aprovado"] is True and "cliente_de_alma" in c


def test_json_que_nao_e_objeto(tmp_path):
    (tmp_path / "c.json").write_text("[]")
    with pytest.raises(CartaoInvalido):
        load_cartao(tmp_path / "c.json")


def test_falta_chave_obrigatoria(tmp_path):
    with pytest.raises(CartaoInvalido, match="mecanismo_unico"):
        load_cartao(gravar(tmp_path, lambda d: d.pop("mecanismo_unico")))


def test_nao_aprovado(tmp_path):
    with pytest.raises(CartaoInvalido, match="cartão não aprovado pelo cliente"):
        load_cartao(gravar(tmp_path, lambda d: d.update(aprovado=False)))


def test_voz_do_cliente_com_tipo_errado(tmp_path):
    with pytest.raises(CartaoInvalido):
        load_cartao(gravar(tmp_path, lambda d: d["voz_do_cliente"].update(frases_exatas="texto")))


def test_sem_voz_do_cliente_e_valido(tmp_path):
    assert "voz_do_cliente" not in load_cartao(gravar(tmp_path, lambda d: d.pop("voz_do_cliente")))
