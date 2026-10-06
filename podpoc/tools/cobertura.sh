#!/usr/bin/env bash
# Monta o corte de cobertura de cada vídeo gerado (assets/video/V01.mp4 ... V11.mp4):
# 1920x1080, 30 fps, recorte na duração prevista, grain leve, vinheta, fade de 0,4 s.
# Uso: bash tools/cobertura.sh [ep02]      (VIDEO_DIR=... para outra pasta)
set -euo pipefail
EP="${1:-ep02}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VIDEO_DIR="${VIDEO_DIR:-$ROOT/assets/video}"
OUT="$ROOT/episodios/$EP/render/cobertura"
TABLE="$ROOT/episodios/$EP/prompts-video.md"
mkdir -p "$OUT"
made=0; missing=()
for n in 01 02 03 04 05 06 07 08 09 10 11; do
  src="$VIDEO_DIR/V$n.mp4"
  if [ ! -f "$src" ]; then missing+=("V$n"); continue; fi
  dur=$(awk -F'|' -v id="V$n" '$2 ~ " "id" " {gsub(/[^0-9]/,"",$4); print $4}' "$TABLE" | head -1)
  dur="${dur:-8}"
  fo=$(awk -v d="$dur" 'BEGIN{print d-0.4}')
  ffmpeg -y -loglevel error -i "$src" -t "$dur" \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,vignette=PI/6,noise=alls=6:allf=t,fade=t=in:st=0:d=0.4,fade=t=out:st=$fo:d=0.4,format=yuv420p" \
    -an -c:v libx264 -crf 17 -preset medium "$OUT/V$n.mp4"
  made=$((made+1))
done
echo "cobertura: $made montados em $OUT"
[ ${#missing[@]} -gt 0 ] && echo "faltam: ${missing[*]} (gere e salve em assets/video/)"
exit 0
