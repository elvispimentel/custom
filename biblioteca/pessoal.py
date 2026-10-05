"""Arquivos pessoais do dono da biblioteca (o nome dele no arquivo ou na pasta).
Ficam juntos, num lugar só, para a biblioteca poder ser vendida sem eles."""
import re
import unicodedata


def _norm(t: str) -> str:
    return unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().casefold()


def _regex(padroes):
    partes = [r"\b" + r"[\W_]+".join(re.escape(p) for p in _norm(x).split()) + r"\b" for x in padroes if x.strip()]
    return re.compile("|".join(partes)) if partes else None


def casa(cfg, texto: str) -> bool:
    """O texto contém o nome do dono como palavra inteira ('Elvis Pimentel', 'elvis-pimentel'; NÃO 'Elvish')."""
    rx = _regex(cfg["pessoal"]["padroes"])
    return bool(rx and rx.search(_norm(texto or "")))


def eh_pessoal_nome(cfg, nome: str) -> bool:
    return casa(cfg, nome)


def eh_pessoal_caminho(cfg, caminho: str) -> bool:
    return casa(cfg, caminho) or (caminho or "").split("/")[0] == cfg["pessoal"]["pasta"]
