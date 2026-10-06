#!/usr/bin/env python3
"""Baixa as imagens listadas em assets/credits.json pelas APIs oficiais e grava autor, licença e origem.

  python3 tools/fetch_assets.py                 # tudo com status "planejado"
  python3 tools/fetch_assets.py --only delaune-1569
  python3 tools/fetch_assets.py --approve capa-braden-pt   # move de img-pendente para img (Elvis aprovou)
  python3 tools/fetch_assets.py --dry-run

Regra do canal: licença livre -> assets/img/. Licença incerta ou capa (uso por citação) ->
assets/img-pendente/ até aprovação. Licença que não é livre no Commons -> não baixa, marca pendente.
Precisa de rede para archive.org, commons.wikimedia.org, collectionapi.metmuseum.org, images-api.nasa.gov.
"""
import argparse
import html
import io
import json
import re
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CREDITS = ROOT / "assets" / "credits.json"
IMG = ROOT / "assets" / "img"
PEND = ROOT / "assets" / "img-pendente"
UA = {"User-Agent": "PodPocEpisodios/1.0 (Instituto Galifrael; pimentel.8f@gmail.com)"}
FREE = re.compile(r"^(public domain|pd\b|cc0|cc[ -]by|no restrictions|pdm|not in copyright)", re.I)
MAX_EDGE = 2400


def get(url, binary=False):
    import time
    for wait in (0, 6, 15, 30):  # 429 do Commons: espera e tenta de novo
        time.sleep(wait)
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except urllib.error.HTTPError as ex:
            if ex.code != 429:
                raise
    raise RuntimeError("HTTP 429 persistente")


def jget(url):
    return json.loads(get(url))


def strip_html(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


# ------------------------------------------------------------------ handlers: devolvem (url_da_imagem, meta)
def h_commons(e):
    if e.get("commons_file"):  # arquivo escolhido à mão; ainda confere a licença pela API
        q = urllib.parse.urlencode({"action": "query", "format": "json", "titles": e["commons_file"], "prop": "imageinfo",
                                    "iiprop": "extmetadata|url|size", "iiurlwidth": MAX_EDGE})
        pages = jget("https://commons.wikimedia.org/w/api.php?" + q)["query"]["pages"]
        p = next(iter(pages.values()))
        ii = p["imageinfo"][0]
        md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        if not FREE.match(lic):
            raise RuntimeError(f"licença não livre no Commons: {lic}")
        return ii.get("thumburl") or ii["url"], {
            "autor": strip_html(md.get("Artist", {}).get("value")), "licenca": lic,
            "url": ii.get("descriptionurl", ""), "titulo": p.get("title", e["titulo"]), "livre": True}
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrsearch": e["busca"],
        "gsrlimit": 10, "prop": "imageinfo", "iiprop": "extmetadata|url|size", "iiurlwidth": MAX_EDGE})
    pages = (jget("https://commons.wikimedia.org/w/api.php?" + q).get("query") or {}).get("pages", {})
    for p in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        if not FREE.match(lic):
            continue
        return ii.get("thumburl") or ii["url"], {
            "autor": strip_html(md.get("Artist", {}).get("value")), "licenca": lic,
            "url": ii.get("descriptionurl", ""), "titulo": p.get("title", e["titulo"]), "livre": True}
    raise RuntimeError("nenhum resultado com licença livre no Commons")


def h_met(e):
    o = jget(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{e['met_id']}")
    if not o.get("isPublicDomain"):
        raise RuntimeError("Met: objeto não está em domínio público")
    return o["primaryImage"], {"autor": o.get("artistDisplayName", ""), "licenca": "Public Domain (Met Open Access)",
                               "url": o.get("objectURL", e["url"]), "titulo": f"{o.get('title','')} ({o.get('objectDate','')})", "livre": True}


def h_nasa(e):
    a = jget(f"https://images-api.nasa.gov/asset/{e['nasa_id']}")
    hrefs = [i["href"] for i in a["collection"]["items"]]
    pick = next((h for h in hrefs if h.endswith("~large.jpg")), None) or next((h for h in hrefs if h.endswith(("~medium.jpg", ".jpg"))), None)
    if not pick:
        raise RuntimeError("NASA: nenhum jpg no asset")
    return pick.replace("http://", "https://"), {"autor": "NASA", "licenca": e["licenca"], "url": e["url"], "livre": True}


def h_ia(e):
    meta = jget(f"https://archive.org/metadata/{e['ia_id']}")
    m = meta.get("metadata", {})
    lic = m.get("licenseurl") or m.get("rights") or e["licenca"]
    page = e.get("page", "cover")
    jpgs = sorted(f["name"] for f in meta.get("files", []) if f["name"].lower().endswith((".jpg", ".jpeg")) and f.get("source") != "derivative")
    if e.get("arquivo_ia"):
        url = f"https://archive.org/download/{e['ia_id']}/{urllib.parse.quote(e['arquivo_ia'])}"
    elif is_loose_images(jpgs, e):
        url = f"https://archive.org/download/{e['ia_id']}/{urllib.parse.quote(jpgs[0])}"
        (PEND / f"{e['id']}.candidatos.txt").write_text("\n".join(jpgs), encoding="utf-8")
    else:
        url = f"https://archive.org/download/{e['ia_id']}/page/{page}_w2000.jpg"
    return url, {"autor": m.get("creator") if isinstance(m.get("creator"), str) else "; ".join(m.get("creator", [])),
                 "licenca": lic, "url": e["url"], "titulo": m.get("title", e["titulo"]), "livre": True}


def is_loose_images(jpgs, e):  # item de imagens soltas (códice) em vez de livro escaneado
    return bool(jpgs) and e["id"] == "leningrado"


def h_og(e):
    page = get(e["url"])
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', page) or \
        re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image', page)
    if not m:
        raise RuntimeError("og:image não encontrada na página")
    return urllib.parse.urljoin(e["url"], html.unescape(m.group(1))), {"licenca": e["licenca"], "url": e["url"], "livre": True}


def h_iiif(e):
    m = jget(e["manifest"])
    cv = m["sequences"][0]["canvases"][e.get("canvas", 0)]
    svc = cv["images"][0]["resource"]["service"]["@id"]
    return f"{svc}/full/!{MAX_EDGE},{MAX_EDGE}/0/default.jpg", {"licenca": e["licenca"], "url": e["url"], "titulo": e["titulo"], "livre": True}


HANDLERS = {"iiif": h_iiif, "commons": h_commons, "met": h_met, "nasa": h_nasa, "ia": h_ia, "og": h_og}


def save(data, dest, crop_white=False):
    try:
        from PIL import Image, ImageChops
        im = Image.open(io.BytesIO(data)).convert("RGB")
        if crop_white:  # imagens de loja vêm com margem branca ao redor da capa
            box = ImageChops.difference(im, Image.new("RGB", im.size, (255, 255, 255))).point(lambda v: 255 if v > 14 else 0).getbbox()
            if box:
                im = im.crop(box)
        im.thumbnail((MAX_EDGE, MAX_EDGE))
        im.save(dest, "JPEG", quality=92)
    except ImportError:
        dest.write_bytes(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--approve")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    doc = json.loads(CREDITS.read_text(encoding="utf-8"))
    by = {i["id"]: i for i in doc["itens"]}
    IMG.mkdir(parents=True, exist_ok=True)
    PEND.mkdir(parents=True, exist_ok=True)

    if a.approve:
        src = next(PEND.glob(a.approve + ".*"), None)
        if not src:
            sys.exit(f"{a.approve}: não está em assets/img-pendente/")
        shutil.move(str(src), IMG / src.name)
        by[a.approve]["status"] = "ok"
        by[a.approve]["aprovado"] = True
        CREDITS.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
        print("aprovado:", a.approve)
        return

    for e in doc["itens"]:
        if a.only and e["id"] != a.only:
            continue
        if e["status"] != "planejado" or (e["origem"] not in HANDLERS and not e.get("img_url")):
            continue
        try:
            if e.get("img_url"):  # URL direta já verificada à mão
                url, meta = e["img_url"], {"licenca": e["licenca"], "url": e["url"], "livre": True}
            else:
                url, meta = HANDLERS[e["origem"]](e)
            if a.dry_run:
                print("DRY", e["id"], url, meta.get("licenca"))
                continue
            gate = e.get("gate")
            dest_dir = PEND if gate else IMG
            save(get(url, binary=True), dest_dir / f"{e['id']}.jpg", e.get("crop_white", False))
            e.update({k: v for k, v in meta.items() if v and k != "livre"})
            e["arquivo_origem"] = url
            e["arquivo"] = f"assets/{'img-pendente' if gate else 'img'}/{e['id']}.jpg"
            e["status"] = gate or "ok"
            print("ok  ", e["id"], "->", e["arquivo"], "|", e.get("licenca"))
        except Exception as ex:  # rede, licença, formato: registra e segue
            e["status"] = f"falha: {ex}"
            print("FAIL", e["id"], ex)
    if not a.dry_run:
        CREDITS.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
