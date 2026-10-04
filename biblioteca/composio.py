"""Cliente mínimo do Composio (API REST v3.1) + adaptadores do Google Drive e do iLovePDF.

Esquemas usados (obtidos das ferramentas reais, não presumidos):
  - POST /api/v3.1/tools/execute/{slug}   corpo: user_id, arguments, version, connected_account_id
  - POST /api/v3.1/files/upload/request   corpo: filename, md5(hex), mimetype, tool_slug, toolkit_slug
        -> {key, new_presigned_url}; envio por PUT com Content-Type = mimetype; a 'key' vira 's3key'.
  - Saídas de arquivo vêm como {name, mimetype, s3url}; o download é um GET simples no s3url.
  - Entradas de arquivo exigem {name, mimetype, s3key}. URL do Drive NÃO é aceita como arquivo.
"""
import time
from collections import Counter

import requests

from .util import md5_bytes

LIMITE_UPLOAD_SIMPLES = 4 * 1024 * 1024   # UPLOAD_FILE aceita no máximo 5 MB; acima usa-se RESUMABLE_UPLOAD
CAMPOS_ARQUIVO = ("nextPageToken,incompleteSearch,files(id,name,mimeType,size,md5Checksum,parents,"
                  "createdTime,modifiedTime,trashed,shortcutDetails)")
PASTA = "application/vnd.google-apps.folder"
ATALHO = "application/vnd.google-apps.shortcut"


class ComposioError(Exception):
    pass


class Composio:
    def __init__(self, api_key, user_id, base_url="https://backend.composio.dev", versao="latest",
                 contas=None, http=None, dormir=time.sleep):
        self.api_key, self.user_id, self.base = api_key, user_id, base_url.rstrip("/")
        self.versao, self.contas = versao, contas or {}
        self.http = http or requests.Session()
        self.dormir = dormir
        self.chamadas = Counter()

    def _hdr(self):
        return {"x-api-key": self.api_key, "Content-Type": "application/json"}

    def _req(self, metodo, caminho, tentativas=5, **kw):
        for t in range(tentativas):
            try:
                r = self.http.request(metodo, self.base + caminho, headers=self._hdr(), timeout=(15, 300), **kw)
            except requests.RequestException as e:
                if t == tentativas - 1:
                    raise ComposioError(f"rede: {type(e).__name__}") from e
                self.dormir(2 ** t)
                continue
            if r.status_code in (429, 500, 502, 503, 504) and t < tentativas - 1:
                self.dormir(2 ** t)
                continue
            if r.status_code >= 400:
                raise ComposioError(f"HTTP {r.status_code} em {caminho}: {r.text[:300]}")
            return r.json()
        raise ComposioError("tentativas esgotadas")

    def executar(self, slug, argumentos, toolkit=None, repetir=True):
        corpo = {"user_id": self.user_id, "arguments": argumentos}
        if self.versao:
            corpo["version"] = self.versao
        if toolkit and self.contas.get(toolkit):
            corpo["connected_account_id"] = self.contas[toolkit]
        self.chamadas[slug] += 1
        resp = self._req("POST", f"/api/v3.1/tools/execute/{slug}", tentativas=5 if repetir else 1, json=corpo)
        if not resp.get("successful"):
            raise ComposioError(f"{slug}: {resp.get('error')}")
        return resp.get("data") or {}

    def esquema_ferramenta(self, slug):
        return self._req("GET", f"/api/v3.1/tools/{slug}", params={"toolkit_versions": self.versao})

    def contas_ativas(self, toolkit):
        r = self._req("GET", "/api/v3.1/connected_accounts",
                      params={"toolkit_slugs": toolkit, "statuses": "ACTIVE", "user_ids": self.user_id})
        return r.get("items", [])

    def enviar_arquivo(self, dados: bytes, nome, mimetype, tool_slug, toolkit_slug):
        """Devolve {'name','mimetype','s3key'} no formato exigido pelas ferramentas."""
        pre = self._req("POST", "/api/v3.1/files/upload/request", json={
            "filename": nome, "md5": md5_bytes(dados), "mimetype": mimetype,
            "tool_slug": tool_slug, "toolkit_slug": toolkit_slug})
        r = self.http.put(pre["new_presigned_url"], data=dados, headers={"Content-Type": mimetype},
                          timeout=(15, 600))
        if r.status_code != 200:
            raise ComposioError(f"upload para armazenamento falhou: HTTP {r.status_code}")
        return {"name": nome, "mimetype": mimetype, "s3key": pre["key"]}

    def baixar_s3url(self, s3url) -> bytes:
        r = self.http.get(s3url, timeout=(15, 600))
        if r.status_code != 200:
            raise ComposioError(f"download falhou: HTTP {r.status_code}")
        return r.content


def _norm(f: dict) -> dict:
    return {"id": f["id"], "name": f.get("name", ""), "mimeType": f.get("mimeType", ""),
            "size": int(f["size"]) if f.get("size") not in (None, "") else None,
            "md5": f.get("md5Checksum"), "parents": f.get("parents") or [],
            "created": f.get("createdTime"), "modified": f.get("modifiedTime"),
            "shortcut_target": (f.get("shortcutDetails") or {}).get("targetId")}


class DriveComposio:
    TK = "googledrive"

    def __init__(self, c: Composio):
        self.c = c

    def listar(self, pasta_id):
        """Todos os itens (arquivos, pastas, atalhos) diretamente na pasta, paginando até o fim."""
        token = None
        while True:
            args = {"folder_id": pasta_id, "q": "trashed = false", "pageSize": 1000,
                    "fields": CAMPOS_ARQUIVO, "supportsAllDrives": True}
            if token:
                args["pageToken"] = token
            d = self.c.executar("GOOGLEDRIVE_FIND_FILE", args, self.TK)
            for f in d.get("files", []):
                yield _norm(f)
            token = d.get("nextPageToken")
            if not token:
                return

    def achar_pastas(self, nome, pai_id=None):
        token, out = None, []
        while True:
            args = {"name_exact": nome, "page_size": 100}
            if pai_id:
                args["parent_folder_id"] = pai_id
            if token:
                args["page_token"] = token
            d = self.c.executar("GOOGLEDRIVE_FIND_FOLDER", args, self.TK)
            out += [_norm(f) for f in d.get("files", []) if not f.get("trashed")]
            token = d.get("nextPageToken")
            if not token:
                return out

    def metadados(self, fid):
        d = self.c.executar("GOOGLEDRIVE_GET_FILE_METADATA", {
            "fileId": fid, "fields": "id,name,mimeType,size,md5Checksum,parents,createdTime,modifiedTime,trashed"},
            self.TK)
        return _norm(d)

    def baixar(self, fid) -> bytes:
        d = self.c.executar("GOOGLEDRIVE_DOWNLOAD_FILE", {"fileId": fid}, self.TK)
        ref = d.get("downloaded_file_content")
        if not ref or not ref.get("s3url"):
            raise ComposioError(f"download de {fid} sem s3url: {d.get('composio_execution_message')}")
        return self.c.baixar_s3url(ref["s3url"])

    def criar_pasta(self, nome, pai_id=None):
        args = {"name": nome}
        if pai_id:
            args["parent_id"] = pai_id
        d = self.c.executar("GOOGLEDRIVE_CREATE_FOLDER", args, self.TK)
        if not d.get("id"):
            raise ComposioError(f"CREATE_FOLDER sem id na resposta: {list(d)}")
        return d["id"]

    def mover(self, fid, destino_id, origem_ids):
        d = self.c.executar("GOOGLEDRIVE_MOVE_FILE", {
            "file_id": fid, "add_parents": destino_id, "remove_parents": ",".join(origem_ids),
            "supports_all_drives": True}, self.TK)
        return d

    def enviar(self, nome, dados: bytes, pasta_id, mimetype="application/pdf", atualizar_id=None):
        if atualizar_id or len(dados) > LIMITE_UPLOAD_SIMPLES:
            slug = "GOOGLEDRIVE_RESUMABLE_UPLOAD"
            ref = self.c.enviar_arquivo(dados, nome, mimetype, slug, self.TK)
            args = {"file_to_upload": ref, "queryParams": {"uploadType": "resumable", "supportsAllDrives": True}}
            if atualizar_id:
                args["file_id"] = atualizar_id
            else:
                args["folder_to_upload_to"] = pasta_id
        else:
            slug = "GOOGLEDRIVE_UPLOAD_FILE"
            ref = self.c.enviar_arquivo(dados, nome, mimetype, slug, self.TK)
            args = {"file_to_upload": ref, "folder_to_upload_to": pasta_id}
        d = self.c.executar(slug, args, self.TK, repetir=False)
        if not d.get("id"):
            raise ComposioError(f"{slug} sem id na resposta: {list(d)}")
        return d["id"]


class ILovePDFComposio:
    TK = "i_love_pdf"

    def __init__(self, c: Composio, max_arquivos=20):
        self.c, self.max_arquivos = c, max_arquivos

    def conta(self) -> dict:
        return self.c.executar("I_LOVE_PDF_GET_ACCOUNT_INFO", {}, self.TK)

    def juntar(self, arquivos: list[tuple[str, bytes]], nome_saida: str) -> bytes:
        """Uma chamada de merge (máx. max_arquivos). Ordem preservada. Sem repetição automática: consome crédito."""
        if not 2 <= len(arquivos) <= self.max_arquivos:
            raise ValueError(f"merge aceita de 2 a {self.max_arquivos} arquivos; recebeu {len(arquivos)}")
        refs = [self.c.enviar_arquivo(b, n, "application/pdf", "I_LOVE_PDF_MERGE_PDFS", self.TK)
                for n, b in arquivos]
        d = self.c.executar("I_LOVE_PDF_MERGE_PDFS", {"files": refs, "output_filename": nome_saida},
                            self.TK, repetir=False)
        arq = d.get("file") or {}
        if not arq.get("s3url"):
            raise ComposioError(f"merge sem arquivo de saída: {list(d)}")
        return self.c.baixar_s3url(arq["s3url"])
