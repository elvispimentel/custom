import csv

from calibrar import CABECALHO, comparar, exportar_planilha, main
from storage import save_json


def resultado(handle, n=10):
    return {"handle": handle, "notas": [{"id": f"c{i}", "camada": "B", "nota": 2, "evidencia": "x"} for i in range(n)]}


def gravar_csv(caminho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(CABECALHO)
        w.writerows(linhas)


def test_exportar_gera_uma_linha_por_nota(tmp_path):
    destino = tmp_path / "planilha.csv"
    assert exportar_planilha([resultado("a"), resultado("b")], destino) == 20
    linhas = list(csv.DictReader(destino.open(encoding="utf-8")))
    assert list(linhas[0].keys()) == list(CABECALHO) and linhas[0]["nota_humana"] == ""


def test_comparar_criterio_confiavel(tmp_path):
    difs = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    gravar_csv(tmp_path / "f.csv", [[f"p{i}", "concretude", 2, "x", 2 + d] for i, d in enumerate(difs)])
    r = comparar(tmp_path / "f.csv")["concretude"]
    assert r == {"n": 10, "erro_medio_abs": 0.2, "concordancia_exata": 0.8, "confiavel": True}


def test_comparar_poucos_perfis_nao_e_confiavel(tmp_path):
    gravar_csv(tmp_path / "f.csv", [[f"p{i}", "prova", 1, "x", 1] for i in range(9)])
    assert comparar(tmp_path / "f.csv")["prova"]["confiavel"] is False


def test_comparar_ignora_notas_vazias(tmp_path):
    gravar_csv(tmp_path / "f.csv", [["p1", "prova", 1, "x", ""], ["p2", "prova", "", "x", 2], ["p3", "prova", 1, "x", 1]])
    assert comparar(tmp_path / "f.csv")["prova"]["n"] == 1


def test_main_exportar_le_auditorias(tmp_path):
    save_json(tmp_path / "data" / "auditorias" / "ana" / "2026-10-16.json",
              {"cliente_id": "ana", "perfis": [resultado("ana", 3), resultado("rival", 3)]})
    saida = tmp_path / "planilha.csv"
    assert main(["exportar", "--data-dir", str(tmp_path), "--saida", str(saida)]) == 0
    assert len(list(csv.DictReader(saida.open(encoding="utf-8")))) == 6


def test_main_comparar_imprime_tabela(tmp_path, capsys):
    gravar_csv(tmp_path / "f.csv", [["p1", "prova", 1, "x", 1]])
    assert main(["comparar", "--csv", str(tmp_path / "f.csv")]) == 0
    assert "| prova |" in capsys.readouterr().out
