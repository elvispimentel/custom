"""Cartão do cliente de alma: o alvo contra o qual o perfil é auditado.

Escrito à mão a partir do Briefing de Transição e aprovado pelo cliente
(`"aprovado": true`) antes de qualquer nota ser calculada.
"""
import json
from pathlib import Path

OBRIGATORIOS = (
    "identidade",
    "proposito",
    "cliente_de_alma",
    "mecanismo_unico",
    "limites_inegociaveis",
    "objetivo_negocio",
)
VOZ_LISTAS = ("dores", "progresso_desejado", "objecoes", "frases_exatas", "metaforas")


class CartaoInvalido(Exception):
    """Cartão incompleto, malformado ou ainda não aprovado pelo cliente."""


def _lista_de_textos(valor) -> bool:
    return isinstance(valor, list) and all(isinstance(x, str) for x in valor)


def load_cartao(path: Path) -> dict:
    try:
        cartao = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise CartaoInvalido(f"cartão ilegível: {e}") from e
    if not isinstance(cartao, dict):
        raise CartaoInvalido("cartão precisa ser um objeto JSON")
    faltando = [k for k in OBRIGATORIOS if not cartao.get(k)]
    if faltando:
        raise CartaoInvalido(f"cartão sem: {', '.join(faltando)}")
    if cartao.get("aprovado") is not True:
        raise CartaoInvalido("cartão não aprovado pelo cliente")
    voz = cartao.get("voz_do_cliente")
    if voz is not None:
        if not isinstance(voz, dict):
            raise CartaoInvalido("voz_do_cliente precisa ser um objeto")
        ruins = [k for k in VOZ_LISTAS if k in voz and not _lista_de_textos(voz[k])]
        if "tom" in voz and not isinstance(voz["tom"], str):
            ruins.append("tom")
        if ruins:
            raise CartaoInvalido(f"voz_do_cliente com tipo errado: {', '.join(ruins)}")
    return cartao
