#!/usr/bin/env python3
"""Lê episodios/epNN/roteiro-e-pacote.md e gera tudo que depende de tempo:
overlays.json (Remotion), timeline.csv, timeline.edl, cue-sheet.md, prompts-video.md.

Tempo estimado = palavras faladas / 145 wpm + pausas explícitas das [QUEBRA DE PADRÃO]
+ cold open (V01) antes do hook. É heurística: ajustar com a gravação real.

Uso: python3 tools/parse_roteiro.py [ep02]
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP = sys.argv[1] if len(sys.argv) > 1 else "ep02"
EPDIR = ROOT / "episodios" / EP
SRC = EPDIR / "roteiro-e-pacote.md"
FPS = 30
WPM = 145
COLD_OPEN_S = 8.0       # V01 entra antes do hook; empurra todo o resto
EDL_START_TC = "01:00:00:00"

# ---------------------------------------------------------------- ids de texto na tela
QUOTE_IDS = {
    "ninguém nunca te mostrou o mecanismo que está embaixo": "q-mecanismo",
    "Siga o canal. Deixe o like.": "convite-1",
    "E se forem um código?": "q-codigo",
    "Não é o tempo começando a correr. É uma força organizadora começando a estruturar a energia.": "q-forca",
    "Um fluxo de informação em quatro camadas.": "q-camadas",
    "Quatro letras, quatro elementos, quatro bases.": "q-bases",
    "Não foi um erro. Foi uma restrição arquitetônica.": "q-restricao",
    "Adão ainda está dormindo.": "q-adao",
    "Ela teve que esquecer quem era.": "q-esquecer",
    "A queda não foi um pecado: foi a descida voluntária do espírito pra matéria.": "q-queda",
    "O Espírito vestiu um traje espacial biológico.": "q-traje",
    "A lâmina fecha a porta rápida, mas mostra o caminho longo.": "q-lamina",
    "Ele era o administrador do sistema, e perdeu as credenciais.": "q-credenciais",
    "A emoção é o teclado que insere os comandos no código.": "q-teclado",
    "A gente veste a fechadura e gera as chaves ao mesmo tempo.": "q-fechadura",
    "perder o acesso ao que sabe bem na hora que a conversa mais importa": "cta-acesso",
    "Comenta aqui embaixo.": "convite-2",
    "Só precisamos aprender a operar.": "q-operar",
}
INVITE_IDS = {"convite-1", "convite-2", "cta-acesso"}

# ---------------------------------------------------------------- autores (nome, obra, ano)
# Obra e ano só quando o roteiro ou a tabela de imagens os dá. Sem inventar.
AUTHORS = {
    "braden": dict(name="Gregg Braden", work="O Código de Deus", year="2004",
                   photo="braden", cover="capa-braden-pt", living=True),
    "levi": dict(name="Éliphas Lévi", work="Dogma e Ritual de Alta Magia", year="",
                 photo="levi-retrato", cover="capa-levi-en", living=False),
    "bailey": dict(name="Alice Bailey", work="", year="", photo="bailey", cover="", living=False),
    "deldebbio": dict(name="Marcelo Del Debbio", work="Árvore da Vida cabalística", year="",
                      photo="deldebbio", cover="", living=True),
    "deepak": dict(name="Deepak Sankara Veda", work="Os 72 Nomes de Deus", year="2023", photo="deepak", cover="capa-deepak", living=True),
    "blavatsky": dict(name="Helena Blavatsky", work="", year="", photo="blavatsky-nypl", cover="", living=False),
    "goddard": dict(name="Neville Goddard", work="", year="", photo="goddard", cover="", living=False),
}
# primeira menção por tag [REF. VISUAL: foto de X ...]
AUTHOR_TAGS = [("Gregg Braden", "braden"), ("Éliphas Lévi", "levi"), ("Alice Bailey", "bailey"),
               ("Marcelo Del Debbio", "deldebbio"), ("Deepak Sankara Veda", "deepak")]
# autores sem tag própria: ancorar na fala
AUTHOR_ANCHORS = [("A Blavatsky destrincha isso", "blavatsky"),
                  ("Pra decodificar isso, as ideias do Neville Goddard", "goddard")]

# ---------------------------------------------------------------- vídeos V01..V11 → ancora na fala
VIDEO_ANCHORS = {
    "V01": None,  # cold open
    "V02": "Aí, limpando o móvel",
    "V03": "Pensa assim: não é um relojoeiro",
    "V04": "E o que esses quatro elementos formam, combinados?",
    "V05": "Segundo o Zohar, essa luz infinita precisou ser ocultada",
    "V06": "E o Éden, segundo o Goddard, não é um lugar físico",
    "V07": "E essa descida na densidade leva direto",
    "V08": "E aí o texto traz outro símbolo que parece tecnologia",
    "V09": "Segundo a tradição, Adão, já dentro do invólucro de pele",
    "V10": "Então como alguém aciona essas chaves",
    "V11": "Lá no começo eu falei de uma mesa antiga",
}

# ---------------------------------------------------------------- imagens de arquivo (cards) por tag
ARCHIVE_TAGS = [  # (trecho da tag, id do overlay, [ids de imagem], legenda curta)
    ("pintura clássica de Adão adormecido", "arq-adao", ["leyden-1529"], "Lucas van Leyden, A Criação de Eva, 1529"),
    ("ilustração do anjo Raziel", "arq-raziel", ["sefer-raziel-1700"], "Sefer Raziel HaMalakh, 1700"),
    ("astronauta em traje espacial", "arq-astronauta", ["nasa-as11-40-5903", "gray-1918"],
     "NASA, Apollo 11 · Gray's Anatomy, 1918"),
]
ARCHIVE_ANCHORS = [("O ponto de partida que une todas essas fontes", "arq-zohar", ["zohar-1558"],
                    "Sefer ha-Zohar, Mântua, 1558")]

DIAGRAM_TAGS = [
    ("diagrama da Árvore da Vida com Chokmah", "fases", "diagram"),
    ("esquema com H, N, O e C", "braden-mapa", "diagram"),
    ("Árvore da Vida com o caminho de Zayn", "zayn", "diagram"),
    ("texto hebraico de Gênesis 1:1", "genesis-hebraico", "diagram"),
    ("o tetragrama em hebraico", "tetragrama", "diagram"),
    ("dupla hélice de DNA", "helice", "diagram"),
]

# ---------------------------------------------------------------- parsing
MARK = re.compile(r"^(?:#+\s*)?(?:\*\*)?(?:\\\[|&#91;)(.+?)\\\](?:\*\*)?(?:\s*\([A-Z]+\))?\s*$")


def clean(s):
    return s.replace("\\[", "[").replace("\\]", "]").replace("&#91;", "[").strip()


def parse():
    text = SRC.read_text(encoding="utf-8")
    body = text.split("## Roteiro, parte 1", 1)[1].split("\n## Título", 1)[0]
    lines, words, pause = [], 0, 0.0
    cur = {"kind": None}
    items = []  # sequência: spoken ou marker
    for raw in body.splitlines():
        s = raw.strip()
        if not s or s.startswith("Fala só sua"):
            continue
        m = MARK.match(s)
        if m:
            label = clean(m.group(1))
            tag, _, rest = label.partition(":")
            if " — " in tag and ":" not in label.split(" — ")[0]:
                tag = tag.split(" — ")[0]
            items.append({"t": "mark", "tag": tag.strip(), "rest": rest.strip(), "label": label})
            continue
        if s.startswith("#"):
            continue
        items.append({"t": "say", "text": s})
    # tempos
    for it in items:
        if it["t"] == "say":
            n = len(it["text"].split())
            it["w0"], it["w1"] = words, words + n
            it["p0"] = pause
            words += n
        else:
            it["w1"] = words
            it["p1"] = pause
            if it["tag"].startswith("QUEBRA"):
                mm = re.search(r"(\d+) segundos?", it["rest"])
                if mm:
                    pause += int(mm.group(1))
                elif "pausa curta" in it["rest"]:
                    pause += 1
    return items, words


def T(words, pause=0.0):
    return COLD_OPEN_S + words * 60.0 / WPM + pause


def tc(seconds, start="00:00:00:00"):
    h0, m0, s0, f0 = (int(x) for x in start.split(":"))
    total = round(seconds * FPS) + ((h0 * 60 + m0) * 60 + s0) * FPS + f0
    f = total % FPS
    s = (total // FPS) % 60
    m = (total // FPS // 60) % 60
    h = total // FPS // 3600
    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"


def mmss(sec, tenths=False):
    tt = int(sec * 10)
    s = tt // 10
    base = f"{s // 60}:{s % 60:02d}"
    return f"{base}.{tt % 10}" if tenths else base


def say_before(items, i):
    for j in range(i - 1, -1, -1):
        if items[j]["t"] == "say":
            return items[j]
    return None


def find_say(items, starts):
    for it in items:
        if it["t"] == "say" and starts in it["text"]:
            return it
    raise SystemExit(f"âncora não encontrada: {starts!r}")


def main():
    items, total_words = parse()
    ev, ov = [], []  # eventos da timeline, registros de overlay

    def add_ev(t, tipo, desc, eid=""):
        ev.append({"t": t, "tipo": tipo, "desc": desc, "id": eid})

    def add_ov(oid, kind, start, dur, **props):
        rec = dict(id=oid, kind=kind, start_s=round(start, 2), dur_s=round(dur, 2),
                   frames=int(round(dur * FPS)), **props)
        ov.append(rec)
        add_ev(start, "overlay", f"{oid} ({kind}, {dur:.1f}s)", oid)

    add_ev(0, "video", "V01 cold open turbulento (8s) → depois o hook", "V01")

    seen_quotes = set()
    for i, it in enumerate(items):
        if it["t"] != "mark":
            continue
        tag, rest = it["tag"], it["rest"]
        t_after = T(it["w1"], it["p1"])
        prev = say_before(items, i)
        par_start = T(prev["w0"], prev["p0"]) if prev else t_after
        par_dur = (prev["w1"] - prev["w0"]) * 60.0 / WPM if prev else 3

        if tag == "HOOK":
            add_ev(COLD_OPEN_S, "estrutura", "HOOK")
        elif tag == "IDENTIDADE":
            add_ev(t_after, "estrutura", "IDENTIDADE")
        elif tag.startswith("CONVITE"):
            add_ev(t_after, "estrutura", it["label"])
        elif tag.startswith("BLOCO") or tag.startswith("TEN") or tag.startswith("CTA") or tag.startswith("KETSU"):
            add_ev(t_after, "estrutura", it["label"])
        elif tag == "ABERTURA FIXA":
            vid = "P1" if "P1" in rest else "P2"
            add_ev(t_after, "abertura-fixa", f"Entra vídeo {vid} (já existe)", vid)
        elif tag == "TEXTO NA TELA":
            phrase = rest.strip().strip('"')
            qid = QUOTE_IDS[phrase]
            seen_quotes.add(qid)
            n = len(phrase.split())
            reveal = n * 60.0 / WPM
            dur = reveal + 1.6 + 0.5
            kind = "invite" if qid in INVITE_IDS else "quote"
            add_ov(qid, kind, max(t_after - reveal, COLD_OPEN_S), dur, text=phrase, reveal_s=round(reveal, 2))
        elif tag == "QUEBRA DE PADRÃO":
            add_ev(t_after, "quebra", rest, "")
        elif tag == "REF. VISUAL":
            handled = False
            for key, aid in AUTHOR_TAGS:
                if key in rest and rest.startswith("foto de"):
                    a = AUTHORS[aid]
                    add_ov(aid, "author", max(t_after - 2.5, COLD_OPEN_S), 5.0, **a)
                    handled = True
            for key, oid, kind in DIAGRAM_TAGS:
                if key in rest:
                    dur = min(max(par_dur + 1.0, 8.0), 20.0)
                    if oid in ("tetragrama", "helice"):
                        dur = 5.0
                    if oid == "genesis-hebraico":
                        dur = 6.0
                    add_ov(oid, "diagram", par_start if oid not in ("tetragrama", "genesis-hebraico") else max(t_after - 1.5, COLD_OPEN_S), dur)
                    handled = True
            for key, oid, imgs, cap in ARCHIVE_TAGS:
                if key in rest:
                    add_ov(oid, "archive", max(t_after - 3.0, COLD_OPEN_S), 5.0, images=imgs, caption=cap)
                    handled = True
            if not handled:
                add_ev(t_after, "ref-visual", rest)

    assert seen_quotes == set(QUOTE_IDS.values()), f"textos sem marcador: {set(QUOTE_IDS.values()) - seen_quotes}"

    for key, aid in AUTHOR_ANCHORS:
        s = find_say(items, key)
        add_ov(aid, "author", T(s["w0"], s["p0"]) + 1.0, 5.0, **AUTHORS[aid])
    for key, oid, imgs, cap in ARCHIVE_ANCHORS:
        s = find_say(items, key)
        add_ov(oid, "archive", T(s["w0"], s["p0"]), 5.0, images=imgs, caption=cap)

    # vídeos V02..V11
    prompts = extract_prompts()
    for vid, anchor in VIDEO_ANCHORS.items():
        if anchor is None:
            continue
        s = find_say(items, anchor)
        add_ev(T(s["w0"], s["p0"]), "video", f"{vid} {prompts[vid]['title']} ({prompts[vid]['dur']}s)", vid)

    ev.sort(key=lambda e: e["t"])
    ov.sort(key=lambda r: r["start_s"])
    total_s = T(total_words, 0) + sum(0 for _ in [])

    # ---- overlays.json
    out = ROOT / "remotion" / "src" / "data" / "overlays.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(ov, ensure_ascii=False, indent=1), encoding="utf-8")

    # ---- timeline.csv
    with (EPDIR / "timeline.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "tempo_estimado", "tipo", "descricao"])
        for k, e in enumerate(ev, 1):
            w.writerow([e["id"] or f"m{k:03d}", mmss(e["t"], True), e["tipo"], e["desc"]])

    # ---- EDL (marcadores CMX 3600, convenção DaVinci Resolve)
    colors = {"video": "ResolveColorBlue", "overlay": "ResolveColorYellow", "quebra": "ResolveColorRed",
              "estrutura": "ResolveColorGreen", "abertura-fixa": "ResolveColorPurple", "ref-visual": "ResolveColorCyan"}
    lines = [f"TITLE: PodPoc {EP} marcadores", "FCM: NON-DROP FRAME", ""]
    for k, e in enumerate(ev, 1):
        a, b = tc(e["t"], EDL_START_TC), tc(e["t"] + 1 / FPS, EDL_START_TC)
        name = (e["id"] + " " if e["id"] else "") + e["desc"].split(":")[0][:60]
        lines.append(f"{k:03d}  001      V     C        {a} {b} {a} {b}")
        lines.append(f" |C:{colors.get(e['tipo'], 'ResolveColorBlue')} |M:{name} |D:1")
        lines.append("")
    (EPDIR / "timeline.edl").write_text("\n".join(lines), encoding="utf-8")

    write_capcut_srt(ev, extract_prompts())
    write_cues(items, ev)
    write_prompts_md(prompts, ev)
    print(f"{len(ov)} overlays, {len(ev)} marcadores, duração estimada {mmss(total_s)}")


# ---------------------------------------------------------------- CapCut: o CapCut não importa EDL
def srt_t(sec):
    ms = int(round(sec * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def write_capcut_srt(ev, prompts):
    """Um bloco de legenda por marcador. No CapCut: Texto > Legendas > Importar legendas. A trilha de texto vira
    uma régua de marcadores com tempo e nome, começando em 0:00 (sem o offset de 01:00:00:00 do EDL)."""
    dur_of = {r["id"]: r["dur_s"] for r in json.loads((ROOT / "remotion/src/data/overlays.json").read_text())}
    tag = {"overlay": "OVERLAY", "video": "VÍDEO", "abertura-fixa": "ABERTURA", "estrutura": "BLOCO", "quebra": "QUEBRA", "ref-visual": "REF"}
    out = []
    for k, e in enumerate(ev, 1):
        d = dur_of.get(e["id"]) if e["tipo"] == "overlay" else (prompts[e["id"]]["dur"] if e["id"] in prompts else 2.0)
        name = f"[{tag.get(e['tipo'], e['tipo'].upper())}] " + (f"{e['id']} " if e["id"] and not e["desc"].startswith(e["id"]) else "") + e["desc"].split(" (")[0][:70]
        out.append(f"{k}\n{srt_t(e['t'])} --> {srt_t(e['t'] + d)}\n{name}\n")
    (EPDIR / "timeline-capcut.srt").write_text("\n".join(out), encoding="utf-8")


# ---------------------------------------------------------------- prompts de vídeo
def extract_prompts():
    text = SRC.read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(r"\*\*(V\d+)\. (.+?) \((?:antes do hook, )?(\d+)(?: a (\d+))? ?s\)\*\*\s*```text\n(.+?)\n```", text, re.S):
        vid = f"V{int(m.group(1)[1:]):02d}"
        out[vid] = dict(title=m.group(2), dur=int(m.group(4) or m.group(3)), prompt=m.group(5).strip())
    assert len(out) == 11, f"esperava 11 prompts, achei {len(out)}"
    return out


def write_prompts_md(prompts, ev):
    t_of = {e["id"]: e["t"] for e in ev if e["tipo"] == "video"}
    L = [f"# Prompts de vídeo — {EP}", "",
         "Gere cada vídeo na sua ferramenta (16:9, sem texto) e salve com o nome indicado. "
         "Os tempos são estimados (145 wpm + pausas + 8 s de cold open) e valem como ponto de partida.", "",
         "| Id | Entra em | Duração | Arquivo esperado | Uso |", "|---|---|---|---|---|"]
    for vid, p in prompts.items():
        L.append(f"| {vid} | {mmss(t_of[vid])} | {p['dur']} s | `assets/video/{vid}.mp4` | {p['title']} |")
    L.append("")
    for vid, p in prompts.items():
        L += [f"## {vid} — {p['title']}", f"Entra em ~{mmss(t_of[vid])} · {p['dur']} s · salvar como `assets/video/{vid}.mp4`", "",
              "```text", p["prompt"], "```", ""]
    L += ["Nota: o V07 abre o Bloco 6 (descida da consciência); a segunda metade (visor do astronauta) pode cobrir o corte "
          "do astronauta no Bloco 7.", "Quando os 11 arquivos existirem, rode `npm run cobertura` em `remotion/`."]
    (EPDIR / "prompts-video.md").write_text("\n".join(L), encoding="utf-8")


# ---------------------------------------------------------------- cue sheet
def write_cues(items, ev):
    cues = []  # (t, tipo, nota)
    cues.append((0, "música", "Cama grave e tensa durante o cold open (V01)"))
    cues.append((COLD_OPEN_S - 0.5, "riser", "Sobe até o corte seco para o hook"))
    cues.append((COLD_OPEN_S, "impacto", "Impacto curto e seco na entrada do hook"))
    for e in ev:
        if e["tipo"] == "video" and e["id"] != "V01":
            cues.append((e["t"], "whoosh", f"Transição para {e['id']}"))
        if e["tipo"] == "overlay" and e["id"] in ("fases", "braden-mapa", "zayn"):
            cues.append((e["t"], "whoosh", f"Entrada do diagrama {e['id']}"))
        if e["tipo"] == "overlay" and e["id"] in ("q-codigo",):
            cues.append((e["t"], "queda de música", "Música baixa cai na pergunta"))
        if e["tipo"] == "estrutura" and e["desc"].startswith("[TEN"):
            cues.append((e["t"], "queda de música", "Música cai no início do TEN"))
        if e["tipo"] == "estrutura" and e["desc"].startswith("[CTA"):
            cues.append((e["t"], "música", "Cama calma e quente sob o CTA"))
    for e in ev:
        if e["tipo"] != "quebra":
            continue
        d = e["desc"]
        mm = re.search(r"(\d+) segundos?", d)
        if "tela escura" in d:
            cues.append((e["t"], "impacto", "Corte seco para tela escura com o número 4 (1 s)"))
        elif "sem música" in d:
            cues.append((e["t"], "silêncio", "3 s sem música depois da frase"))
        elif mm:
            cues.append((e["t"], "silêncio", f"{mm.group(1)} s de silêncio ({d[:70]})"))
        elif "pausa curta" in d:
            cues.append((e["t"], "silêncio", "Pausa curta"))
        elif "luz da cena abaixa" in d:
            cues.append((e["t"], "queda de música", "Luz e música abaixam antes do TEN"))
    cues.sort(key=lambda c: c[0])
    L = [f"# Cue sheet de sound design — {EP}", "", "Tempos estimados; confirme no áudio gravado.", "",
         "| Tempo | Tipo | Nota |", "|---|---|---|"]
    for t, tipo, nota in cues:
        L.append(f"| {mmss(t, True)} | {tipo} | {nota} |")
    (EPDIR / "cue-sheet.md").write_text("\n".join(L) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
