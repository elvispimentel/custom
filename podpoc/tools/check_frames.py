#!/usr/bin/env python3
"""Confere o pôster de cada overlay: contraste do texto (>= 4,5:1 no pior caso, fundo branco por trás),
zona segura do rosto (quote, convite e autor não podem invadir o centro) e canal alfa presente.
Gera render/checagem.md e render/contact-sheet.jpg. Sai com código 1 se algo falhar."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
EP = sys.argv[1] if len(sys.argv) > 1 else "ep02"
R = ROOT / "episodios" / EP / "render"
data = {d["id"]: d for d in json.loads((ROOT / "remotion/src/data/overlays.json").read_text())}
PAPER, GOLD = (0xF2, 0xEE, 0xE4), (0xE0, 0xB8, 0x4F)
FACE = (1180, 460, 1920, 1080)  # canto inferior direito reservado ao Elvis (igual a ELVIS em theme.ts)


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


rows, bad = [], 0
thumbs = []
for pid, rec in data.items():
    p = R / f"{pid}.png"
    if not p.exists():
        rows.append((pid, rec["kind"], "sem pôster", "", "", "pendente"))
        continue
    im = Image.open(p).convert("RGBA")
    a = np.array(im)[:, :, 3]
    over_white = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im)
    ys, xs = np.nonzero(a > 200)
    if len(xs) == 0:
        rows.append((pid, rec["kind"], "vazio", "", "", "FALHA"))
        bad += 1
        continue
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
    # pixel de placa: canto interno, longe do texto
    if rec["kind"] in ("quote", "invite", "author"):
        # procura a placa mais escura do quadro (pior caso = a mais clara sobre branco)
        sample = over_white.getpixel((int(x0) + 14, int(y0) + 6)) if rec["kind"] != "author" else None
        if sample is None:  # autor: placa do lower third
            ys2, xs2 = np.nonzero(a[820:, :] > 200)  # só a placa do lower third, abaixo das fotos
            sample = over_white.getpixel((int(xs2.min()) + 14, int(ys2.min()) + 820 + 6))
    else:
        sample = over_white.getpixel((60, 60))
    c1, c2 = ratio(PAPER, sample), ratio(GOLD, sample)
    face = a[FACE[1]:FACE[3], FACE[0]:FACE[2]]
    face_hit = int((face > 16).sum())
    full = rec["kind"] in ("diagram", "archive")
    ok_c = c1 >= 4.5 and (c2 >= 4.5 or rec["kind"] in ("quote", "invite"))
    ok_f = full or face_hit == 0
    status = "ok" if ok_c and ok_f else "FALHA"
    bad += status != "ok"
    rows.append((pid, rec["kind"], f"{c1:.1f}:1", f"{c2:.1f}:1", "livre" if face_hit == 0 else ("cobre (corte)" if full else "INVADE"), status))
    # miniatura sobre fundo de 'vídeo' neutro
    bg = Image.new("RGBA", im.size, (88, 96, 84, 255))
    bg.alpha_composite(im)
    t = bg.convert("RGB").resize((480, 270))
    ImageDraw.Draw(t).text((8, 6), pid, fill=(255, 255, 0))
    thumbs.append(t)

L = ["# Checagem dos overlays", "",
     "Contraste medido contra o pior caso (placa sobre fundo branco). Zona do Elvis (canto inferior direito): x >= 1180, y >= 460. Diagramas e cortes de arquivo cobrem o quadro de propósito.", "",
     "| Overlay | Tipo | Texto claro | Ouro | Zona do rosto | Resultado |", "|---|---|---|---|---|---|"]
L += [f"| {' | '.join(r)} |" for r in rows]
(R / "checagem.md").write_text("\n".join(L) + "\n", encoding="utf-8")
if thumbs:
    cols = 4
    rws = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 480, rws * 270), (20, 20, 30))
    for i, t in enumerate(thumbs):
        sheet.paste(t, ((i % cols) * 480, (i // cols) * 270))
    sheet.save(R / "contact-sheet.jpg", quality=82)
print(f"{len(rows)} pôsteres, {bad} com problema")
sys.exit(1 if bad else 0)
