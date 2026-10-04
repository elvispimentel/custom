import json

import pytest

from biblioteca import cli
from biblioteca import organizar as org
from biblioteca.composio import Composio, ComposioError, DriveComposio, ILovePDFComposio
from biblioteca.controle import PastaAmbigua
from biblioteca.inventario import inventariar
from biblioteca.util import md5_bytes
from .fakes import FakeDrive


class Resp:
    def __init__(self, status=200, corpo=None, conteudo=b""):
        self.status_code, self._c, self.content, self.text = status, corpo, conteudo, json.dumps(corpo)

    def json(self):
        return self._c


class HttpFalso:
    def __init__(self):
        self.reqs, self.fila, self.puts, self.gets = [], {}, [], {}

    def request(self, metodo, url, headers=None, json=None, params=None, timeout=None):
        self.reqs.append((metodo, url, headers, json, params))
        saida = self.fila[url.split(".dev")[1]]
        return saida.pop(0) if isinstance(saida, list) else saida

    def put(self, url, data=None, headers=None, timeout=None):
        self.puts.append((url, data, headers))
        return Resp(200)

    def get(self, url, timeout=None):
        return Resp(200, conteudo=self.gets[url])


def cliente(http):
    return Composio("CHAVE", "usuario1", versao="latest", contas={"googledrive": "ca_123"}, http=http, dormir=lambda s: None)


def test_execute_usa_endpoint_user_id_versao_e_conta():
    h = HttpFalso()
    h.fila["/api/v3.1/tools/execute/GOOGLEDRIVE_FIND_FILE"] = Resp(200, {"successful": True, "data": {"files": []}})
    c = cliente(h)
    c.executar("GOOGLEDRIVE_FIND_FILE", {"folder_id": "abc"}, "googledrive")
    metodo, url, hdr, corpo, _ = h.reqs[0]
    assert (metodo, hdr["x-api-key"]) == ("POST", "CHAVE")
    assert corpo == {"user_id": "usuario1", "arguments": {"folder_id": "abc"}, "version": "latest",
                     "connected_account_id": "ca_123"}


def test_erro_da_ferramenta_vira_excecao_e_429_tem_retry():
    h = HttpFalso()
    h.fila["/api/v3.1/tools/execute/X"] = [Resp(429, {}), Resp(200, {"successful": False, "error": "boom"})]
    with pytest.raises(ComposioError, match="boom"):
        cliente(h).executar("X", {})
    assert len(h.reqs) == 2


def test_upload_formato_s3key_e_content_type():
    h = HttpFalso()
    h.fila["/api/v3.1/files/upload/request"] = Resp(200, {"key": "proj/req/a.pdf", "new_presigned_url": "https://s3/x"})
    dados = b"%PDF-conteudo"
    ref = cliente(h).enviar_arquivo(dados, "a.pdf", "application/pdf", "I_LOVE_PDF_MERGE_PDFS", "i_love_pdf")
    assert ref == {"name": "a.pdf", "mimetype": "application/pdf", "s3key": "proj/req/a.pdf"}
    assert h.reqs[0][3] == {"filename": "a.pdf", "md5": md5_bytes(dados), "mimetype": "application/pdf",
                            "tool_slug": "I_LOVE_PDF_MERGE_PDFS", "toolkit_slug": "i_love_pdf"}
    assert h.puts == [("https://s3/x", dados, {"Content-Type": "application/pdf"})]


def test_listagem_pagina_ate_o_fim():
    h = HttpFalso()
    f = lambda i: {"id": f"i{i}", "name": f"n{i}", "mimeType": "application/pdf", "size": "10"}
    h.fila["/api/v3.1/tools/execute/GOOGLEDRIVE_FIND_FILE"] = [
        Resp(200, {"successful": True, "data": {"files": [f(1), f(2)], "nextPageToken": "T2"}}),
        Resp(200, {"successful": True, "data": {"files": [f(3)]}})]
    itens = list(DriveComposio(cliente(h)).listar("pasta"))
    assert [i["id"] for i in itens] == ["i1", "i2", "i3"]
    assert h.reqs[1][3]["arguments"]["pageToken"] == "T2"
    assert h.reqs[0][3]["arguments"]["fields"].count("md5Checksum") == 1


def test_arquivo_grande_usa_upload_resumivel_e_pequeno_o_simples():
    h = HttpFalso()
    h.fila["/api/v3.1/files/upload/request"] = Resp(200, {"key": "k", "new_presigned_url": "https://s3/x"})
    h.fila["/api/v3.1/tools/execute/GOOGLEDRIVE_UPLOAD_FILE"] = Resp(200, {"successful": True, "data": {"id": "N1"}})
    h.fila["/api/v3.1/tools/execute/GOOGLEDRIVE_RESUMABLE_UPLOAD"] = Resp(200, {"successful": True, "data": {"id": "N2"}})
    d = DriveComposio(cliente(h))
    assert d.enviar("p.pdf", b"x" * 10, "pasta") == "N1"
    assert d.enviar("g.pdf", b"x" * (5 * 1024 * 1024), "pasta") == "N2"
    assert d.enviar("estado.db", b"x", "pasta", atualizar_id="F9") == "N2"
    ultimo = h.reqs[-1][3]["arguments"]
    assert ultimo["file_id"] == "F9" and "folder_to_upload_to" not in ultimo


def test_merge_ilovepdf_envia_refs_s3key_e_respeita_limite():
    h = HttpFalso()
    h.fila["/api/v3.1/files/upload/request"] = Resp(200, {"key": "k", "new_presigned_url": "https://s3/x"})
    h.fila["/api/v3.1/tools/execute/I_LOVE_PDF_MERGE_PDFS"] = Resp(200, {"successful": True, "data": {
        "file": {"name": "m.pdf", "mimetype": "application/pdf", "s3url": "https://dl/m"}}})
    h.gets["https://dl/m"] = b"%PDF-merged"
    svc = ILovePDFComposio(cliente(h), 20)
    assert svc.juntar([("a.pdf", b"a"), ("b.pdf", b"b")], "m.pdf") == b"%PDF-merged"
    args = [r for r in h.reqs if "MERGE" in r[1]][0][3]["arguments"]
    assert all(set(x) == {"name", "mimetype", "s3key"} for x in args["files"]) and len(args["files"]) == 2
    with pytest.raises(ValueError):
        svc.juntar([(f"{i}.pdf", b"x") for i in range(21)], "m.pdf")


def test_localizar_ambiguo_nao_escolhe(mundo, capsys):
    mundo.drive.pasta("Biblioteca Pessoal", mundo.drive.raiz)     # segunda com o mesmo nome
    assert cli.cmd_localizar(mundo.cfg, mundo.drive) == 3
    assert capsys.readouterr().out.count("ID `") == 2


def test_localizar_unica_pede_confirmacao(mundo, capsys):
    assert cli.cmd_localizar(mundo.cfg, mundo.drive) == 0
    assert mundo.lib in capsys.readouterr().out


def test_pasta_de_saida_ambigua_nao_escolhe(mundo):
    mundo.drive.pasta(mundo.cfg["pastas_saida"]["pdfs_nome"], mundo.drive.raiz)
    mundo.drive.pasta(mundo.cfg["pastas_saida"]["pdfs_nome"], mundo.drive.raiz)
    with pytest.raises(PastaAmbigua):
        mundo.abrir(saidas=True)


def test_classificacao_manual_vence_regras(mundo):
    d = mundo.drive
    alvo = d.arquivo("Carl Jung - Livro A.pdf", b"1" * 50, mundo.lib)
    ctx = mundo.abrir()
    ctx.cfg.d["organizacao"]["temas"] = {"Psicologia": ["jung"]}
    d.arquivo("classificacao_manual.csv", f"id_drive,tema,autor\n{alvo},Cabala,Autor Manual\n".encode(),
              ctx.ids["controle"], mime="text/csv")
    inventariar(ctx)
    from biblioteca import duplicados as dup
    dup.detectar(ctx)
    (p,) = org.planejar_temas(ctx)
    assert (p["tema"], p["autor"], p["fonte"], p["destino"]) == ("Cabala", "Autor Manual", "manual", "Cabala/Autor Manual")
