"""Estado em SQLite. O arquivo vive no Drive (pasta de controle) e é baixado/enviado a cada execução,
pois o runner do GitHub Actions é descartado ao final."""
import json
import sqlite3
from pathlib import Path

from .util import agora

ESQUEMA = """
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS arquivos(
  id TEXT PRIMARY KEY, nome TEXT, caminho TEXT, pasta_id TEXT, mime TEXT, tamanho INTEGER, md5 TEXT,
  criado TEXT, modificado TEXT, atalho INTEGER DEFAULT 0, situacao TEXT DEFAULT 'ok', visto_em TEXT);
CREATE TABLE IF NOT EXISTS pastas(id TEXT PRIMARY KEY, caminho TEXT, pai_id TEXT);
CREATE TABLE IF NOT EXISTS hashes(file_id TEXT, md5 TEXT, sha256 TEXT, PRIMARY KEY(file_id, md5));
CREATE TABLE IF NOT EXISTS grupos_dup(sha256 TEXT PRIMARY KEY, exemplar_id TEXT, motivo TEXT);
CREATE TABLE IF NOT EXISTS membros_dup(file_id TEXT PRIMARY KEY, sha256 TEXT, papel TEXT);
CREATE TABLE IF NOT EXISTS movimentos(
  file_id TEXT, tipo TEXT, de_pasta TEXT, para_pasta TEXT, de_caminho TEXT, para_caminho TEXT,
  status TEXT, erro TEXT, em TEXT, PRIMARY KEY(file_id, tipo, para_pasta));
CREATE TABLE IF NOT EXISTS pdf_info(
  file_id TEXT, md5 TEXT, paginas INTEGER, palavras INTEGER, chars_pag REAL, situacao TEXT, detalhe TEXT,
  PRIMARY KEY(file_id, md5));
CREATE TABLE IF NOT EXISTS lotes(
  chave TEXT PRIMARY KEY, pasta TEXT, seq INTEGER, status TEXT, saida_nome TEXT, saida_id TEXT,
  paginas INTEGER, tamanho INTEGER, erro TEXT, obsoleto INTEGER DEFAULT 0, atualizado TEXT);
CREATE TABLE IF NOT EXISTS lote_itens(chave TEXT, ordem INTEGER, file_id TEXT, nome TEXT,
  pagina_ini INTEGER, pagina_fim INTEGER, PRIMARY KEY(chave, ordem));
CREATE TABLE IF NOT EXISTS avulsos(file_id TEXT PRIMARY KEY, caminho TEXT, motivo TEXT);
CREATE TABLE IF NOT EXISTS classif(file_id TEXT, md5 TEXT, tema TEXT, autor TEXT, fonte TEXT, confianca REAL,
  PRIMARY KEY(file_id, md5));
CREATE TABLE IF NOT EXISTS pendencias(file_id TEXT, tipo TEXT, detalhe TEXT, em TEXT, PRIMARY KEY(file_id, tipo));
CREATE TABLE IF NOT EXISTS conversoes(file_id TEXT, md5 TEXT, formato TEXT, pdf_id TEXT, pdf_md5 TEXT, pdf_tamanho INTEGER,
  pdf_nome TEXT, status TEXT, detalhe TEXT, atualizado TEXT, PRIMARY KEY(file_id, md5));
CREATE TABLE IF NOT EXISTS uso_api(chave TEXT PRIMARY KEY, n INTEGER);
"""


class Estado:
    def __init__(self, caminho: str | Path):
        self.caminho = Path(caminho)
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.caminho)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(ESQUEMA)

    def q(self, sql, *a):
        return self.db.execute(sql, a).fetchall()

    def x(self, sql, *a):
        self.db.execute(sql, a)
        self.db.commit()

    def meta(self, k, padrao=None):
        r = self.q("SELECT v FROM meta WHERE k=?", k)
        return json.loads(r[0]["v"]) if r else padrao

    def set_meta(self, k, v):
        self.x("INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", k, json.dumps(v))

    def pendencia(self, file_id, tipo, detalhe):
        self.x("INSERT INTO pendencias VALUES(?,?,?,?) ON CONFLICT(file_id,tipo) DO UPDATE SET "
               "detalhe=excluded.detalhe, em=excluded.em", file_id, tipo, detalhe, agora())

    def resolver_pendencia(self, file_id, tipo):
        self.x("DELETE FROM pendencias WHERE file_id=? AND tipo=?", file_id, tipo)

    def somar_uso(self, contagem: dict):
        for k, n in contagem.items():
            self.x("INSERT INTO uso_api VALUES(?,?) ON CONFLICT(chave) DO UPDATE SET n=n+excluded.n", k, n)

    def fechar(self):
        self.db.commit()
        self.db.close()
