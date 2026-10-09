#!/usr/bin/env python3
"""Legendas sincronizadas: o TEXTO vem do roteiro (o que o Elvis leu, com a grafia certa) e o TEMPO vem da
transcrição do áudio. A transcrição do Whisper só serve de régua; nenhuma palavra errada dele vai para a tela.

  python3 tools/legendas.py ep02 [--deslocamento 8]

Entradas: episodios/epNN/roteiro-e-pacote.md e episodios/epNN/transcricao-palavras.json
Saídas (em episodios/epNN/):
  legendas-final.srt        com o deslocamento (ex.: +8 s do cold open) = timeline do vídeo final
  legendas-gravacao.srt     sem deslocamento = timeline da gravação bruta (para usar no clipe cru)
  palavras-roteiro.json     cada palavra do roteiro com início/fim (base para legendas palavra por palavra)
  legendas-divergencias.md  trechos em que a fala NÃO bate com o roteiro (improviso ou omissão): conferir
"""
import argparse
import difflib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))


def srt_t(sec):
    ms = int(round(max(sec, 0) * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def quebra_linhas(texto, max_chars):
    """Divide em até 2 linhas, o mais equilibrado possível."""
    if len(texto) <= max_chars:
        return texto
    meio = len(texto) / 2
    cand = [i for i, c in enumerate(texto) if c == " "]
    if not cand:
        return texto
    i = min(cand, key=lambda k: abs(k - meio))
    return texto[:i] + "\n" + texto[i + 1:]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episodio")
    ap.add_argument("--deslocamento", type=float, default=8.0)
    ap.add_argument("--max-chars", type=int, default=34, help="caracteres por linha")
    ap.add_argument("--max-dur", type=float, default=5.5)
    a = ap.parse_args()
    sys.argv = ["parse_roteiro", a.episodio]
    import parse_roteiro as pr

    ep = ROOT / "episodios" / a.episodio
    items, _ = pr.parse()
    script = []  # palavras do roteiro como foram escritas
    for it in items:
        if it["t"] != "say":
            continue
        for w in it["text"].replace("—", " ").split():
            if "".join(pr._toks(w)):
                script.append(w)
    tr = json.loads((ep / "transcricao-palavras.json").read_text(encoding="utf-8"))["palavras"]
    key = lambda w: "".join(pr._toks(w))  # noqa: E731
    A = [key(w) for w in script]
    B = [key(x["w"]) for x in tr]
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    t_start = [None] * len(script)
    t_end = [None] * len(script)
    exato = [False] * len(script)
    divergencias = []
    ops = sm.get_opcodes()
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            for k in range(i2 - i1):
                t_start[i1 + k], t_end[i1 + k], exato[i1 + k] = tr[j1 + k]["start"], tr[j1 + k]["end"], True
    # palavras sem par exato: distribui dentro da janela entre os vizinhos que casaram
    prev_end = tr[0]["start"]
    k = 0
    n = len(script)
    while k < n:
        if t_start[k] is not None:
            prev_end = t_end[k]
            k += 1
            continue
        k2 = k
        while k2 < n and t_start[k2] is None:
            k2 += 1
        nxt = t_start[k2] if k2 < n else tr[-1]["end"]
        lo, hi = prev_end, max(nxt, prev_end)
        pesos = [max(len(script[x]), 2) for x in range(k, k2)]
        tot = sum(pesos)
        acc = lo
        for x, p in zip(range(k, k2), pesos):
            d = (hi - lo) * p / tot
            t_start[x], t_end[x] = acc, acc + d
            acc += d
        k = k2
    # divergências: blocos grandes sem correspondência em um dos lados
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            continue
        if (i2 - i1) >= 5 or (j2 - j1) >= 5:
            divergencias.append({
                "tempo_gravacao_s": round(tr[min(j1, len(tr) - 1)]["start"], 1),
                "roteiro": " ".join(script[i1:i2]),
                "fala": " ".join(x["w"] for x in tr[j1:j2]),
            })
    pct = 100.0 * sum(exato) / n
    words = [{"w": script[i], "start": round(t_start[i], 3), "end": round(t_end[i], 3), "exata": exato[i]} for i in range(n)]
    (ep / "palavras-roteiro.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")

    # cues
    cues, cur = [], []
    def fecha():
        if cur:
            cues.append(list(cur))
            cur.clear()
    for i, w in enumerate(words):
        if cur:
            gap = w["start"] - cur[-1]["end"]
            txt = " ".join(c["w"] for c in cur)
            dur = w["end"] - cur[0]["start"]
            if gap > 1.3 or dur > a.max_dur or len(txt) + len(w["w"]) + 1 > a.max_chars * 2:
                fecha()
        cur.append(w)
        txt = " ".join(c["w"] for c in cur)
        if w["w"][-1] in ".?!:" and len(txt) >= 16:
            fecha()
        elif w["w"][-1] in ",;" and len(txt) >= a.max_chars * 1.4:
            fecha()
    fecha()
    for nome, desl in (("legendas-final.srt", a.deslocamento), ("legendas-gravacao.srt", 0.0)):
        blocos = []
        for n_, c in enumerate(cues, 1):
            ini = c[0]["start"] + desl
            fim = c[-1]["end"] + desl + 0.12
            if n_ < len(cues):
                fim = min(fim, cues[n_][0]["start"] + desl - 0.02)
            fim = max(fim, ini + 0.4)
            blocos.append(f"{n_}\n{srt_t(ini)} --> {srt_t(fim)}\n{quebra_linhas(' '.join(x['w'] for x in c), a.max_chars)}\n")
        (ep / nome).write_text("\n".join(blocos), encoding="utf-8")

    L = ["# Divergências entre o roteiro e a fala", "",
         f"Palavras do roteiro com correspondência exata na transcrição: **{pct:.1f}%** ({sum(exato)} de {n}).",
         "As demais ficam com tempo interpolado entre as vizinhas. Abaixo, só os trechos de 5 palavras ou mais sem par:", ""]
    if not divergencias:
        L.append("Nenhum.")
    for d in divergencias:
        L += [f"- **{d['tempo_gravacao_s']:.0f} s** da gravação", f"  - roteiro: {d['roteiro'] or '(nada)'}", f"  - fala: {d['fala'] or '(nada)'}"]
    (ep / "legendas-divergencias.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"{len(cues)} legendas; palavras com par exato: {pct:.1f}%; trechos divergentes (>=5 palavras): {len(divergencias)}")


if __name__ == "__main__":
    main()
