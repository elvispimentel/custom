#!/usr/bin/env python3
"""Transcreve um áudio ou vídeo com Whisper local (faster-whisper) e grava o tempo de CADA PALAVRA.

  pip install faster-whisper
  python3 tools/transcrever.py episodios/ep02/gravacao.mp4 --episodio ep02

Saídas (em episodios/epNN/): transcricao-palavras.json (palavras com início e fim, em segundos) e transcricao.txt.
Sem --episodio, grava ao lado do arquivo de entrada.
O modelo é baixado do Hugging Face na primeira vez (small ~540 MB). Em CPU, o `small` leva em torno de metade
da duração do áudio; use --modelo medium para mais precisão em nomes próprios (mais lento).
"""
import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ajuda o Whisper a escrever os nomes do canal do jeito certo
TERMOS = ("Podcast Aqui Agora PodPoc. Elvis Pimentel, Instituto Galifrael. Gregg Braden, Marcelo Del Debbio, "
          "Éliphas Lévi, Deepak Sankara Veda, Neville Goddard, Alice Bailey, Blavatsky, Qlippoth, Ana Bekoach, "
          "Yod, Heh, Vav, Bereshit, Chokmah, Binah, Zeir Anpin, Malkuth, Tiferet, Zohar, Raziel, Zayn, gematria.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("--episodio", help="ex.: ep02 (grava em episodios/ep02/)")
    ap.add_argument("--modelo", default="small")
    ap.add_argument("--idioma", default="pt")
    ap.add_argument("--termos", default=TERMOS, help="texto com nomes e termos para orientar a grafia")
    a = ap.parse_args()
    src = Path(a.entrada)
    if not src.exists():
        sys.exit(f"não achei {src}")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faltou instalar: pip install faster-whisper")

    out_dir = ROOT / "episodios" / a.episodio if a.episodio else src.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(a.modelo, device="cpu", compute_type="int8")
    t0 = time.time()
    segs, info = model.transcribe(
        str(src), language=a.idioma, word_timestamps=True, beam_size=5, initial_prompt=a.termos,
        vad_filter=True, vad_parameters={"min_silence_duration_ms": 500}, condition_on_previous_text=False)
    words, texto = [], []
    for s in segs:
        texto.append(s.text.strip())
        for w in s.words or []:
            if w.word.strip():
                words.append({"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
        print(f"\r{s.end:7.1f}s de {info.duration:.1f}s ({time.time() - t0:.0f}s decorridos)", end="", file=sys.stderr)
    print(file=sys.stderr)
    doc = {"arquivo": src.name, "modelo": a.modelo, "idioma": a.idioma, "duracao_s": round(info.duration, 3),
           "n_palavras": len(words), "palavras": words}
    (out_dir / "transcricao-palavras.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    (out_dir / "transcricao.txt").write_text("\n".join(texto) + "\n", encoding="utf-8")
    print(f"{len(words)} palavras em {info.duration:.1f}s de áudio; gravado em {out_dir}")


if __name__ == "__main__":
    main()
