from collections import Counter
from datetime import datetime

MAX_ISSUE = 60_000


def _n(valor) -> str:
    return f"{(valor or 0):,}".replace(",", ".")


def _metricas(p: dict) -> str:
    base = f"{_n(p.get('views'))} views" if p["plataforma"] == "youtube" else f"{_n(p.get('curtidas'))} curtidas"
    return f"{base}, {_n(p.get('comentarios'))} comentários"


def _top_concorrentes(ranked: dict, concorrentes: list[dict], n: int = 5):
    por_conc: dict[str, list[dict]] = {}
    for lista in ranked.values():
        for p in lista:
            por_conc.setdefault(p["concorrente_id"], []).append(p)
    nomes = {c["id"]: c for c in concorrentes}

    def chave(item):
        posts = item[1]
        return (sum(1 for p in posts if p["validado"]), max(p["score"] for p in posts))

    ordenados = sorted(((cid, ps) for cid, ps in por_conc.items() if cid in nomes), key=chave, reverse=True)
    return [(nomes[cid], sorted(ps, key=lambda p: -p["score"])[:3]) for cid, ps in ordenados[:n]]


def build_report(ranked: dict, concorrentes: list[dict], analises: dict, falhas: list[str], now: datetime) -> str:
    out = [f"# Relatório semanal — {now:%Y-%m-%d}", ""]
    if falhas:
        out += ["## ⚠️ Falhas desta execução", *[f"- {f}" for f in falhas], ""]

    out += ["## Método 5-3: 5 concorrentes, 3 conteúdos de cada", ""]
    for conc, posts in _top_concorrentes(ranked, concorrentes):
        out.append(f"### {conc['nome']} ({conc['plataforma']})")
        for p in posts:
            selo = " ✅ validado" if p["validado"] else ""
            out.append(
                f"- [{p['titulo_ou_legenda'][:80]}]({p['url']}) — {p['formato']}, "
                f"{_metricas(p)}, score {p['score']:.2f}{selo}"
            )
        out.append("")

    out += ["## Padrões da semana", ""]
    if not analises:
        out += ["Sem análises nesta semana.", ""]
        return "\n".join(out)

    formatos_por_id = {p["id"]: p["formato"] for lista in ranked.values() for p in lista}
    formatos = Counter(formatos_por_id[a["post_id"]] for a in analises.values() if a["post_id"] in formatos_por_id)
    temas = Counter(a["tema"] for a in analises.values())
    out.append("Formatos mais frequentes: " + ", ".join(f"{k} ({v})" for k, v in formatos.most_common(3)))
    out.append("Temas mais frequentes: " + ", ".join(f"{k} ({v})" for k, v in temas.most_common(3)))
    out += ["", "## Sugestões para o Galifrael", ""]
    vistos = set()
    for a in analises.values():
        if a["tema"] in vistos:
            continue
        vistos.add(a["tema"])
        out.append(f"- **{a['tema']}**: {a['adaptacao_galifrael']}")
    out.append("")
    return "\n".join(out)


def build_issue_body(report_md: str, falhas: list[str]) -> str:
    topo = [f"⚠️ {f}" for f in falhas]
    corpo = report_md[:MAX_ISSUE]
    return "\n".join([*topo, *([""] if topo else []), corpo])
