"""Guardas de LGPD (art. 5º, II) e de copy ética, aplicados no código.

- `redigir_inferencias`: tira do relatório frases que atribuem dado sensível
  ao público. Fala do próprio criador sobre o tema do nicho fica intacta.
- `linter_copy`: aponta afirmações sobre atributos pessoais do leitor
  (proibidas pela Meta em anúncios) e escassez fabricada.
"""
import re
import unicodedata

SENSIVEIS: dict[str, tuple[str, ...]] = {
    "religiao": ("cristã", "cristão", "evangélic", "espírita", "católic", "umbanda", "candomblé", "crente"),
    "saude": ("depressão", "depressiv", "ansiedade", "câncer", "diagnóstico", "transtorno"),
    "sexualidade": ("gay", "lésbica", "bissexual", "orientação sexual"),
    "politica": ("esquerda", "direita", "bolsonarista", "petista"),
}
MARCA_REMOVIDO = "[removido: inferência sensível sobre o público]"

# Só conta como inferência quando o público é o sujeito de uma atribuição
# ("seu público é…", "os seguidores parecem…"); "atendo clientes com ansiedade" fica intacto.
_ATRIBUICAO_AO_PUBLICO = re.compile(
    r"\b(?:seguidor(?:es|as)?|público|audiência|leitor(?:es|as)?|clientes?|sua base)\b"
    r"(?:\s+[\wÀ-ÿ]+){0,2}?\s+(?:é|são|tem|têm|parece|parecem|sofre|sofrem|está|estão|vive|vivem)\b",
    re.IGNORECASE,
)
_FRASE = re.compile(r"[^.!?\n]+[.!?]*")
_ATRIBUTO = re.compile(r"\bvocê (?:que )?(?:é|está|sofre)\b[^.!?\n]{0,40}", re.IGNORECASE)
_ESCASSEZ = (
    re.compile(r"últimas vagas", re.IGNORECASE),
    re.compile(r"só hoje", re.IGNORECASE),
    re.compile(r"acaba em", re.IGNORECASE),
    re.compile(r"\bcorre\b[^.!?\n]*\bvaga", re.IGNORECASE),
    re.compile(r"\b\d+ vagas\b", re.IGNORECASE),
)


def _nfc(texto: str) -> str:
    return unicodedata.normalize("NFC", texto)


def _categorias(texto: str) -> list[str]:
    baixo = texto.lower()
    return [cat for cat, termos in SENSIVEIS.items()
            if any(re.search(r"(?<![\wÀ-ÿ])" + re.escape(t), baixo) for t in termos)]


def redigir_inferencias(texto: str) -> tuple[str, list[str]]:
    texto = _nfc(texto)
    removidas: list[str] = []

    def trocar(m: re.Match) -> str:
        frase = m.group(0)
        cats = _categorias(frase)
        if cats and _ATRIBUICAO_AO_PUBLICO.search(frase):
            removidas.extend(c for c in cats if c not in removidas)
            espaco = frase[: len(frase) - len(frase.lstrip())]
            return espaco + MARCA_REMOVIDO
        return frase

    return _FRASE.sub(trocar, texto), removidas


def linter_copy(texto: str) -> list[dict]:
    texto = _nfc(texto)
    achados = [
        {"tipo": "atributo_pessoal", "trecho": m.group(0).strip()}
        for m in _ATRIBUTO.finditer(texto)
        if _categorias(m.group(0))
    ]
    for padrao in _ESCASSEZ:
        achados.extend({"tipo": "escassez", "trecho": m.group(0)} for m in padrao.finditer(texto))
    return achados
