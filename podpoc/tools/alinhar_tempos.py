#!/usr/bin/env python3
"""Alinha a timeline à fala REAL do Elvis.

Entradas: episodios/epNN/overlays.estimado.json (gerado por parse_roteiro.py) e
          episodios/epNN/transcricao-palavras.json (gerado por transcrever.py).
Como funciona: cada [TEXTO NA TELA] é uma frase conhecida. Procura essa frase na transcrição (comparação
aproximada, tolera erro de transcrição) e descobre quando ela foi dita de fato. Esses pontos viram âncoras:
os tempos estimados de todo o resto (vídeos, diagramas, lower thirds, marcadores, cue sheet) são deslocados e
esticados entre as âncoras. As contas são todas feitas aqui, em código.
Saída: episodios/epNN/tempos-reais.json. Depois rode `python3 tools/parse_roteiro.py epNN` para regenerar
overlays.json, timeline.csv/.edl/-capcut.srt e cue-sheet com os tempos reais.

  python3 tools/alinhar_tempos.py ep02 [--palavras arquivo.json] [--minimo 0.75]
"""
import argparse
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9 ]+", " ", s).split()


def best_window(phrase, toks, lo=0, hi=None, expected=None):
    """Melhor janela de palavras parecida com a frase. Devolve (score, i, j) com j exclusivo."""
    hi = len(toks) if hi is None else hi
    n = len(phrase)
    target = " ".join(phrase)
    best = (0.0, -1, -1)
    for size in (n - 1, n, n + 1, n + 2):
        if size < 1:
            continue
        for i in range(lo, max(lo, hi - size) + 1):
            win = " ".join(toks[i:i + size])
            if len(win) < len(target) * 0.5:
                continue
            sm = difflib.SequenceMatcher(None, target, win, autojunk=False)
            if sm.real_quick_ratio() < best[0] or sm.quick_ratio() < best[0]:
                continue
            sc = sm.ratio()
            if sc > best[0] + 1e-9:
                best = (sc, i, i + size)
    return best


def interp(pts, t):
    """pts: [(est, real)] crescentes. Extrapola com inclinação 1 fora das pontas."""
    if not pts:
        return t
    if t <= pts[0][0]:
        return t + pts[0][1] - pts[0][0]
    if t >= pts[-1][0]:
        return t + pts[-1][1] - pts[-1][0]
    for (e0, r0), (e1, r1) in zip(pts, pts[1:]):
        if e0 <= t <= e1:
            return r0 + (t - e0) * ((r1 - r0) / (e1 - e0) if e1 > e0 else 1.0)
    return t


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episodio")
    ap.add_argument("--palavras")
    ap.add_argument("--estimado")
    ap.add_argument("--saida")
    ap.add_argument("--deslocamento", type=float, default=0.0, help="s somados a todos os tempos reais (ex.: 8 para o cold open V01 antes da gravação)")
    ap.add_argument("--cold-open-est", type=float, default=8.0, help="onde a fala começa na estimativa (= duração do cold open estimado)")
    ap.add_argument("--minimo", type=float, default=0.75, help="semelhança mínima (0 a 1) para aceitar a frase")
    ap.add_argument("--janela", type=float, default=25.0, help="s de busca em volta do tempo previsto (frases curtas)")
    a = ap.parse_args()
    ep = ROOT / "episodios" / a.episodio
    est_p = Path(a.estimado) if a.estimado else ep / "overlays.estimado.json"
    pal_p = Path(a.palavras) if a.palavras else ep / "transcricao-palavras.json"
    out_p = Path(a.saida) if a.saida else ep / "tempos-reais.json"
    for p in (est_p, pal_p):
        if not p.exists():
            sys.exit(f"não achei {p}")
    est = json.loads(est_p.read_text(encoding="utf-8"))
    words = json.loads(pal_p.read_text(encoding="utf-8"))["palavras"]
    toks, tok_idx = [], []  # um token normalizado por palavra (palavras viram 0 ou 1 token)
    for k, w in enumerate(words):
        for t in norm(w["w"]):
            toks.append(t)
            tok_idx.append(k)

    quotes = [r for r in est if r["kind"] in ("quote", "invite")]
    found = {}

    def accept(r, sc, i, j):
        w0, w1 = words[tok_idx[i]], words[tok_idx[j - 1]]
        found[r["id"]] = {"start": w0["start"], "end": w1["end"], "score": round(sc, 3), "est": r["start_s"]}

    # passo 1: frases longas, busca global
    for r in quotes:
        ph = norm(r["text"])
        if len(ph) >= 6:
            sc, i, j = best_window(ph, toks)
            if sc >= a.minimo:
                accept(r, sc, i, j)
    # mantém só o que está em ordem crescente (descarta casamentos fora de lugar)
    ordered = sorted(found.items(), key=lambda kv: kv[1]["est"])
    keep, last = [], -1.0
    for k, v in ordered:
        if v["start"] > last:
            keep.append((k, v))
            last = v["start"]
        elif keep and v["score"] > keep[-1][1]["score"]:
            keep[-1] = (k, v)
            last = v["start"]
    found = dict(keep)
    pts = sorted((v["est"], v["start"]) for v in found.values())
    # passo 2: frases curtas, busca perto do tempo previsto
    for r in quotes:
        if r["id"] in found:
            continue
        ph = norm(r["text"])
        pred = interp(pts, r["start_s"])
        lo = next((k for k, idx in enumerate(tok_idx) if words[idx]["start"] >= pred - a.janela), 0)
        hi = next((k for k, idx in enumerate(tok_idx) if words[idx]["start"] > pred + a.janela), len(toks))
        sc, i, j = best_window(ph, toks, lo, hi)
        if sc >= max(a.minimo, 0.8):
            accept(r, sc, i, j)
    pts = sorted((v["est"], v["start"]) for v in found.values())
    # âncora do início da fala: a primeira palavra gravada = o HOOK da estimativa
    pts.append((a.cold_open_est, words[0]["start"]))
    pts.sort()
    # garante âncoras estritamente crescentes nos dois eixos
    clean = []
    for e, r in pts:
        if not clean or (e > clean[-1][0] and r > clean[-1][1]):
            clean.append((e, r))
    missing = [r["id"] for r in quotes if r["id"] not in found]

    print(f"{len(found)} de {len(quotes)} textos na tela localizados na fala")
    print(f"{'id':16} {'estimado':>9} {'real':>8} {'diferença':>10} {'semelhança':>11}")
    for r in quotes:
        v = found.get(r["id"])
        if v:
            print(f"{r['id']:16} {v['est']:9.1f} {v['start']:8.1f} {v['start'] - v['est']:+10.1f} {v['score']:11.2f}")
    if missing:
        print("NÃO localizados (conferir à mão):", ", ".join(missing))
    d = a.deslocamento
    found = {k: {**v, "start": round(v["start"] + d, 3), "end": round(v["end"] + d, 3)} for k, v in found.items()}
    doc = {"origem": pal_p.name, "deslocamento_s": d, "anchors": [[round(e, 3), round(r + d, 3)] for e, r in clean], "quotes": found,
           "nao_localizados": missing}
    out_p.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"gravado: {out_p}")
    if len(clean) < 3:
        print("AVISO: poucas âncoras; os tempos intermediários ficam pouco confiáveis.", file=sys.stderr)


if __name__ == "__main__":
    main()
