import json

import pytest

from biblioteca import cli
from biblioteca import organizar as org
from biblioteca.composio import Composio, ComposioError, DriveComposio, ILovePDFComposio
from biblioteca.config import carregar
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


# ---------- conectar (Connect Link) ----------
def cli_conectar(h, forcar=False):
    cfg = carregar("nao-existe.yaml")
    c = cliente(h)
    return cli.cmd_conectar(cfg, c, forcar), c


def resposta_contas(itens):
    return Resp(200, {"items": itens})


def test_conectar_cria_auth_config_gerenciada_e_gera_link(capsys):
    h = HttpFalso()
    h.fila["/api/v3.1/connected_accounts"] = resposta_contas([])
    h.fila["/api/v3.1/auth_configs"] = [Resp(200, {"items": []}), Resp(200, {"auth_config": {"id": "ac_novo"}})]
    h.fila["/api/v3.1/connected_accounts/link"] = Resp(200, {
        "redirect_url": "https://connect.composio.dev/link/lk_x", "connected_account_id": "ca_1", "expires_at": "2026-10-04T19:00:00Z"})
    rc, _ = cli_conectar(h)
    assert rc == 0 and "https://connect.composio.dev/link/lk_x" in capsys.readouterr().out
    posts = [r for r in h.reqs if r[0] == "POST"]
    assert posts[0][3] == {"toolkit": {"slug": "googledrive"}, "auth_config": {"type": "use_composio_managed_auth"}}
    assert posts[1][3] == {"auth_config_id": "ac_novo", "user_id": "usuario1"}


def test_conectar_reaproveita_auth_config_existente():
    h = HttpFalso()
    h.fila["/api/v3.1/connected_accounts"] = resposta_contas([])
    h.fila["/api/v3.1/auth_configs"] = Resp(200, {"items": [
        {"id": "ac_1", "status": "ENABLED", "is_composio_managed": True},
        {"id": "ac_off", "status": "DISABLED", "is_composio_managed": True},
        {"id": "ac_meu", "status": "ENABLED", "is_composio_managed": False}]})
    h.fila["/api/v3.1/connected_accounts/link"] = Resp(200, {"redirect_url": "https://x/y", "connected_account_id": "c", "expires_at": "e"})
    cli_conectar(h)
    assert [r for r in h.reqs if r[0] == "POST"][0][3]["auth_config_id"] == "ac_1"      # nenhuma criada


def test_conectar_ambiguo_nao_escolhe():
    h = HttpFalso()
    h.fila["/api/v3.1/connected_accounts"] = resposta_contas([])
    h.fila["/api/v3.1/auth_configs"] = Resp(200, {"items": [
        {"id": "ac_1", "status": "ENABLED", "is_composio_managed": True},
        {"id": "ac_2", "status": "ENABLED", "is_composio_managed": True}]})
    with pytest.raises(ComposioError, match="mais de uma auth config"):
        cli_conectar(h)
    assert not [r for r in h.reqs if r[0] == "POST"]


def test_conectar_nao_gera_link_se_ja_ha_conta_ativa(capsys):
    h = HttpFalso()
    h.fila["/api/v3.1/connected_accounts"] = resposta_contas([{"id": "ca_9", "user_info": {"user": {"emailAddress": "eu@exemplo.com"}}}])
    rc, _ = cli_conectar(h)
    assert rc == 0 and "eu@exemplo.com" in capsys.readouterr().out
    assert [r for r in h.reqs if r[0] == "POST"] == []


# ---------- robustez do envio ----------
class HttpPutInstavel(HttpFalso):
    def __init__(self, falhas, status_final=200):
        super().__init__()
        self.falhas, self.status_final, self.tentativas, self.timeouts = falhas, status_final, 0, []

    def put(self, url, data=None, headers=None, timeout=None):
        import requests
        self.tentativas += 1
        self.timeouts.append(timeout)
        if self.tentativas <= self.falhas:
            raise requests.exceptions.ConnectionError("The write operation timed out")
        return Resp(self.status_final)


def test_envio_tenta_de_novo_e_usa_timeout_unico_longo():
    h = HttpPutInstavel(falhas=2)
    h.fila["/api/v3.1/files/upload/request"] = Resp(200, {"key": "k", "new_presigned_url": "https://s3/x"})
    ref = cliente(h).enviar_arquivo(b"dados", "a.pdf", "application/pdf", "T", "tk")
    assert ref["s3key"] == "k" and h.tentativas == 3
    assert all(t == 600 for t in h.timeouts)          # número único: o envio do corpo também usa este timeout


def test_envio_desiste_apos_tres_falhas():
    h = HttpPutInstavel(falhas=9)
    h.fila["/api/v3.1/files/upload/request"] = Resp(200, {"key": "k", "new_presigned_url": "https://s3/x"})
    with pytest.raises(ComposioError, match="upload para armazenamento falhou"):
        cliente(h).enviar_arquivo(b"dados", "a.pdf", "application/pdf", "T", "tk")
    assert h.tentativas == 3


def test_envio_resumivel_le_id_em_file_ou_usa_o_id_conhecido():
    h = HttpFalso()
    h.fila["/api/v3.1/files/upload/request"] = Resp(200, {"key": "k", "new_presigned_url": "https://s3/x"})
    h.fila["/api/v3.1/tools/execute/GOOGLEDRIVE_RESUMABLE_UPLOAD"] = [
        Resp(200, {"successful": True, "data": {"display_url": "u", "file": {"id": "ID_EM_FILE"}, "sessionUri": "s"}}),
        Resp(200, {"successful": True, "data": {"display_url": "u", "file": {}, "link_label": "l", "sessionUri": "s"}})]
    d = DriveComposio(cliente(h))
    assert d.enviar("g.pdf", b"x" * (5 * 1024 * 1024), "pasta") == "ID_EM_FILE"          # criação: id em 'file'
    assert d.enviar("estado.db", b"x", "pasta", atualizar_id="F9") == "F9"                # atualização: id conhecido


def test_cota_do_google_espera_e_repete_mesmo_sem_repetir():
    h = HttpFalso()
    cota = Resp(200, {"successful": False, "error": "403 Quota exceeded ... rateLimitExceeded"})
    h.fila["/api/v3.1/tools/execute/GOOGLEDRIVE_MOVE_FILE"] = [cota, cota, Resp(200, {"successful": True, "data": {"id": "x"}})]
    esperas = []
    c = cliente(h)
    c.dormir = esperas.append
    assert c.executar("GOOGLEDRIVE_MOVE_FILE", {}, repetir=False) == {"id": "x"}
    assert esperas == [15, 30] and len(h.reqs) == 3


def test_cota_persistente_acaba_em_erro():
    h = HttpFalso()
    h.fila["/api/v3.1/tools/execute/X"] = Resp(200, {"successful": False, "error": "rateLimitExceeded"})
    with pytest.raises(ComposioError, match="rateLimitExceeded"):
        cliente(h).executar("X", {})
    assert len(h.reqs) == 7
