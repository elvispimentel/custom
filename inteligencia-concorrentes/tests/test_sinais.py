from datetime import datetime, timedelta, timezone

from sinais import ALERTA_ORIGINALIDADE, metricas_publicas, notas_camada_a

NOW = datetime(2026, 10, 16, tzinfo=timezone.utc)


def post(i, legenda="texto", formato="reel", curtidas=100, comentarios=0, dias=5):
    return {"id": f"ig:{i}", "formato": formato, "titulo_ou_legenda": legenda, "curtidas": curtidas,
            "comentarios": comentarios, "publicado_em": (NOW - timedelta(days=dias)).strftime("%Y-%m-%dT%H:%M:%S+0000")}


def perfil(posts, seguidores=10000, nome="", bio=""):
    return {"handle": "x", "nome": nome, "bio": bio, "website": "", "seguidores": seguidores, "posts": posts}


def nota(notas, cid):
    return next(n for n in notas if n["id"] == cid)["nota"]


def test_engajamento_fronteira_025_vale_1():
    m = metricas_publicas(perfil([post(1, curtidas=20, comentarios=5)]), [], NOW)
    assert m["engajamento_por_seguidor"] == 0.0025
    assert nota(notas_camada_a(m), "engajamento") == 1


def test_engajamento_faixas():
    for total, esperado in ((10, 0), (60, 2), (100, 3)):
        m = metricas_publicas(perfil([post(1, curtidas=total)]), [], NOW)
        assert nota(notas_camada_a(m), "engajamento") == esperado


def test_seguidores_zero_nao_divide():
    m = metricas_publicas(perfil([post(1)], seguidores=0), [], NOW)
    assert m["engajamento_por_seguidor"] is None
    assert nota(notas_camada_a(m), "engajamento") is None


def test_curtidas_ocultas_contam_zero():
    m = metricas_publicas(perfil([post(1, curtidas=None, comentarios=50)]), [], NOW)
    assert m["engajamento_por_seguidor"] == 0.005


def test_repost_maioria_vira_alerta():
    posts = [post(i, "via @outro conteúdo") for i in range(3)] + [post(9, "autoral")]
    m = metricas_publicas(perfil(posts), [], NOW)
    assert m["taxa_repost_30d"] == 0.75
    assert ALERTA_ORIGINALIDADE in m["alertas"]
    assert nota(notas_camada_a(m), "originalidade") == 0


def test_repost_fora_da_janela_nao_conta():
    m = metricas_publicas(perfil([post(1, "repost", dias=40), post(2, "autoral")]), [], NOW)
    assert m["taxa_repost_30d"] == 0.0
    assert nota(notas_camada_a(m), "originalidade") == 3


def test_palavra_chave_no_nome_e_na_bio():
    m = metricas_publicas(perfil([post(1)], nome="Mentora de Terapeutas", bio="Ajudo terapeutas"), ["terapeutas"], NOW)
    assert m["palavras_no_nome"] == ["terapeutas"] and m["palavras_na_bio"] == ["terapeutas"]
    assert nota(notas_camada_a(m), "palavra_chave") == 3


def test_palavra_chave_so_na_legenda_e_nenhuma():
    m = metricas_publicas(perfil([post(1, "dica para Terapeutas")]), ["terapeutas"], NOW)
    assert nota(notas_camada_a(m), "palavra_chave") == 1
    m = metricas_publicas(perfil([post(1)]), ["terapeutas"], NOW)
    assert nota(notas_camada_a(m), "palavra_chave") == 0


def test_mix_formatos():
    variado = [post(1, formato="reel"), post(2, formato="carrossel")]
    assert nota(notas_camada_a(metricas_publicas(perfil(variado), [], NOW)), "mix_formatos") == 3
    assert nota(notas_camada_a(metricas_publicas(perfil([post(1)]), [], NOW)), "mix_formatos") == 1


def test_sem_posts_nao_quebra():
    m = metricas_publicas(perfil([]), ["x"], NOW)
    assert m["taxa_repost_30d"] is None and m["engajamento_por_seguidor"] is None
    notas = notas_camada_a(m)
    assert {n["id"] for n in notas} == {"engajamento", "palavra_chave", "originalidade", "mix_formatos"}
    assert all(n["camada"] == "A" for n in notas)
    assert nota(notas, "originalidade") is None and nota(notas, "mix_formatos") is None


def test_evidencia_traz_definicao():
    m = metricas_publicas(perfil([post(1, curtidas=61)]), [], NOW)
    ev = next(n for n in notas_camada_a(m) if n["id"] == "engajamento")["evidencia"]
    assert "0,61%" in ev and "(curtidas+comentários)/seguidores" in ev and "0,52–0,55%" in ev
