import argparse
import csv
import io

from biblioteca import cli
from biblioteca.composio import Composio
from .fakes import FakeDrive, pdf_texto


def args(cmd, **kw):
    base = dict(comando=cmd, max_lotes=0, com_lotes=False, tipo="duplicado", config=None)
    base.update(kw)
    return argparse.Namespace(**base)


def le_csv(mundo, ctx, nome):
    arq = [f for f in mundo.drive.itens.values() if f["name"] == nome and ctx.ids["controle"] in f["parents"]]
    assert len(arq) == 1, nome
    return list(csv.DictReader(io.StringIO(arq[0]["dados"].decode("utf-8"))))


def test_comandos_de_ponta_a_ponta_e_relatorios_no_drive(mundo, capsys):
    d = mundo.drive
    a, b = d.pasta("A", mundo.lib), d.pasta("B", mundo.lib)
    p = pdf_texto(2, "mesmo")
    d.arquivo("Autor Um - Livro 2.pdf", p, a, criado="2024-01-01T00:00:00+00:00")
    d.arquivo("copia.pdf", p, b, criado="2024-06-01T00:00:00+00:00")
    d.arquivo("Autor Um - Livro 10.pdf", pdf_texto(3, "dez"), a)
    c = Composio("k", "u")   # só para o contador de chamadas
    ctx = mundo.abrir(saidas=False)
    cli.rodar(ctx, args("simular"), c)
    assert d.chamadas.get("mover", 0) == 0 and not ctx.ids["pdfs"] and not ctx.ids["duplicados"]
    sim = capsys.readouterr().out
    assert "MANTER" in sim and "mover para revisão" in sim
    assert len(le_csv(mundo, ctx, "inventario.csv")) == 3
    mundo.ctrl.liberar_trava()

    ctx = mundo.abrir(saidas=True, run="r2")
    cli.rodar(ctx, args("mover-duplicados"), c)
    dups = le_csv(mundo, ctx, "relatorio_duplicados.csv")
    assert {r["papel"] for r in dups} == {"exemplar", "duplicado"} and any(r["movimento"] == "done" for r in dups)
    assert len(le_csv(mundo, ctx, "historico_movimentacoes.csv")) == 1
    mundo.ctrl.liberar_trava()

    ctx = mundo.abrir(saidas=True, run="r3")
    cli.rodar(ctx, args("testar-lote"), c)
    indice = le_csv(mundo, ctx, "indice_pdfs.csv")
    assert [r["arquivo_original"] for r in indice] == ["Autor Um - Livro 2.pdf", "Autor Um - Livro 10.pdf"]  # natural
    assert indice[0]["pagina_inicial"] == "1" and indice[1]["pagina_final"] == "5"
    mundo.ctrl.liberar_trava()

    ctx = mundo.abrir(saidas=True, run="r4")
    antes = len(mundo.pdf.chamadas)
    cli.rodar(ctx, args("retomar"), c)
    assert len(mundo.pdf.chamadas) == antes                      # nada refeito
    cli.rodar(ctx, args("simular-temas"), c)
    assert len(le_csv(mundo, ctx, "plano_temas.csv")) == 2       # só os dois únicos; a cópia fica fora
    cli.rodar(ctx, args("status"), c)
