#!/usr/bin/env python3
"""Monta o vídeo do episódio: fundo (B-roll) + Elvis recortado do fundo verde + overlays + SFX.

  python3 tools/montar_video.py ep02 plano              # gera montagem/plano.json (tudo que será montado e quando)
  python3 tools/montar_video.py ep02 fundo              # trilha de fundo contínua com os B-rolls e crossfades
  python3 tools/montar_video.py ep02 audio              # voz + SFX + trilha ambiente (stems e mix)
  python3 tools/montar_video.py ep02 video [--inicio S --fim S]   # composição em blocos (a janela serve de prévia)
  python3 tools/montar_video.py ep02 final              # junta os blocos e o áudio
  python3 tools/montar_video.py ep02 previa --inicio 0 --fim 90   # janela completa com áudio, 540p, leve

Camadas (de baixo para cima): fundo -> diagramas e cortes de arquivo -> ELVIS (canto inferior direito) ->
textos na tela, lower thirds, fotos de autor. Todas as contas de tempo saem do plano (código), nunca de cabeça.
Tempos: timeline FINAL = gravação + cold open (V01). Pré-requisitos: tempos-reais.json (alinhar_tempos.py).
"""
import argparse
import csv
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
W, H, FPS = 1920, 1080, 30
EL_W = 608           # recorte vertical do Elvis com 1080 de altura (810x1440 -> 608x1080)
XF = 0.8             # crossfade entre fundos (s)
CHUNK = 60.0         # tamanho máximo de cada bloco de composição (s)
COLD = 8.0

CLIPS = {  # clipe do Drive -> id do roteiro (conferido olhando os quadros)
    "V01": "gemini_aeeb3534", "V02": "gemini_73a2900f", "V03": "gemini_5391823f", "V04": "gemini_548d9448",
    "V05": "gemini_b2dcbe71", "V06": "gemini_c41444fa", "V07": "gemini_eb617bad", "V08": "gemini_9dd9098b",
    "V09": "gemini_5df69370", "V10": "prompt_split_peito_V10", "V11": "prompt_mesa_aberta_V11",
}
UNDER = {"diagram", "archive"}      # ficam sob o Elvis
TOP = {"quote", "invite", "author"}  # ficam sobre o Elvis


def run(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit("ffmpeg/ffprobe falhou:\n" + " ".join(str(c) for c in cmd)[:400] + "\n" + r.stderr[-1500:])
    return r


def dur_of(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).stdout.strip())


class Ep:
    def __init__(self, ep):
        self.ep = ep
        self.dir = ROOT / "episodios" / ep
        self.fonte = self.dir / "fonte"
        self.mdir = self.fonte / "montagem"
        self.mdir.mkdir(parents=True, exist_ok=True)
        self.render = self.dir / "render"

    def load_plan(self):
        p = self.mdir / "plano.json"
        if not p.exists():
            sys.exit("rode primeiro: montar_video.py %s plano" % self.ep)
        return json.loads(p.read_text(encoding="utf-8"))


def amostrar_verde(video):
    """Média dos cantos superiores (só fundo verde) do primeiro segundo, em 0xRRGGBB."""
    from PIL import Image
    tmp = video.parent / (video.stem + "_verde.png")
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", video, "-frames:v", "1", tmp])
    im = Image.open(tmp).convert("RGB")
    w, h = im.size
    px = []
    for box in ((0, 0, 80, 80), (w - 80, 0, w, 80), (0, h // 8, 80, h // 8 + 80), (w - 80, h // 8, w, h // 8 + 80)):
        c = im.crop(box).resize((1, 1), Image.BOX).getpixel((0, 0))
        px.append(c)
    r, g, b = (round(sum(p[i] for p in px) / len(px)) for i in range(3))
    tmp.unlink(missing_ok=True)
    return f"0x{r:02X}{g:02X}{b:02X}"


def etapa_plano(E):
    over = json.loads((E.dir / "tempos-reais.json").read_text(encoding="utf-8"))
    ov = json.loads((ROOT / "remotion/src/data/overlays.json").read_text(encoding="utf-8"))
    tl = list(csv.DictReader((E.dir / "timeline.csv").open(encoding="utf-8")))

    def tsec(s):
        m, rest = s.split(":")
        return int(m) * 60 + float(rest)

    ev = [{"id": r["id"], "t": tsec(r["tempo_real"]), "tipo": r["tipo"], "desc": r["descricao"]} for r in tl]
    tr = json.loads((E.dir / "transcricao-palavras.json").read_text(encoding="utf-8"))
    partes = []
    for k, p in enumerate(tr["partes"], 1):
        px = E.fonte / "proxy" / f"pt{k}.mp4"
        partes.append({"proxy": str(px), "audio_hq": str(E.fonte / "audio" / f"pt{k}_hq.wav"),
                       "inicio_final_s": round(COLD + p["inicio_s"], 3), "dur_s": p["duracao_s"],
                       "chroma": amostrar_verde(px) if px.exists() else None})
    total = round(COLD + tr["duracao_s"], 3)
    vstart = {e["id"]: e["t"] for e in ev if e["tipo"] == "video" and e["id"] in CLIPS}
    vstart["V01"] = 0.0
    ordem = sorted(vstart.items(), key=lambda kv: kv[1])
    fundo = []
    for i, (vid, t0) in enumerate(ordem):
        t1 = ordem[i + 1][1] if i + 1 < len(ordem) else total
        clip = E.fonte / "curtos" / f"{CLIPS[vid]}.mp4"
        hero = COLD if vid == "V01" else min(dur_of(clip), t1 - t0)
        fundo.append({"id": vid, "clip": str(clip), "inicio_s": round(t0, 3), "fim_s": round(t1, 3), "hero_s": round(hero, 3)})
    camadas = []
    for r in ov:
        webm = E.render / f"{r['id']}.webm"
        if not webm.exists():
            continue
        camadas.append({"id": r["id"], "kind": r["kind"], "arquivo": str(webm), "inicio_s": r["start_s"], "dur_s": r["dur_s"],
                        "sob_elvis": r["kind"] in UNDER})
    sfx = plano_sfx(E, ev, camadas, total)
    plano = {"total_s": total, "cold_open_s": COLD, "partes": partes, "fundo": fundo, "camadas": camadas, "sfx": sfx}
    (E.mdir / "plano.json").write_text(json.dumps(plano, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"plano: {total / 60:.1f} min, {len(fundo)} fundos, {len(camadas)} camadas, {len(sfx)} efeitos sonoros")
    for p in partes:
        print("  parte", Path(p["proxy"]).name, "verde", p["chroma"], "início", p["inicio_final_s"], "s")


def plano_sfx(E, ev, camadas, total):
    S = []
    add = lambda t, f, g, nota: S.append({"t": round(max(t, 0), 3), "arquivo": f, "ganho_db": g, "nota": nota})  # noqa: E731
    add(COLD - 1.74, "05_riser", -8, "riser até o hook")
    add(COLD, "02b_impact_whoom_final", -4, "impacto na entrada do hook")
    for e in ev:
        if e["tipo"] == "video" and e["id"] in CLIPS and e["id"] != "V01":
            add(e["t"] - 0.15, "04_whoosh", -10, f"transição para {e['id']}")
        if e["tipo"] == "quebra" and "tela escura" in e["desc"]:
            add(e["t"], "02_impact_whoom", -6, "corte seco para o número 4")
    for c in camadas:
        i, k, t = c["id"], c["kind"], c["inicio_s"]
        if k == "diagram":
            add(t, "01_system_whoom", -11, f"entrada do diagrama {i}")
        elif k == "archive":
            add(t, "07_page_flip" if i in ("arq-zohar", "arq-raziel") else "04_whoosh", -9, f"corte de arquivo {i}")
        elif k == "author":
            add(t + 0.35, "08_camera_shutter", -11, f"foto de {i}")
        elif i in ("q-codigo", "q-fechadura"):
            add(t, "06_magic_reveal", -9, f"revelação {i}")
        else:
            add(t, "03_pop_click", -17, f"texto na tela {i}")
    S.sort(key=lambda x: x["t"])
    return S


def etapa_fundo(E, args):
    P = E.load_plan()
    bg = E.mdir / "bg"
    bg.mkdir(exist_ok=True)
    segs = []
    for k, f in enumerate(P["fundo"]):
        L = f["fim_s"] - f["inicio_s"] + (XF if k + 1 < len(P["fundo"]) else 0)  # cada trecho cobre o crossfade seguinte
        out = bg / f"seg{k:02d}_{f['id']}.mp4"
        segs.append((out, L))
        if out.exists() and abs(dur_of(out) - L) < 0.2:
            print("já existe", out.name)
            continue
        hero = min(f["hero_s"], L)
        rest = max(L - hero, 0.0)
        scale = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p,setsar=1"
        mood = scale + ",eq=brightness=-0.17:saturation=0.82,gblur=sigma=3.5"
        # fundo: o clipe inteiro, depois vai e volta (ping-pong) escurecido e levemente desfocado
        fc = (f"[0:v]{scale},split=2[h0][h1];[h0]trim=0:{hero:.3f},setpts=PTS-STARTPTS[hero];"
              f"[h1]{mood.split(',', 1)[1] if False else 'null'}[unused];"
              f"[1:v]{mood},trim=0:{max(rest, 0.04):.3f},setpts=PTS-STARTPTS[mood]")
        if rest <= 0.05:
            fc = f"[0:v]{scale},trim=0:{L:.3f},setpts=PTS-STARTPTS[v]"
        else:
            fc = (f"[0:v]{scale},trim=0:{hero:.3f},setpts=PTS-STARTPTS[hero];"
                  f"[1:v]{mood},trim=0:{rest:.3f},setpts=PTS-STARTPTS[mood];"
                  f"[hero][mood]xfade=transition=fade:duration=1.0:offset={max(hero - 1.0, 0):.3f}[v]")
        loop = E.mdir / f"pingpong_{f['id']}.mp4"
        if rest > 0.05 and not loop.exists():
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", f["clip"], "-filter_complex",
                 "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]", "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "16", loop])
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", f["clip"]]
        if rest > 0.05:
            cmd += ["-stream_loop", "-1", "-i", loop]
        cmd += ["-filter_complex", fc, "-map", "[v]", "-t", f"{L:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
                "-pix_fmt", "yuv420p", "-r", str(FPS), out]
        print("fundo", f["id"], f"{L:.1f}s")
        run(cmd)
    # junta com crossfade
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for out, _ in segs:
        cmd += ["-i", out]
    chain, cur_len, last = [], segs[0][1], "[0:v]"
    for k in range(1, len(segs)):
        off = cur_len - XF
        lab = f"[x{k}]"
        chain.append(f"{last}[{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{lab}")
        cur_len = off + segs[k][1]
        last = lab
    cmd += ["-filter_complex", ";".join(chain), "-map", last, "-t", f"{P['total_s']:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast",
            "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS), E.mdir / "fundo.mp4"]
    print("juntando fundos ...")
    run(cmd)
    print("fundo.mp4:", round(dur_of(E.mdir / "fundo.mp4"), 2), "s (esperado", P["total_s"], ")")


def blocos(P, ini, fim):
    cortes = {ini, fim, COLD}
    for p in P["partes"]:
        cortes.add(p["inicio_final_s"])
    t = ini
    while t < fim:
        cortes.add(round(t, 3))
        t += CHUNK
    pts = sorted(c for c in cortes if ini <= c <= fim)
    return [(a, b) for a, b in zip(pts, pts[1:]) if b - a > 0.05]


def etapa_video(E, args):
    P = E.load_plan()
    ini = args.inicio if args.inicio is not None else 0.0
    fim = args.fim if args.fim is not None else P["total_s"]
    out_dir = E.mdir / ("blocos" if args.inicio is None and args.fim is None else "previa_blocos")
    out_dir.mkdir(exist_ok=True)
    lista = []
    for k, (a, b) in enumerate(blocos(P, ini, fim)):
        d = b - a
        out = out_dir / f"b{k:03d}_{a:08.2f}.mp4"
        lista.append(out)
        if out.exists() and abs(dur_of(out) - d) < 0.1:
            continue
        inputs, fc = ["-ss", f"{a:.3f}", "-t", f"{d:.3f}", "-i", str(E.mdir / "fundo.mp4")], ["[0:v]format=yuv420p[b0]"]
        n_in, cur = 1, "b0"

        def add_overlay(c):
            nonlocal n_in, cur
            s, e = c["inicio_s"], c["inicio_s"] + c["dur_s"]
            if e <= a or s >= b:
                return
            ss = max(a - s, 0.0)
            off = max(s - a, 0.0)
            inputs.extend(["-ss", f"{ss:.3f}", "-c:v", "libvpx-vp9", "-i", c["arquivo"]])
            fc.append(f"[{n_in}:v]format=yuva420p,setpts=PTS-STARTPTS+{off:.3f}/TB[o{n_in}]")
            nxt = f"b{n_in}"
            fc.append(f"[{cur}][o{n_in}]overlay=0:0:format=auto:eof_action=pass:enable='between(t,{off:.3f},{off + min(e, b) - max(s, a):.3f})'[{nxt}]")
            cur = nxt
            n_in += 1

        for c in P["camadas"]:
            if c["sob_elvis"]:
                add_overlay(c)
        part = next((p for p in P["partes"] if p["inicio_final_s"] - 1e-6 <= a < p["inicio_final_s"] + p["dur_s"] - 1e-6), None)
        if part:
            r0 = a - part["inicio_final_s"]
            inputs.extend(["-ss", f"{r0:.3f}", "-t", f"{d:.3f}", "-i", part["proxy"]])
            fc.append(f"[{n_in}:v]chromakey=color={part['chroma']}:similarity=0.16:blend=0.06,despill=type=green:mix=0.5:expand=0.1,"
                      f"scale={EL_W}:{H}:flags=lanczos,format=yuva420p,setpts=PTS-STARTPTS[el]")
            fc.append(f"[{cur}][el]overlay=x={W - EL_W}:y=0:format=auto:shortest=0[b{n_in}]")
            cur = f"b{n_in}"
            n_in += 1
        for c in P["camadas"]:
            if not c["sob_elvis"]:
                add_overlay(c)
        fc.append(f"[{cur}]format=yuv420p[v]")
        cmd = ["ffmpeg", "-y", "-loglevel", "error"] + inputs + ["-filter_complex", ";".join(fc), "-map", "[v]", "-t", f"{d:.3f}", "-an",
                                                                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
                                                                 "-r", str(FPS), "-g", "60", out]
        print(f"bloco {k:03d}: {a:.1f}s a {b:.1f}s ({n_in - 1} entradas)", flush=True)
        run(cmd)
    (out_dir / "lista.txt").write_text("".join(f"file '{p}'\n" for p in lista), encoding="utf-8")
    dest = E.mdir / ("video.mp4" if out_dir.name == "blocos" else "previa_video.mp4")
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", out_dir / "lista.txt", "-c", "copy", dest])
    print(dest.name, round(dur_of(dest), 2), "s")


def etapa_audio(E, args):
    P = E.load_plan()
    sfxdir = E.fonte / "sfx"
    # áudio de alta qualidade das gravações (as .wav de 16 kHz servem só para transcrever)
    for k, p in enumerate(P["partes"], 1):
        hq = Path(p["audio_hq"])
        if not hq.exists():
            src = E.fonte / "gravacao" / f"Edits_Ep2_pt{k}.mp4"
            print("extraindo áudio HQ", src.name)
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", hq])
    ins, fc = [], []
    for k, p in enumerate(P["partes"]):
        ins += ["-i", p["audio_hq"]]
        ms = int(round(p["inicio_final_s"] * 1000))
        fc.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,adelay={ms}|{ms}[v{k}]")
    nv = len(P["partes"])
    fc.append("".join(f"[v{k}]" for k in range(nv)) + f"amix=inputs={nv}:normalize=0:duration=longest,apad=whole_dur={P['total_s']:.3f}[voz]")
    # trilha ambiente contínua, bem baixa, com entrada e saída suaves
    ins += ["-stream_loop", "-1", "-i", str(sfxdir / "10_bed_drone_loop.wav")]
    fc.append(f"[{nv}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{P['total_s']:.3f},volume=-30dB,"
              f"afade=t=in:st=0:d=2,afade=t=out:st={P['total_s'] - 6:.3f}:d=6[bed]")
    labels = ["[bed]"]
    for k, s in enumerate(P["sfx"]):
        i = nv + 1 + k
        ins += ["-i", str(sfxdir / (s["arquivo"] + ".wav"))]
        ms = int(round(s["t"] * 1000))
        fc.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume={s['ganho_db']}dB,adelay={ms}|{ms}[s{k}]")
        labels.append(f"[s{k}]")
    fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{P['total_s']:.3f}[sfx]")
    fc.append("[voz][sfx]amix=inputs=2:normalize=0,loudnorm=I=-16:LRA=11:TP=-1.5,alimiter=limit=0.95,"
              f"atrim=0:{P['total_s']:.3f}[mix]")
    (E.mdir / "audio.filter").write_text(";\n".join(fc), encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-loglevel", "error"] + ins + ["-filter_complex_script", E.mdir / "audio.filter",
                                                          "-map", "[voz]", "-c:a", "pcm_s16le", E.mdir / "stem_voz.wav",
                                                          "-map", "[sfx]", "-c:a", "pcm_s16le", E.mdir / "stem_sfx_trilha.wav",
                                                          "-map", "[mix]", "-c:a", "pcm_s16le", E.mdir / "audio_mix.wav"]
    print(f"misturando áudio ({len(P['sfx'])} efeitos) ...")
    run(cmd)
    print("audio_mix.wav", round(dur_of(E.mdir / "audio_mix.wav"), 2), "s")


def etapa_final(E, args):
    P = E.load_plan()
    out = E.dir / "final" / "episodio-02-1080p.mp4"
    out.parent.mkdir(exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", E.mdir / "video.mp4", "-i", E.mdir / "audio_mix.wav", "-c:v", "copy", "-c:a", "aac",
         "-b:a", "256k", "-movflags", "+faststart", "-shortest", out])
    print(out, round(dur_of(out), 2), "s;", round(out.stat().st_size / 1e6), "MB")


def etapa_previa(E, args):
    ini, fim = args.inicio or 0.0, args.fim or 90.0
    args.inicio, args.fim = ini, fim
    etapa_video(E, args)
    out = E.dir / "final" / f"previa-{int(ini)}-{int(fim)}s.mp4"
    out.parent.mkdir(exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", E.mdir / "previa_video.mp4", "-ss", f"{ini:.3f}", "-t", f"{fim - ini:.3f}", "-i",
         E.mdir / "audio_mix.wav", "-vf", "scale=960:540", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-c:a", "aac", "-b:a", "160k",
         "-shortest", "-movflags", "+faststart", out])
    print(out, round(out.stat().st_size / 1e6, 1), "MB")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episodio")
    ap.add_argument("etapa", choices=["plano", "fundo", "audio", "video", "final", "previa"])
    ap.add_argument("--inicio", type=float)
    ap.add_argument("--fim", type=float)
    a = ap.parse_args()
    E = Ep(a.episodio)
    {"plano": lambda: etapa_plano(E), "fundo": lambda: etapa_fundo(E, a), "audio": lambda: etapa_audio(E, a),
     "video": lambda: etapa_video(E, a), "final": lambda: etapa_final(E, a), "previa": lambda: etapa_previa(E, a)}[a.etapa]()


if __name__ == "__main__":
    main()
