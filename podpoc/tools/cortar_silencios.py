#!/usr/bin/env python3
"""Detecta silêncios com ffmpeg (silencedetect) e gera a lista de trechos a manter e a cortar.
Todos os cálculos de tempo são feitos aqui, em código; nunca peça a um modelo para somar durações.

Uso:
  python3 tools/cortar_silencios.py gravacao.mp4                      # só analisa: mostra e grava JSON
  python3 tools/cortar_silencios.py gravacao.mp4 --render saida.mp4   # também monta o vídeo sem os silêncios

Parâmetros: --noise -30 (dB), --min 0.6 (s de silêncio mínimo), --pad 0.10 (s de respiro que sobra de cada lado
do corte), --merge 0.25 (junta trechos mantidos separados por menos que isso).
Os cortes são ajustados para a grade de quadros do vídeo (evita corte no meio de um quadro).
Saídas ao lado da entrada: <nome>.cortes.json e <nome>.cortes.srt (marcadores para o CapCut).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,r_frame_rate",
             "-of", "json", str(path)])
    if r.returncode:
        sys.exit(f"ffprobe falhou: {r.stderr.strip()}")
    info = json.loads(r.stdout)
    dur = float(info["format"]["duration"])
    fps = 30.0
    has_video = False
    for s in info["streams"]:
        if s["codec_type"] == "video":
            has_video = True
            n, d = s["r_frame_rate"].split("/")
            fps = float(n) / float(d) if float(d) else 30.0
    return dur, fps, has_video


def detect(path, noise, min_s):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", f"silencedetect=noise={noise}dB:d={min_s}",
             "-vn", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return starts, ends


def snap(t, fps):
    return round(t * fps) / fps


def plan(duration, fps, starts, ends, pad, merge):
    # silêncio que vai até o fim do arquivo não tem silence_end
    sil = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else duration
        s, e = max(0.0, s), min(duration, e)
        s2, e2 = s + pad, e - pad  # deixa um respiro dentro de cada lado do corte
        if s == 0.0:
            s2 = 0.0  # silêncio no começo: corta até o fim dele, com respiro só no final
        if e >= duration - 1e-3:
            e2 = duration
        if e2 - s2 > 1.0 / fps:
            sil.append((snap(s2, fps), snap(e2, fps)))
    keep, cur = [], 0.0
    for s, e in sil:
        if s - cur > 1.0 / fps:
            keep.append((cur, s))
        cur = e
    if duration - cur > 1.0 / fps:
        keep.append((cur, snap(duration, fps)))
    merged = []
    for s, e in keep:
        if merged and s - merged[-1][1] < merge:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    return merged


def srt_t(sec):
    ms = int(round(sec * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def render(src, out, keep, has_video, fps):
    parts, labels = [], []
    for i, (s, e) in enumerate(keep):
        if has_video:
            parts.append(f"[0:v]trim=start={s:.5f}:end={e:.5f},setpts=PTS-STARTPTS[v{i}]")
            labels.append(f"[v{i}]")
        parts.append(f"[0:a]atrim=start={s:.5f}:end={e:.5f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[a{i}]")
    n = len(keep)
    if has_video:
        concat_in = "".join(f"[v{i}][a{i}]" for i in range(n))
        parts.append(f"{concat_in}concat=n={n}:v=1:a=1[v][a]")
        maps = ["-map", "[v]", "-map", "[a]"]
        codec = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"]
    else:
        concat_in = "".join(f"[a{i}]" for i in range(n))
        parts.append(f"{concat_in}concat=n={n}:v=0:a=1[a]")
        maps = ["-map", "[a]"]
        codec = ["-c:a", "aac", "-b:a", "192k"]
    script = Path(str(out) + ".filter.txt")
    script.write_text(";\n".join(parts), encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-filter_complex_script", str(script)] + maps + codec + [str(out)]
    r = run(cmd)
    script.unlink(missing_ok=True)
    if r.returncode:
        sys.exit(f"ffmpeg falhou: {r.stderr.strip()[:600]}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("--noise", type=float, default=-30.0)
    ap.add_argument("--min", type=float, default=0.6, dest="min_s")
    ap.add_argument("--pad", type=float, default=0.10)
    ap.add_argument("--merge", type=float, default=0.25)
    ap.add_argument("--render")
    a = ap.parse_args()
    src = Path(a.entrada)
    if not src.exists():
        sys.exit(f"não achei {src}")
    duration, fps, has_video = probe(src)
    starts, ends = detect(src, a.noise, a.min_s)
    keep = plan(duration, fps, starts, ends, a.pad, a.merge)
    kept = sum(e - s for s, e in keep)
    cuts, cur = [], 0.0
    for s, e in keep:
        if s - cur > 1e-6:
            cuts.append((cur, s))
        cur = e
    if duration - cur > 1e-6:
        cuts.append((cur, duration))
    res = {
        "entrada": str(src), "duracao_s": round(duration, 3), "fps": round(fps, 3),
        "parametros": {"noise_db": a.noise, "min_s": a.min_s, "pad_s": a.pad, "merge_s": a.merge},
        "mantido_s": round(kept, 3), "cortado_s": round(duration - kept, 3),
        "trechos_mantidos": [[round(s, 3), round(e, 3)] for s, e in keep],
        "trechos_cortados": [[round(s, 3), round(e, 3)] for s, e in cuts],
    }
    base = src.with_suffix("")
    Path(str(base) + ".cortes.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    srt = [f"{i}\n{srt_t(s)} --> {srt_t(e)}\n[CORTE] {e - s:.2f}s de silêncio" for i, (s, e) in enumerate(cuts, 1)]
    Path(str(base) + ".cortes.srt").write_text("\n\n".join(srt) + "\n", encoding="utf-8")
    print(f"duração {duration:.2f}s | mantém {kept:.2f}s em {len(keep)} trechos | corta {duration - kept:.2f}s em {len(cuts)} pausas")
    if a.render:
        render(src, Path(a.render), keep, has_video, fps)
        out_dur, _, _ = probe(Path(a.render))
        print(f"renderizado: {a.render} ({out_dur:.2f}s; esperado {kept:.2f}s; diferença {abs(out_dur - kept) * 1000:.0f} ms)")


if __name__ == "__main__":
    main()
