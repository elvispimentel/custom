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
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ajuda o Whisper a escrever os nomes do canal do jeito certo
TERMOS = ("Podcast Aqui Agora PodPoc. Elvis Pimentel, Instituto Galifrael. Gregg Braden, Marcelo Del Debbio, "
          "Éliphas Lévi, Deepak Sankara Veda, Neville Goddard, Alice Bailey, Blavatsky, Qlippoth, Ana Bekoach, "
          "Yod, Heh, Vav, Bereshit, Chokmah, Binah, Zeir Anpin, Malkuth, Tiferet, Zohar, Raziel, Zayn, gematria.")


def carregar_audio(path):
    """Decodifica com o FFmpeg (16 kHz, mono) e devolve um vetor numpy. Evita depender do PyAV do faster-whisper,
    cuja versão nova quebra a leitura de arquivos."""
    import numpy as np
    r = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000",
                        "-f", "s16le", "-"], capture_output=True)
    if r.returncode:
        sys.exit(f"ffmpeg não leu {path}: {r.stderr.decode()[:300]}")
    return np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", nargs="+", help="um ou mais arquivos; vários são tratados como partes em sequência")
    ap.add_argument("--episodio", help="ex.: ep02 (grava em episodios/ep02/)")
    ap.add_argument("--modelo", default="small")
    ap.add_argument("--idioma", default="pt")
    ap.add_argument("--termos", default=TERMOS, help="texto com nomes e termos para orientar a grafia")
    a = ap.parse_args()
    srcs = [Path(x) for x in a.entrada]
    for x in srcs:
        if not x.exists():
            sys.exit(f"não achei {x}")
    src = srcs[0]
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faltou instalar: pip install faster-whisper")

    out_dir = ROOT / "episodios" / a.episodio if a.episodio else src.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(a.modelo, device="cpu", compute_type="int8")
    t0 = time.time()
    words, texto, partes, base = [], [], [], 0.0
    for x in srcs:
        segs, info = model.transcribe(
            carregar_audio(x), language=a.idioma, word_timestamps=True, beam_size=5, initial_prompt=a.termos,
            vad_filter=True, vad_parameters={"min_silence_duration_ms": 500}, condition_on_previous_text=False)
        partes.append({"arquivo": x.name, "inicio_s": round(base, 3), "duracao_s": round(info.duration, 3)})
        for s in segs:  # tempos da parte N somam a duração das partes anteriores
            texto.append(s.text.strip())
            for w in s.words or []:
                if w.word.strip():
                    words.append({"w": w.word.strip(), "start": round(base + w.start, 3), "end": round(base + w.end, 3)})
            print(f"\r{x.name}: {s.end:7.1f}s de {info.duration:.1f}s ({time.time() - t0:.0f}s decorridos)", end="", file=sys.stderr, flush=True)
        print(file=sys.stderr)
        base += info.duration
    doc = {"arquivo": ", ".join(p["arquivo"] for p in partes), "partes": partes, "modelo": a.modelo, "idioma": a.idioma,
           "duracao_s": round(base, 3), "n_palavras": len(words), "palavras": words}
    (out_dir / "transcricao-palavras.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    (out_dir / "transcricao.txt").write_text("\n".join(texto) + "\n", encoding="utf-8")
    print(f"{len(words)} palavras em {base:.1f}s de áudio; gravado em {out_dir}")


if __name__ == "__main__":
    main()
