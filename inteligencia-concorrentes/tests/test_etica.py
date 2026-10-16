from etica import linter_copy, redigir_inferencias

REMOVIDO = "[removido: inferência sensível sobre o público]"


def test_redige_frase_sobre_o_publico():
    texto, cats = redigir_inferencias("Seu público é majoritariamente evangélico. A bio é clara.")
    assert texto.startswith(REMOVIDO)
    assert "A bio é clara." in texto and "evangélico" not in texto
    assert cats == ["religiao"]


def test_nao_redige_fala_do_proprio_criador():
    original = "Sou terapeuta e falo de ansiedade."
    assert redigir_inferencias(original) == (original, [])


def test_redige_saude_e_politica_dos_seguidores():
    _, cats = redigir_inferencias("Os seguidores parecem ter depressão.\nA audiência é bolsonarista!")
    assert sorted(cats) == ["politica", "saude"]


def test_linter_atributo_pessoal():
    achados = linter_copy("Você que é cristã precisa ouvir isso")
    assert [a["tipo"] for a in achados] == ["atributo_pessoal"]
    assert "cristã" in achados[0]["trecho"].lower()


def test_linter_escassez():
    achados = linter_copy("Últimas vagas! Só hoje")
    assert [a["tipo"] for a in achados] == ["escassez", "escassez"]


def test_linter_numero_de_vagas():
    assert [a["tipo"] for a in linter_copy("Restam 3 vagas para a turma")] == ["escassez"]


def test_linter_texto_neutro():
    assert linter_copy("Hoje conto como atendo minhas clientes com calma.") == []


def test_nao_redige_texto_do_nicho_do_criador():
    for original in ("Sou terapeuta espírita e atendo clientes online.",
                     "Atendo clientes com ansiedade há 10 anos.",
                     "Arraste para a direita e veja o depoimento da cliente."):
        assert redigir_inferencias(original) == (original, [])


def test_redige_atribuicao_ao_publico_com_verbo():
    _, cats = redigir_inferencias("Suas clientes têm depressão.")
    assert cats == ["saude"]
