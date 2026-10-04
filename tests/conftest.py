import pytest

from biblioteca import cli
from biblioteca.config import carregar
from .fakes import FakeDrive, FakeILovePDF


@pytest.fixture
def mundo(tmp_path, monkeypatch):
    drive = FakeDrive()
    lib = drive.pasta("Biblioteca Pessoal", drive.raiz)
    pdf = FakeILovePDF()
    monkeypatch.setenv("BIBLIOTECA_ID", lib)
    cfg = carregar(str(tmp_path / "inexistente.yaml"))
    cfg.d["execucao"]["pasta_trabalho"] = str(tmp_path / "trabalho")

    class M:
        pass
    m = M()
    m.drive, m.pdf, m.lib, m.cfg, m.tmp = drive, pdf, lib, cfg, tmp_path

    def abrir(saidas=True, run="run1"):
        ctx, ctrl = cli.preparar(cfg, None, drive, pdf, saidas, run)
        m.ctrl = ctrl
        return ctx
    m.abrir = abrir
    return m
