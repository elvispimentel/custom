"""Drive e iLovePDF falsos em memória, com os mesmos contratos dos adaptadores reais."""
import io
import itertools
from datetime import datetime, timedelta, timezone

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas

from biblioteca.composio import ATALHO, PASTA
from biblioteca.util import md5_bytes

ANTIGO = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()


def pdf_texto(paginas=3, marca="x") -> bytes:
    b = io.BytesIO()
    c = canvas.Canvas(b)
    for i in range(paginas):
        c.drawString(72, 700, f"{marca} pagina {i + 1} " + "palavra " * 120)
        c.showPage()
    c.save()
    return b.getvalue()


def pdf_digitalizado(paginas=2) -> bytes:
    w = PdfWriter()
    for _ in range(paginas):
        w.add_blank_page(200, 200)
    b = io.BytesIO()
    w.write(b)
    return b.getvalue()


def pdf_protegido() -> bytes:
    w = PdfWriter()
    w.append(PdfReader(io.BytesIO(pdf_texto(2, "seg"))))
    w.encrypt("segredo")
    b = io.BytesIO()
    w.write(b)
    return b.getvalue()


class FalhaPermissao(Exception):
    pass


class FakeDrive:
    def __init__(self):
        self.n = itertools.count(1)
        self.itens = {}
        self.chamadas = {}
        self.negar_mover = set()
        self.falhar_apos_movimentos = None
        self.movimentos_feitos = 0
        self.raiz = self.pasta("raiz", None)

    def _id(self):
        return f"id{next(self.n):05d}"

    def pasta(self, nome, pai):
        i = self._id()
        self.itens[i] = dict(id=i, name=nome, mimeType=PASTA, size=None, md5=None, parents=[pai] if pai else [],
                             created=ANTIGO, modified=ANTIGO, shortcut_target=None, dados=None, lixeira=False)
        return i

    def arquivo(self, nome, dados, pai, mime="application/pdf", criado=ANTIGO, modificado=ANTIGO):
        i = self._id()
        self.itens[i] = dict(id=i, name=nome, mimeType=mime, size=len(dados), md5=md5_bytes(dados), parents=[pai],
                             created=criado, modified=modificado, shortcut_target=None, dados=dados, lixeira=False)
        return i

    def atalho(self, nome, alvo, pai):
        i = self._id()
        self.itens[i] = dict(id=i, name=nome, mimeType=ATALHO, size=None, md5=None, parents=[pai], created=ANTIGO,
                             modified=ANTIGO, shortcut_target=alvo, dados=None, lixeira=False)
        return i

    def _c(self, k):
        self.chamadas[k] = self.chamadas.get(k, 0) + 1

    @staticmethod
    def _vis(f):
        return {k: v for k, v in f.items() if k not in ("dados", "lixeira")}

    def listar(self, pasta_id):
        self._c("listar")
        # simula paginação: materializa tudo (o adaptador real pagina até o fim)
        return iter([self._vis(f) for f in list(self.itens.values()) if pasta_id in f["parents"] and not f["lixeira"]])

    def achar_pastas(self, nome, pai_id=None):
        self._c("achar_pastas")
        return [self._vis(f) for f in self.itens.values() if f["mimeType"] == PASTA and f["name"] == nome
                and (pai_id is None or pai_id in f["parents"])]

    def metadados(self, fid):
        self._c("metadados")
        return self._vis(self.itens[fid])

    def baixar(self, fid):
        self._c("baixar")
        return self.itens[fid]["dados"]

    def criar_pasta(self, nome, pai_id=None):
        self._c("criar_pasta")
        return self.pasta(nome, pai_id or self.raiz)

    def mover(self, fid, destino, origens):
        self._c("mover")
        if fid in self.negar_mover:
            raise FalhaPermissao("sem permissão para mover")
        if self.falhar_apos_movimentos is not None and self.movimentos_feitos >= self.falhar_apos_movimentos:
            raise RuntimeError("queda simulada")
        f = self.itens[fid]
        f["parents"] = [p for p in f["parents"] if p not in origens] + [destino]
        self.movimentos_feitos += 1

    def enviar(self, nome, dados, pasta_id, mimetype="application/pdf", atualizar_id=None):
        self._c("enviar")
        if atualizar_id:
            f = self.itens[atualizar_id]
            f.update(dados=dados, size=len(dados), md5=md5_bytes(dados))
            return atualizar_id
        return self.arquivo(nome, dados, pasta_id, mimetype)

    def na_pasta(self, pasta_id):
        return sorted(f["name"] for f in self.itens.values() if pasta_id in f["parents"])


class FakeILovePDF:
    def __init__(self, max_arquivos=20, creditos=1000):
        self.max = self.max_arquivos = max_arquivos
        self.creditos = creditos
        self.consome_creditos = True
        self.chamadas = []   # lista de listas de nomes, na ordem

    def conta(self):
        return {"type": "free", "remaining_credits": self.creditos, "remaining_files": 10000}

    def juntar(self, arquivos, nome_saida):
        assert 2 <= len(arquivos) <= self.max, f"limite real violado: {len(arquivos)}"
        self.chamadas.append([n for n, _ in arquivos])
        w = PdfWriter()
        for _, b in arquivos:
            w.append(PdfReader(io.BytesIO(b)))
        out = io.BytesIO()
        w.write(out)
        return out.getvalue()
