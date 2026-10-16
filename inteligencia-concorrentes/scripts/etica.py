"""Guardas de LGPD (art. 5º, II) e de copy ética, aplicados no código.

- `redigir_inferencias`: tira do relatório frases que atribuem dado sensível
  ao público. Fala do próprio criador sobre o tema do nicho fica intacta.
- `linter_copy`: aponta afirmações sobre atributos pessoais do leitor
  (proibidas pela Meta em anúncios) e escassez fabricada.
"""
import re
import unicodedata

# Termos sem acento e em minúsculas: a busca roda sobre o texto sem acento,
# para pegar também quem escreve "evangelico", "publico", "e".
SENSIVEIS: dict[str, tuple[str, ...]] = {
    "religiao": ("crista", "cristao", "evangelic", "espirita", "catolic", "umbanda", "candomble", "crente",
                 "ateu", "ateia", "judeu", "judia", "muculman"),
    "saude": ("depressao", "depressiv", "ansiedade", "cancer", "diagnostic", "transtorno", "tdah", "bipolar",
              "autis", "borderline", "hiv"),
    "sexualidade": ("gay", "lesbica", "bissexual", "orientacao sexual", "lgbt", "transexual", "transgenero"),
    "politica": ("esquerda", "direita", "bolsonarista", "petista", "lulista"),
}
MARCA_REMOVIDO = "[removido: inferência sensível sobre o público]"

# Só conta como inferência quando o público é o sujeito de uma atribuição
# ("seu público é…", "minhas pacientes têm…"); "atendo clientes com ansiedade" fica intacto.
_PUBLICO_E_VERBO = re.compile(
    r"\b(?:seguidor(?:es|as)?|publico|audiencia|leitor(?:es|as)?|clientes?|pacientes?|alun(?:os?|as?)"
    r"|sua base|galera que me segue|quem me segue)\b"
    r"(?:\s+\w+){0,2}?\s+(?P<verbo>e|sao|tem|parece|parecem|sofre|sofrem|esta|estao|vive|vivem)\b"
)
_ATRIBUTO = re.compile(r"\bvoce (?:que )?(?:e|esta|sofre)\b[^.!?\n]{0,40}")
_FRASE = re.compile(r"[^.!?\n]+[.!?]*")
# Urgência fabricada: só conta com sinal de prazo ou de "acabando".
# "Só hoje entendi…", "Abri 12 vagas" e "a dor acaba em você" não são escassez.
_ESCASSEZ = (
    re.compile(r"últimas vagas", re.IGNORECASE),
    re.compile(r"só hoje(?=\s*(?:[!.:,;—-]|$|até\b|para\b|pra\b|com\b))", re.IGNORECASE),
    re.compile(r"\bacaba (?:em \d+\s*(?:h\b|horas?|min\b|minutos?|dias?)|hoje|amanhã|à meia-noite)", re.IGNORECASE),
    re.compile(r"\bcorre\b[^.!?\n]*\bvaga", re.IGNORECASE),
    re.compile(r"\b(?:restam|apenas|somente|só)\s+\d+\s+vagas\b", re.IGNORECASE),
)


def _nfc(texto: str) -> str:
    return unicodedata.normalize("NFC", texto)


def _sem_acento(texto: str) -> str:
    """Minúsculas sem acento, com o mesmo comprimento do texto NFC (as posições batem)."""
    return "".join(
        unicodedata.normalize("NFD", c)[0] if unicodedata.normalize("NFD", c)[0].isascii() else c
        for c in _nfc(texto)
    ).lower()


def _categorias(texto: str) -> list[str]:
    sem = _sem_acento(texto)
    return [cat for cat, termos in SENSIVEIS.items()
            if any(re.search(r"(?<![a-z0-9_])" + re.escape(t), sem) for t in termos)]


def _atribui_ao_publico(frase: str) -> bool:
    sem = _sem_acento(frase)
    for m in _PUBLICO_E_VERBO.finditer(sem):
        if m.group("verbo") != "e":
            return True
        # "e" sem acento também é conjunção: só vale se o termo sensível vier logo depois.
        if _categorias(" ".join(re.findall(r"\w+", sem[m.end():])[:3])):
            return True
    return False


def redigir_inferencias(texto: str) -> tuple[str, list[str]]:
    texto = _nfc(texto)
    removidas: list[str] = []

    def trocar(m: re.Match) -> str:
        frase = m.group(0)
        cats = _categorias(frase)
        if cats and _atribui_ao_publico(frase):
            removidas.extend(c for c in cats if c not in removidas)
            espaco = frase[: len(frase) - len(frase.lstrip())]
            return espaco + MARCA_REMOVIDO
        return frase

    return _FRASE.sub(trocar, texto), removidas


def linter_copy(texto: str) -> list[dict]:
    texto = _nfc(texto)
    achados = [
        {"tipo": "atributo_pessoal", "trecho": texto[m.start():m.end()].strip()}
        for m in _ATRIBUTO.finditer(_sem_acento(texto))
        if _categorias(m.group(0))
    ]
    for padrao in _ESCASSEZ:
        achados.extend({"tipo": "escassez", "trecho": m.group(0)} for m in padrao.finditer(texto))
    return achados
