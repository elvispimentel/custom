#!/usr/bin/env python3
"""Gera, a partir de assets/credits.json:
  - assets/PEDIR-AUTORIZACAO.md (quadro de pessoas vivas e capas por aprovar)
  - episodios/epNN/creditos-imagens.md (bloco para colar na descrição)
  - atualiza o bloco entre <!-- creditos:inicio --> e <!-- creditos:fim --> em roteiro-e-pacote.md
Só entram no bloco de créditos imagens com status ok ou propria. Rode de novo depois de baixar/aprovar.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP = sys.argv[1] if len(sys.argv) > 1 else "ep02"
doc = json.loads((ROOT / "assets" / "credits.json").read_text(encoding="utf-8"))
items = doc["itens"]

# ---- quadro PEDIR AUTORIZAÇÃO
rows = [i for i in items if i["status"] == "pedir-autorizacao"]
caps_all = [i for i in items if i.get("gate") == "uso-por-citacao"]
caps = [i for i in caps_all if i["status"] not in ("ok", "dispensado")]
L = ["# PEDIR AUTORIZAÇÃO", "",
     "Nada abaixo entra no vídeo sem autorização por escrito (ou licença confirmada). Sem a imagem, o overlay sai só com o lower third.", "",
     "## Pessoas vivas e autores recentes", "", "| Quem | Onde pedir | Uso no vídeo | Status |", "|---|---|---|---|"]
for i in rows:
    L.append(f"| {i['titulo']} | {i.get('url') or 'a identificar'} | {i['uso']} | {i['obs']} |")
recebidas = [i for i in items if i["status"] == "fornecida"]
if recebidas:
    L += ["", "## Fotos recebidas do Elvis: confirmar origem e autorização antes de publicar", "", "| Quem | Arquivo | Observação |", "|---|---|---|"]
    for i in recebidas:
        L.append(f"| {i['titulo']} | {i['arquivo']} | {i['obs']} |")
L += ["", "## Capas em português (uso por citação, crédito à editora): Elvis aprova", "",
      "| Capa | Origem | Status |", "|---|---|---|"]
for i in caps:
    L.append(f"| {i['titulo']} | {i.get('url') or 'editora a confirmar'} | {i['status']}. {i['obs']} |")
L += ["", "Para aprovar uma capa já baixada: `python3 tools/fetch_assets.py --approve capa-braden-pt`."]
(ROOT / "assets" / "PEDIR-AUTORIZACAO.md").write_text("\n".join(L) + "\n", encoding="utf-8")

# ---- bloco de créditos
ok = [i for i in items if i["status"] in ("ok", "propria") and not i.get("fora_do_video")]
B = ["Créditos das imagens"]
for i in ok:
    if i["status"] == "propria":
        B.append(f"• {i['titulo']}.")
    else:
        autor = f"{i['autor']}, " if i.get("autor") else ""
        B.append(f"• {i['titulo']} — {autor}{i['licenca']} — {i['url']}")
caps_ok = [i for i in caps_all if i["status"] == "ok"]
for i in caps_ok:
    B.append(f"• Capa de {i['titulo']}: uso por citação, crédito à editora — {i.get('url','')}")
block = "\n".join(B)
(ROOT / "episodios" / EP / "creditos-imagens.md").write_text(block + "\n", encoding="utf-8")

pack = ROOT / "episodios" / EP / "roteiro-e-pacote.md"
t = pack.read_text(encoding="utf-8")
wrapped = f"<!-- creditos:inicio -->\n{block}\n<!-- creditos:fim -->"
if "<!-- creditos:inicio -->" in t:
    t = re.sub(r"<!-- creditos:inicio -->.*?<!-- creditos:fim -->", lambda m: wrapped, t, flags=re.S)
else:
    t = t.replace("**Capítulos:**", wrapped + "\n\n**Capítulos:**", 1)
pack.write_text(t, encoding="utf-8")
print(f"créditos: {len(ok)} itens confirmados; autorização pendente: {len(rows)} pessoas, {len(caps)} capas")
