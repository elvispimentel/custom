import hashlib
import re
from datetime import datetime, timezone

_NAT = re.compile(r"(\d+)")


def natural_key(texto: str):
    """Ordem natural: 'cap2' < 'cap10'; insensível a maiúsculas e acentos básicos."""
    import unicodedata
    base = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return [int(p) if p.isdigit() else p for p in _NAT.split(base)] + [texto]


def sha256_bytes(dados: bytes) -> str:
    return hashlib.sha256(dados).hexdigest()


def md5_bytes(dados: bytes) -> str:
    return hashlib.md5(dados, usedforsecurity=False).hexdigest()


def agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_data(valor: str | None) -> datetime:
    if not valor:
        return datetime.fromtimestamp(0, timezone.utc)
    return datetime.fromisoformat(valor.replace("Z", "+00:00"))


def humano(n: int | float) -> str:
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024 or u == "GB":
            return f"{n:.1f} {u}" if u != "B" else f"{int(n)} B"
        n /= 1024


def nome_seguro(nome: str) -> str:
    return re.sub(r'[\\/:*?"<>|]+', "_", nome).strip() or "sem_nome"
