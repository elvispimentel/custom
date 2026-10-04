import csv
import io

import pytest
from pypdf import PdfReader

from biblioteca import cli
from biblioteca import duplicados as dup
from biblioteca import lotes as lt
from biblioteca.config import carregar
from biblioteca.inventario import inventariar
from biblioteca.pdflocal import PdfLocal
from .fakes import pdf_texto


def test_padrao_e_motor_local():
    assert carregar("nao-existe.yaml")["pdf"]["motor"] == "local"


def test_motor_invalido_e_rejeitado(monkeypatch):
    cfg = carregar("nao-existe.yaml")
    cfg.api_key, cfg.user_id = "k", "u"
    cfg.d["pdf"]["motor"] = "outro"
    with pytest.raises(cli.ConfigError):
        cli.servicos(cfg)


def test_cinquenta_documentos_em_um_unico_pdf_sem_limite_por_chamada(mundo):
    mundo.cfg.d["lotes"]["max_documentos"] = 50
    mundo.pdf = PdfLocal()
    livros = mundo.drive.pasta("Livros", mundo.lib)
    for n in range(1, 51):
        mundo.drive.arquivo(f"livro {n}.pdf", pdf_texto(2, f"liv{n}"), livros)
    import biblioteca.cli as c
    ctx, ctrl = c.preparar(mundo.cfg, None, mundo.drive, mundo.pdf, True, "r")
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    assert len(plano) == 1 and len(plano[0]["itens"]) == 50
    uso = lt.estimar_uso(ctx, plano)
    assert uso["chamadas_merge_ilovepdf"] == 0 and uso["chamadas_merge_total"] == 1   # sem créditos, 1 chamada
    assert lt.processar(ctx, plano)["concluidos"] == 1
    saida = next(f for f in mundo.drive.itens.values() if "_lote_" in f["name"])
    pdf = PdfReader(io.BytesIO(saida["dados"]))
    assert len(pdf.pages) == 100
    assert "liv1 pagina 1" in pdf.pages[0].extract_text() and "liv50 pagina 2" in pdf.pages[99].extract_text()
    marcadores = [m.title for m in pdf.outline]
    assert marcadores[0] == "livro 1" and marcadores[-1] == "livro 50" and len(marcadores) == 50
    linhas = list(csv.DictReader(io.StringIO(lt.indice_csv(ctx))))
    assert linhas[49]["pagina_inicial"] == "99" and linhas[49]["pagina_final"] == "100"


def test_merge_local_exige_dois_arquivos():
    with pytest.raises(ValueError):
        PdfLocal().juntar([("a.pdf", pdf_texto(1))], "x.pdf")
