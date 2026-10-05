"""Análise, formação de lotes, merge ordenado (respeitando o limite real por chamada) e validação."""
import io
from dataclasses import dataclass

from pypdf import PdfReader


@dataclass
class Info:
    situacao: str          # ok | ocr | protegido | invalido
    paginas: int = 0
    palavras: int = 0
    chars_pag: float = 0.0
    detalhe: str = ""


def _amostra(n_paginas: int, k: int) -> list[int]:
    if n_paginas <= k:
        return list(range(n_paginas))
    passo = n_paginas / k
    return sorted({int(i * passo) for i in range(k)})


def analisar(dados: bytes, cfg) -> Info:
    try:
        leitor = PdfReader(io.BytesIO(dados))
        if leitor.is_encrypted:
            return Info("protegido", detalhe="PDF criptografado/protegido por senha; não foi mesclado")
        n = len(leitor.pages)
    except Exception as e:
        return Info("invalido", detalhe=f"não abre: {type(e).__name__}: {str(e)[:120]}")
    if n == 0:
        return Info("invalido", detalhe="PDF sem páginas")
    L = cfg["lotes"]
    amostra, chars, palavras = _amostra(n, L["paginas_amostra_texto"]), 0, 0
    for i in amostra:
        try:
            txt = leitor.pages[i].extract_text() or ""
        except Exception:
            txt = ""
        chars += len(txt.strip())
        palavras += len(txt.split())
    cpp = chars / len(amostra)
    if cpp < L["minimo_caracteres_por_pagina"]:
        return Info("ocr", n, n * L["palavras_por_pagina_padrao"], cpp,
                    "provável digitalização sem texto extraível: precisa de OCR (palavras estimadas por padrão)")
    return Info("ok", n, round(palavras / len(amostra) * n), cpp)


def formar_lotes(itens, cfg):
    """itens: dicts com tamanho e palavras, JÁ em ordem natural. Devolve (lotes, avulsos).
    Fecha o lote antes de estourar qualquer meta; documento que sozinho excede vai para 'avulsos'
    (subir separadamente no NotebookLM). Nunca reordena. max_documentos 0 = sem limite de quantidade
    (só valem as metas de MB e de palavras)."""
    L = cfg["lotes"]
    meta_b, meta_p, max_d = cfg.meta_bytes, L["meta_palavras"], L["max_documentos"]
    lotes, atual, b, p, avulsos = [], [], 0, 0, []
    for it in itens:
        if it["tamanho"] > meta_b or it["palavras"] > meta_p:
            motivo = []
            if it["tamanho"] > meta_b:
                motivo.append(f"tamanho {it['tamanho'] / 1048576:.1f} MB > meta {L['meta_mb']} MB")
            if it["palavras"] > meta_p:
                motivo.append(f"~{it['palavras']} palavras > meta {meta_p}")
            if it["tamanho"] > L["limite_mb"] * 1048576 or it["palavras"] > L["limite_palavras"]:
                motivo.append(f"EXCEDE o teto do NotebookLM por fonte ({L['limite_mb']} MB / {L['limite_palavras']} palavras): "
                              "não cabe nem sozinho, precisa ser dividido")
            avulsos.append({**it, "motivo": "; ".join(motivo)})
            continue
        if atual and ((max_d and len(atual) >= max_d) or b + it["tamanho"] > meta_b or p + it["palavras"] > meta_p):
            lotes.append(atual)
            atual, b, p = [], 0, 0
        atual.append(it)
        b += it["tamanho"]
        p += it["palavras"]
    if atual:
        lotes.append(atual)
    return lotes, avulsos


def chamadas_merge(n: int, max_arq: int) -> int:
    """Nº de chamadas de merge para juntar n arquivos com no máximo max_arq por chamada."""
    total = 0
    while n > 1:
        grupos = [min(max_arq, n - i) for i in range(0, n, max_arq)]
        total += sum(1 for g in grupos if g > 1)
        n = len(grupos)
    return total


def juntar_ordenado(svc, arquivos: list[tuple[str, bytes]], nome_saida: str, max_arq: int) -> bytes:
    """Ex.: 25 arquivos e limite 20 -> junta os 20 primeiros, junta os 5 restantes, une os dois resultados."""
    if len(arquivos) == 1:
        return arquivos[0][1]
    nivel = 0
    while len(arquivos) > 1:
        novos = []
        for i in range(0, len(arquivos), max_arq):
            grupo = arquivos[i:i + max_arq]
            if len(grupo) == 1:
                novos.append(grupo[0])
                continue
            nome = nome_saida if len(arquivos) <= max_arq else f"parcial_{nivel}_{i // max_arq:03d}.pdf"
            novos.append((nome, svc.juntar(grupo, nome)))
        arquivos, nivel = novos, nivel + 1
    return arquivos[0][1]


def validar_final(dados: bytes, paginas_esperadas: int, cfg) -> dict:
    """Abre, conta páginas, confere tamanho e texto extraível. Divergência de páginas = erro (nada some em silêncio)."""
    r = {"ok": False, "paginas": 0, "tamanho": len(dados), "texto": False, "avisos": []}
    if not dados:
        r["avisos"].append("arquivo vazio")
        return r
    try:
        leitor = PdfReader(io.BytesIO(dados))
        if leitor.is_encrypted:
            r["avisos"].append("PDF final protegido")
            return r
        r["paginas"] = len(leitor.pages)
    except Exception as e:
        r["avisos"].append(f"não abre: {type(e).__name__}")
        return r
    if r["paginas"] != paginas_esperadas:
        r["avisos"].append(f"páginas divergentes: esperado {paginas_esperadas}, obtido {r['paginas']}")
        return r
    chars = 0
    am = _amostra(r["paginas"], cfg["lotes"]["paginas_amostra_texto"])
    for i in am:
        try:
            chars += len((leitor.pages[i].extract_text() or "").strip())
        except Exception:
            pass
    if len(dados) > cfg["lotes"]["limite_mb"] * 1048576:
        r["avisos"].append(f"PDF final de {len(dados) / 1048576:.1f} MB excede o teto de {cfg['lotes']['limite_mb']} MB do NotebookLM")
        return r
    r["texto"] = chars / len(am) >= cfg["lotes"]["minimo_caracteres_por_pagina"]
    if not r["texto"]:
        r["avisos"].append("sem texto extraível suficiente: precisa de OCR")
    r["ok"] = True
    return r
