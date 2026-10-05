"""Põe scripts/ no sys.path para os testes rodarem de qualquer diretório
(na raiz do repo, o pytest.ini desta pasta não é lido pelo CI)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "scripts"))
