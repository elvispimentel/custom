import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml

PADRAO = {
    "biblioteca": {"nome": "Biblioteca Pessoal", "id": ""},
    "pastas_saida": {
        "pai_id": "",
        "pdfs_nome": "Biblioteca Pessoal — PDFs para NotebookLM", "pdfs_id": "",
        "duplicados_nome": "Biblioteca Pessoal — Duplicados para Revisão", "duplicados_id": "",
        "controle_nome": "Biblioteca Pessoal — Controle do Agente", "controle_id": "",
    },
    "composio": {"base_url": "https://backend.composio.dev", "versao_ferramentas": "latest",
                 "contas": {"googledrive": "", "i_love_pdf": ""},
                 "auth_configs": {"googledrive": ""}},
    "arquivos": {"estabilidade_minutos": 30,
                 "ignorar_nomes": [".DS_Store", "Thumbs.db", "desktop.ini"],
                 "pastas_de_copias": ["cópia", "copia", "copias", "cópias", "backup", "duplicad", "old"]},
    "pdf": {"motor": "local"},
    "ilovepdf": {"max_arquivos_por_chamada": 20, "reservar_creditos": 0},
    "lotes": {"agrupar_por": "pasta", "grupo_sem_tema": "Sem tema", "max_documentos": 25, "meta_mb": 90, "meta_palavras": 450000,
              "limite_mb": 200, "limite_palavras": 500000,
              "paginas_amostra_texto": 20, "palavras_por_pagina_padrao": 300,
              "minimo_caracteres_por_pagina": 25},
    "execucao": {"tempo_max_minutos": 300, "pasta_trabalho": "trabalho", "paralelismo_listagem": 6},
    "organizacao": {"destino": "dentro", "mover_nao_classificados": False,
                    "pasta_nao_classificados": "A classificar", "pasta_sem_autor": "_Sem autor identificado",
                    "confianca_minima": 0.7, "classificador": "regras",
                    "modelo_claude": "claude-haiku-4-5-20251001", "temas": {}},
}

# Variáveis de ambiente que sobrepõem o arquivo (úteis no GitHub Actions: vêm de Variables, não de Secrets).
ENV_IDS = {
    "BIBLIOTECA_ID": ("biblioteca", "id"),
    "PASTA_PDFS_ID": ("pastas_saida", "pdfs_id"),
    "PASTA_DUPLICADOS_ID": ("pastas_saida", "duplicados_id"),
    "PASTA_CONTROLE_ID": ("pastas_saida", "controle_id"),
    "PASTA_PAI_ID": ("pastas_saida", "pai_id"),
}


def _mescla(base: dict, extra: dict) -> dict:
    for k, v in (extra or {}).items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _mescla(base[k], v)
        else:
            base[k] = v
    return base


class ConfigError(Exception):
    pass


@dataclass
class Config:
    d: dict
    api_key: str = ""
    user_id: str = ""
    anthropic_key: str = ""
    openai_key: str = ""

    def __getitem__(self, k):
        return self.d[k]

    @property
    def meta_bytes(self) -> int:
        return int(self.d["lotes"]["meta_mb"] * 1024 * 1024)


def carregar(caminho: str | None = None) -> Config:
    import copy
    d = copy.deepcopy(PADRAO)
    p = Path(caminho or os.environ.get("BIBLIOTECA_CONFIG", "config.yaml"))
    if p.exists():
        _mescla(d, yaml.safe_load(p.read_text(encoding="utf-8")) or {})
    for env, (sec, chave) in ENV_IDS.items():
        if os.environ.get(env):
            d[sec][chave] = os.environ[env].strip()
    return Config(d=d, api_key=os.environ.get("COMPOSIO_API_KEY", ""),
                  user_id=os.environ.get("COMPOSIO_USER_ID", ""),
                  anthropic_key=os.environ.get("ANTHROPIC_API_KEY", ""),
                  openai_key=os.environ.get("OPENAI_API_KEY", ""))


def exigir_credenciais(cfg: Config):
    faltando = [n for n, v in (("COMPOSIO_API_KEY", cfg.api_key), ("COMPOSIO_USER_ID", cfg.user_id)) if not v]
    if faltando:
        raise ConfigError("Defina como Secrets/variáveis de ambiente: " + ", ".join(faltando))
