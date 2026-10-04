"""Pasta de controle no Drive: estado.db, relatórios e trava de execução."""
import json
import time
from pathlib import Path

from .state import Estado
from .util import agora, parse_data

TRAVA = "TRAVA.json"
ESTADO = "estado.db"
TTL_TRAVA_MIN = 360   # um job do GitHub Actions dura no máximo 6 h


class BibliotecaOcupada(Exception):
    pass


class PastaAmbigua(Exception):
    def __init__(self, nome, opcoes):
        self.nome, self.opcoes = nome, opcoes
        super().__init__(f"Há {len(opcoes)} pastas chamadas '{nome}'. Escolha uma e informe o ID.")


def achar_ou_criar_pasta(drive, nome, pai_id, id_configurado=""):
    """Nunca escolhe em silêncio: 0 -> cria; 1 -> usa; >1 -> PastaAmbigua."""
    if id_configurado:
        return id_configurado
    achadas = drive.achar_pastas(nome, pai_id or None)
    if len(achadas) > 1:
        raise PastaAmbigua(nome, achadas)
    return achadas[0]["id"] if achadas else drive.criar_pasta(nome, pai_id or None)


class Controle:
    def __init__(self, drive, pasta_id, trabalho: Path, run_id="local"):
        self.drive, self.pasta, self.trabalho, self.run_id = drive, pasta_id, Path(trabalho), run_id
        self.trabalho.mkdir(parents=True, exist_ok=True)
        self._ids: dict[str, str] = {}

    def _achar(self, nome):
        itens = [i for i in self.drive.listar(self.pasta) if i["name"] == nome and i["mimeType"] != "application/vnd.google-apps.folder"]
        if len(itens) > 1:
            raise RuntimeError(f"Mais de um '{nome}' na pasta de controle; remova os extras manualmente.")
        return itens[0] if itens else None

    def adquirir_trava(self):
        t = self._achar(TRAVA)
        if t:
            conteudo = json.loads(self.drive.baixar(t["id"]).decode() or "{}")
            if conteudo.get("ocupada") and conteudo.get("run") != self.run_id:
                idade = (time.time() - parse_data(conteudo.get("desde")).timestamp()) / 60
                if idade < TTL_TRAVA_MIN:
                    raise BibliotecaOcupada(f"Execução '{conteudo.get('run')}' em andamento há {idade:.0f} min.")
        self._gravar(TRAVA, json.dumps({"ocupada": True, "run": self.run_id, "desde": agora()}).encode(),
                     "application/json")

    def liberar_trava(self):
        self._gravar(TRAVA, json.dumps({"ocupada": False, "run": self.run_id, "em": agora()}).encode(),
                     "application/json")

    def _gravar(self, nome, dados, mime):
        existente = self._achar(nome)
        if existente:
            self.drive.enviar(nome, dados, self.pasta, mime, atualizar_id=existente["id"])
        else:
            self.drive.enviar(nome, dados, self.pasta, mime)

    def abrir_estado(self) -> Estado:
        e = self._achar(ESTADO)
        caminho = self.trabalho / ESTADO
        if e:
            caminho.write_bytes(self.drive.baixar(e["id"]))
        return Estado(caminho)

    def salvar_estado(self, estado: Estado):
        estado.db.commit()
        estado.db.execute("PRAGMA wal_checkpoint(FULL)")
        self._gravar(ESTADO, estado.caminho.read_bytes(), "application/octet-stream")

    def salvar_relatorio(self, nome, texto: str, mime="text/csv"):
        self._gravar(nome, texto.encode("utf-8"), mime)
