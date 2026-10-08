#!/usr/bin/env python3
"""Autoteste do alinhamento. Simula uma gravação cujo ritmo e atrasos são DIFERENTES da estimativa
(tempo real = 1,07 x estimado + 12 s, mais oscilação), com 3% de palavras perdidas e 4% trocadas
(como erros de Whisper), e confere se alinhar_tempos.py recupera o início de cada texto na tela.
Roda sem tocar nos arquivos do episódio: tudo vai para uma pasta temporária.

  python3 tools/teste_alinhar.py [ep02]
"""
import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP = sys.argv[1] if len(sys.argv) > 1 else "ep02"
sys.argv = ["parse_roteiro", EP]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import parse_roteiro as pr  # noqa: E402

random.seed(7)
ratio, offset = 1.07, 12.0
real = lambda t: ratio * t + offset  # noqa: E731

items, _ = pr.parse()
est = json.loads((ROOT / "episodios" / EP / "overlays.estimado.json").read_text(encoding="utf-8"))
words, truth_words = [], []
for it in items:
    if it["t"] != "say":
        continue
    toks = it["text"].replace("—", " ").split()
    t0, t1 = real(pr.T(it["w0"], it["p0"])), real(pr.T(it["w1"], it["p0"]))
    for k, w in enumerate(toks):
        s = t0 + (t1 - t0) * k / len(toks) + random.uniform(-0.08, 0.08)
        e = t0 + (t1 - t0) * (k + 1) / len(toks)
        truth_words.append((pr._toks(w), s))
        r = random.random()
        if r < 0.03:
            continue  # palavra perdida
        if r < 0.07:
            w = w[: max(2, len(w) - 2)] + "x"  # palavra trocada
        words.append({"w": w, "start": round(s, 3), "end": round(e, 3)})

tmp = Path(tempfile.mkdtemp(prefix="alinhar-teste-"))
(tmp / "palavras.json").write_text(json.dumps({"palavras": words}, ensure_ascii=False), encoding="utf-8")
out = tmp / "tempos-reais.json"
r = subprocess.run([sys.executable, str(Path(__file__).with_name("alinhar_tempos.py")), EP, "--palavras", str(tmp / "palavras.json"),
                    "--saida", str(out)], capture_output=True, text=True)
print(r.stdout)
if r.returncode:
    sys.exit(r.stderr)
res = json.loads(out.read_text(encoding="utf-8"))
quotes = [x for x in est if x["kind"] in ("quote", "invite")]
flat = [(t, ts) for toks, ts in truth_words for t in toks]


def true_start(phrase):  # início real da frase na fala simulada sem ruído; None se for paráfrase
    want = pr._toks(phrase)
    for a in range(len(flat) - len(want) + 1):
        if [t for t, _ in flat[a:a + len(want)]] == want:
            return flat[a][1]
    return None


errs, bad, pular = [], [], []
for q in quotes:
    got = res["quotes"].get(q["id"])
    truth = true_start(q["text"])
    if truth is None:
        pular.append(q["id"])  # frase da tela é paráfrase da fala: sem verdade exata para comparar
        continue
    if not got:
        bad.append(q["id"])
        continue
    errs.append(abs(got["start"] - truth))
if pular:
    print("sem verdade exata (paráfrase):", ", ".join(pular))
print(f"localizados {len(errs)}/{len(quotes) - len(pular)}; erro médio {sum(errs) / len(errs):.2f}s; erro máximo {max(errs):.2f}s")
# o resto da timeline: o alinhamento deve prever o tempo real dos demais eventos
W, _ = pr.make_warp(res["anchors"])
others = [x for x in est if x["kind"] not in ("quote", "invite")]
oerr = [abs(W(x["start_s"]) - real(x["start_s"])) for x in others]
print(f"demais overlays ({len(others)}): erro médio de previsão {sum(oerr) / len(oerr):.2f}s; máximo {max(oerr):.2f}s")
ok = not bad and max(errs) < 1.0 and max(oerr) < 2.0
print("RESULTADO:", "OK" if ok else "FALHOU", f"(arquivos temporários em {tmp})")
sys.exit(0 if ok else 1)
