"""Calibração: compara as notas da LLM com as notas que o Elvis dá à mão.

    python scripts/calibrar.py exportar --data-dir dados --saida planilha.csv
    (preencher a coluna nota_humana)
    python scripts/calibrar.py comparar --csv planilha.csv
"""
import argparse
import csv
import sys
from pathlib import Path

from storage import load_json

CABECALHO = ("handle", "criterio", "nota_llm", "evidencia", "nota_humana")
MIN_PERFIS = 10
MAX_ERRO = 0.5


def exportar_planilha(auditorias: list[dict], destino: Path) -> int:
    linhas = 0
    with open(destino, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(CABECALHO)
        for r in auditorias:
            for n in r["notas"]:
                w.writerow([r["handle"], n["id"], "" if n["nota"] is None else n["nota"], n["evidencia"], ""])
                linhas += 1
    return linhas


def comparar(csv_preenchido: Path) -> dict[str, dict]:
    pares: dict[str, list[tuple[int, int]]] = {}
    with open(csv_preenchido, newline="", encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            if not linha["nota_llm"].strip() or not linha["nota_humana"].strip():
                continue
            pares.setdefault(linha["criterio"], []).append((int(linha["nota_llm"]), int(linha["nota_humana"])))
    resultado = {}
    for criterio, lista in pares.items():
        n = len(lista)
        erro = round(sum(abs(a - b) for a, b in lista) / n, 2)
        resultado[criterio] = {
            "n": n,
            "erro_medio_abs": erro,
            "concordancia_exata": round(sum(1 for a, b in lista if a == b) / n, 2),
            "confiavel": n >= MIN_PERFIS and erro <= MAX_ERRO,
        }
    return resultado


def _auditorias(data_dir: Path) -> list[dict]:
    perfis: list[dict] = []
    for arquivo in sorted((Path(data_dir) / "data" / "auditorias").glob("*/*.json")):
        perfis.extend(load_json(arquivo, {}).get("perfis", []))
    return perfis


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="comando", required=True)
    exp = sub.add_parser("exportar")
    exp.add_argument("--data-dir", required=True)
    exp.add_argument("--saida", required=True)
    cmp_ = sub.add_parser("comparar")
    cmp_.add_argument("--csv", required=True)
    args = ap.parse_args(argv)

    if args.comando == "exportar":
        n = exportar_planilha(_auditorias(Path(args.data_dir)), Path(args.saida))
        print(f"{n} linhas em {args.saida}: preencha a coluna nota_humana.")
        return 0
    print("| Critério | n | Erro médio | Concordância exata | Confiável |")
    print("|---|---|---|---|---|")
    for criterio, r in sorted(comparar(Path(args.csv)).items()):
        print(f"| {criterio} | {r['n']} | {r['erro_medio_abs']} | {r['concordancia_exata']} | "
              f"{'sim' if r['confiavel'] else 'não'} |")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
