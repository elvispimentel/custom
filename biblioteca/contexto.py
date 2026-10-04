import time
from dataclasses import dataclass, field
from typing import Callable


class Orcamento:
    """Tempo máximo de execução, para parar com segurança antes do limite do job."""
    def __init__(self, minutos: float, relogio=time.monotonic):
        self.fim, self.relogio = relogio() + minutos * 60, relogio

    def esgotado(self) -> bool:
        return self.relogio() >= self.fim


@dataclass
class Contexto:
    cfg: object
    drive: object
    pdf: object
    estado: object
    orcamento: Orcamento
    salvar: Callable = lambda: None          # persiste o estado no Drive
    log: Callable = print
    ids: dict = field(default_factory=dict)  # biblioteca, pdfs, duplicados, controle
    controle: object = None                  # biblioteca.controle.Controle (relatórios e arquivos manuais)

    def excluidas(self) -> set:
        return {v for k, v in self.ids.items() if k != "biblioteca" and v}
