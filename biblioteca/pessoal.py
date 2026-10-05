"""Arquivos pessoais do dono da biblioteca: ficam juntos, num lugar só, para a biblioteca poder ser vendida sem eles.
São pessoais os arquivos cujo NOME tem o código de data e hora gerado pelo dono (ddmmaaaahhmm, ex.: 0510202615h21).
Nome do dono sem esse código NÃO torna o arquivo pessoal (pode haver nomes opcionais em pessoal.padroes)."""
import re
import unicodedata

# ddmmaaaa + hh + 'h' + mm   (ex.: 0510202615h21 = 05/10/2026 15h21)  |  variante invertida hh'h'mm + ddmmaaaa (17h3219052025)
_DIA, _MES, _ANO = r"(0[1-9]|[12]\d|3[01])", r"(0[1-9]|1[0-2])", r"(19|20)\d{2}"
_HORA, _MIN = r"([01]\d|2[0-3])", r"[0-5]\d"
CODIGO = re.compile(rf"(?<!\d)(?:{_DIA}{_MES}{_ANO}{_HORA}h{_MIN}|{_HORA}h{_MIN}{_DIA}{_MES}{_ANO})(?!\d)")


def _norm(t: str) -> str:
    return unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().casefold()


def _regex(padroes):
    partes = [r"\b" + r"[\W_]+".join(re.escape(p) for p in _norm(x).split()) + r"\b" for x in padroes if x.strip()]
    return re.compile("|".join(partes)) if partes else None


def casa(cfg, texto: str) -> bool:
    """Nomes opcionais em pessoal.padroes (vazio por padrão), como palavra inteira."""
    rx = _regex(cfg["pessoal"].get("padroes") or [])
    return bool(rx and rx.search(_norm(texto or "")))


def eh_pessoal_nome(cfg, nome: str) -> bool:
    if cfg["pessoal"].get("codigo_data_hora", True) and CODIGO.search(nome or ""):
        return True
    return casa(cfg, nome)


def eh_pessoal_caminho(cfg, caminho: str) -> bool:
    """Já está na pasta pessoal (ou numa pasta com um dos nomes opcionais)."""
    return (caminho or "").split("/")[0] == cfg["pessoal"]["pasta"] or casa(cfg, caminho)
