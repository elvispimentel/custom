from datetime import datetime, timezone

from report import build_issue_body, build_report

NOW = datetime(2026, 10, 5, tzinfo=timezone.utc)


def post(pid, conc, score, validado=False, plat="youtube", formato="short"):
    return {
        "id": pid, "concorrente_id": conc, "plataforma": plat, "formato": formato,
        "url": f"https://x/{pid}", "titulo_ou_legenda": f"Título {pid}", "views": 10,
        "curtidas": 5, "comentarios": 1, "score": score, "validado": validado,
    }


def cenario():
    concs = [{"id": f"c{i}", "nome": f"Canal {i}", "plataforma": "youtube", "status": "aprovado"} for i in range(1, 8)]
    posts = []
    for i in range(1, 8):
        for j in range(4):
            posts.append(post(f"c{i}p{j}", f"c{i}", score=i + j / 10, validado=(i >= 3)))
    return concs, {"youtube": sorted(posts, key=lambda p: -p["score"]), "instagram": []}


def test_relatorio_lista_5_concorrentes_com_3_posts_cada():
    concs, ranked = cenario()
    md = build_report(ranked, concs, {}, [], NOW)
    assert md.count("### Canal ") == 5
    assert md.count("- [Título ") == 15


def test_relatorio_poe_falhas_no_topo():
    concs, ranked = cenario()
    md = build_report(ranked, concs, {}, ["YouTube Canal 2: timeout"], NOW)
    assert md.index("YouTube Canal 2: timeout") < md.index("Canal 7")


def test_relatorio_sem_analises_nao_quebra():
    concs, ranked = cenario()
    md = build_report(ranked, concs, {}, [], NOW)
    assert "Sem análises" in md


def test_relatorio_mostra_padroes_e_sugestoes():
    concs, ranked = cenario()
    analises = {
        "c7p3": {"post_id": "c7p3", "gancho": "g", "tema": "autossabotagem", "promessa": "p",
                 "por_que_funcionou": "w", "adaptacao_galifrael": "Adaptar para o Autorretrato"},
    }
    md = build_report(ranked, concs, analises, [], NOW)
    assert "autossabotagem" in md and "short" in md
    assert "Adaptar para o Autorretrato" in md


def test_issue_body_avisa_renovar_token():
    body = build_issue_body("# Relatório", ["renovar token Meta"])
    assert "renovar token Meta" in body.splitlines()[0]
    assert "# Relatório" in body


def test_relatorio_mostra_views_e_comentarios_de_cada_post():
    concs = [{"id": "c1", "nome": "Canal 1", "plataforma": "youtube", "status": "aprovado"}]
    yt = {**post("p1", "c1", score=0.9, validado=True), "views": 1_200_000, "comentarios": 3400}
    ig = {**post("p2", "c1", score=0.8, plat="instagram", formato="reel"), "views": None, "curtidas": 52000, "comentarios": 410}
    md = build_report({"youtube": [yt], "instagram": [ig]}, concs, {}, [], NOW)
    assert "1.200.000 views" in md and "3.400 comentários" in md
    assert "52.000 curtidas" in md and "410 comentários" in md
