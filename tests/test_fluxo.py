import csv
import io
from datetime import datetime, timezone

import pytest
from pypdf import PdfReader

from biblioteca import cli
from biblioteca import duplicados as dup
from biblioteca import lotes as lt
from biblioteca import organizar as org
from biblioteca.controle import BibliotecaOcupada
from biblioteca.inventario import inventariar
from biblioteca.util import natural_key
from .fakes import ANTIGO, FakeDrive, pdf_digitalizado, pdf_protegido, pdf_texto


def agora_iso():
    return datetime.now(timezone.utc).isoformat()


def ids_nomes(drive, pasta):
    return drive.na_pasta(pasta)


# ---------- ordem natural ----------
def test_ordem_natural():
    nomes = ["cap 10.pdf", "cap 2.pdf", "Cap 1.pdf", "cap 20.pdf"]
    assert sorted(nomes, key=natural_key) == ["Cap 1.pdf", "cap 2.pdf", "cap 10.pdf", "cap 20.pdf"]


# ---------- duplicados ----------
def monta_biblioteca_dup(m):
    d = m.drive
    a, b = d.pasta("A", m.lib), d.pasta("B", m.lib)
    copias = d.pasta("Cópias", m.lib)
    x = b"X" * 200
    d.arquivo("livro.pdf", x, a, criado="2024-03-01T00:00:00+00:00")
    d.arquivo("nome totalmente diferente.pdf", x, b, criado="2024-05-01T00:00:00+00:00")
    d.arquivo("copia do livro.pdf", x, copias, criado="2020-01-01T00:00:00+00:00")  # mais antigo, mas em pasta de cópias
    # mesmo nome e mesmo tamanho, conteúdos diferentes: NÃO são duplicados
    d.arquivo("mesmo.pdf", b"Y" * 100, a)
    d.arquivo("mesmo.pdf", b"Z" * 100, b)
    return a, b, copias


def test_duplicados_por_conteudo_nao_por_nome_ou_tamanho(mundo):
    monta_biblioteca_dup(mundo)
    ctx = mundo.abrir(saidas=False)
    inventariar(ctx)
    grupos = dup.detectar(ctx)
    assert len(grupos) == 1
    g = grupos[0]
    assert g["exemplar"]["nome"] == "livro.pdf"          # fora de pasta de cópias e mais antigo dos restantes
    assert {d["nome"] for d in g["duplicados"]} == {"nome totalmente diferente.pdf", "copia do livro.pdf"}
    assert "fora de pastas de cópias" in g["motivo"]
    nomes = {n for g in grupos for n in [g["exemplar"]["nome"]] + [d["nome"] for d in g["duplicados"]]}
    assert "mesmo.pdf" not in nomes
    # a simulação não moveu nada
    assert mundo.drive.chamadas.get("mover", 0) == 0


def test_mover_duplicados_preserva_exemplar_e_registra_origem(mundo):
    a, b, copias = monta_biblioteca_dup(mundo)
    ctx = mundo.abrir()
    inventariar(ctx)
    r = dup.mover_duplicados(ctx, dup.detectar(ctx))
    assert r["movidos"] == 2 and r["erros"] == 0
    assert mundo.drive.na_pasta(a) == ["livro.pdf", "mesmo.pdf"]      # exemplar e único preservados
    assert mundo.drive.na_pasta(b) == ["mesmo.pdf"]
    # pasta de revisão fica FORA da biblioteca e nada vai para a lixeira
    rev = ctx.ids["duplicados"]
    assert mundo.lib not in mundo.drive.itens[rev]["parents"]
    assert all(not f["lixeira"] for f in mundo.drive.itens.values())
    movs = ctx.estado.q("SELECT * FROM movimentos")
    assert {m["de_pasta"] for m in movs} == {b, copias}
    assert all(m["de_caminho"] and m["para_caminho"] for m in movs)
    # restauração devolve à origem
    assert dup.restaurar(ctx)["restaurados"] == 2
    assert mundo.drive.na_pasta(copias) == ["copia do livro.pdf"]


def test_sem_permissao_registra_pendencia_e_continua(mundo):
    monta_biblioteca_dup(mundo)
    ctx = mundo.abrir()
    inventariar(ctx)
    bloqueado = next(f["id"] for f in mundo.drive.itens.values() if f["name"] == "copia do livro.pdf")
    mundo.drive.negar_mover.add(bloqueado)
    r = dup.mover_duplicados(ctx, dup.detectar(ctx))
    assert r["movidos"] == 1 and r["erros"] == 1
    assert ctx.estado.q("SELECT tipo FROM pendencias WHERE file_id=?", bloqueado)[0]["tipo"] == "mover"


def test_interrupcao_e_retomada_nao_repete_movimentos(mundo):
    a = mundo.drive.pasta("A", mundo.lib)
    for i in range(4):
        mundo.drive.arquivo(f"c{i}.pdf", b"CONTEUDO" * 50, a, criado=f"2024-0{i + 1}-01T00:00:00+00:00")
    ctx = mundo.abrir()
    inventariar(ctx)
    mundo.drive.falhar_apos_movimentos = 1                # cai depois de 1 movimento
    r1 = dup.mover_duplicados(ctx, dup.detectar(ctx))
    assert r1["movidos"] == 1 and r1["erros"] == 2
    mundo.ctrl.liberar_trava()
    # nova execução: o runner foi descartado, o estado volta do Drive
    (mundo.tmp / "trabalho" / "estado.db").unlink()
    mundo.drive.falhar_apos_movimentos = None
    ctx2 = mundo.abrir(run="run2")
    inventariar(ctx2)
    antes = mundo.drive.chamadas["mover"]
    r2 = dup.mover_duplicados(ctx2, dup.detectar(ctx2))
    assert r2["movidos"] == 2
    movidos_total = ctx2.estado.q("SELECT COUNT(*) n FROM movimentos WHERE status='done'")[0]["n"]
    assert movidos_total == 3 and mundo.drive.chamadas["mover"] - antes == 2   # o 1º não foi repetido
    r3 = dup.mover_duplicados(ctx2, dup.detectar(ctx2))                    # terceira rodada: nada a fazer
    assert r3["movidos"] == 0 and mundo.drive.na_pasta(a) == ["c0.pdf"]


def test_trava_impede_execucao_simultanea(mundo):
    mundo.abrir(run="runA")
    with pytest.raises(BibliotecaOcupada):
        mundo.abrir(run="runB")
    mundo.ctrl.liberar_trava()
    mundo.abrir(run="runB")


# ---------- varredura ----------
def test_pastas_de_saida_e_atalhos_fora_da_varredura(mundo):
    d = mundo.drive
    saida = d.pasta("Saida dentro da biblioteca", mundo.lib)
    d.arquivo("resultado.pdf", pdf_texto(1, "res"), saida)
    mundo.cfg.d["pastas_saida"]["pdfs_id"] = saida
    externa = d.pasta("Externa", d.raiz)
    d.arquivo("fora.pdf", pdf_texto(1, "fora"), externa)
    d.atalho("atalho para externa", externa, mundo.lib)
    d.arquivo("dentro.pdf", pdf_texto(1, "dentro"), mundo.lib)
    ctx = mundo.abrir()
    resumo = inventariar(ctx)
    nomes = {r["nome"] for r in ctx.estado.q("SELECT nome FROM arquivos")}
    assert "resultado.pdf" not in nomes and "fora.pdf" not in nomes
    assert resumo["atalhos"] == 1 and "dentro.pdf" in nomes
    # pastas de revisão e controle também não são varridas
    assert ctx.ids["duplicados"] not in {r["id"] for r in ctx.estado.q("SELECT id FROM pastas")}


def test_arquivo_ainda_subindo_e_ignorado(mundo):
    d = mundo.drive
    d.arquivo("novo.pdf", pdf_texto(1, "n"), mundo.lib, criado=agora_iso(), modificado=agora_iso())
    d.arquivo("velho.pdf", pdf_texto(1, "v"), mundo.lib)
    ctx = mundo.abrir()
    r = inventariar(ctx)
    assert r["instaveis"] == 1
    assert list(lt.pdfs_unicos(ctx).values())[0][0]["nome"] == "velho.pdf"


# ---------- lotes ----------
def popula_25(m, pasta):
    for n in [10, 2, 1] + list(range(3, 10)) + list(range(11, 26)):
        m.drive.arquivo(f"cap {n}.pdf", pdf_texto(2, f"cap{n}"), pasta)


def paginas(m, pasta_nome="Livros"):
    return [PdfReader(io.BytesIO(f["dados"])) for f in m.drive.itens.values()
            if f["mimeType"] == "application/pdf" and f["name"].startswith(pasta_nome + "_lote")]


def test_vinte_e_cinco_arquivos_viram_20_mais_5_e_une_mantendo_ordem(mundo):
    livros = mundo.drive.pasta("Livros", mundo.lib)
    popula_25(mundo, livros)
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    assert len(plano) == 1 and len(plano[0]["itens"]) == 25
    assert [i["nome"] for i in plano[0]["itens"]] == [f"cap {n}.pdf" for n in range(1, 26)]   # natural
    r = lt.processar(ctx, plano)
    assert r["concluidos"] == 1
    tamanhos = [len(c) for c in mundo.pdf.chamadas]
    assert tamanhos == [20, 5, 2]                       # 20 + 5 e depois a união dos dois resultados
    assert mundo.pdf.chamadas[0] == [f"cap {n}.pdf" for n in range(1, 21)]
    assert mundo.pdf.chamadas[1] == [f"cap {n}.pdf" for n in range(21, 26)]
    (pdf,) = paginas(mundo)
    assert len(pdf.pages) == 50                         # nenhuma página perdida
    assert "cap1 pagina 1" in pdf.pages[0].extract_text() and "cap25 pagina 2" in pdf.pages[49].extract_text()
    linhas = list(csv.DictReader(io.StringIO(lt.indice_csv(ctx))))
    assert len(linhas) == 25 and linhas[0]["pagina_inicial"] == "1" and linhas[0]["pagina_final"] == "2"
    assert linhas[24]["pagina_inicial"] == "49" and linhas[24]["pagina_final"] == "50"
    assert all(l["id_drive"] and l["id_pdf_final"] and l["pdf_final"] for l in linhas)
    # resultado fica numa subpasta espelhada da pasta de saída, e o original segue intacto
    saida = mundo.drive.itens[ctx.ids["pdfs"]]
    assert saida["parents"] == [mundo.drive.raiz]
    assert len(mundo.drive.na_pasta(livros)) == 25


def test_meta_reduz_o_lote_sem_exigir_25(mundo):
    mundo.cfg.d["lotes"]["max_documentos"] = 7
    livros = mundo.drive.pasta("Livros", mundo.lib)
    popula_25(mundo, livros)
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    assert [len(p["itens"]) for p in plano] == [7, 7, 7, 4]


def test_meta_de_palavras_e_tamanho(mundo):
    mundo.cfg.d["lotes"]["meta_palavras"] = 700            # cada arquivo tem ~240 palavras
    livros = mundo.drive.pasta("Livros", mundo.lib)
    for n in range(1, 7):
        mundo.drive.arquivo(f"l{n}.pdf", pdf_texto(2, f"l{n}"), livros)
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    assert [len(p["itens"]) for p in lt.planejar(ctx)] == [2, 2, 2]


def test_flags_ocr_protegido_invalido_e_avulso(mundo):
    d, livros = mundo.drive, mundo.drive.pasta("Livros", mundo.lib)
    d.arquivo("a normal.pdf", pdf_texto(2, "n"), livros)
    d.arquivo("b scan.pdf", pdf_digitalizado(2), livros)
    d.arquivo("c protegido.pdf", pdf_protegido(), livros)
    d.arquivo("d quebrado.pdf", b"isto nao e pdf" * 20, livros)
    d.arquivo("e enorme.pdf", pdf_texto(40, "grande"), livros)
    mundo.cfg.d["lotes"]["meta_palavras"] = 3000          # o 'enorme' passa de ~4800 palavras
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    nomes = [i["nome"] for i in plano[0]["itens"]]
    assert nomes == ["a normal.pdf", "b scan.pdf"]          # escaneado entra, mas sinalizado
    tipos = {(r["tipo"]) for r in ctx.estado.q("SELECT tipo FROM pendencias")}
    assert {"ocr", "protegido", "invalido", "enviar_separadamente"} <= tipos
    lt.processar(ctx, plano)
    linhas = list(csv.DictReader(io.StringIO(lt.indice_csv(ctx))))
    status = {l["arquivo_original"]: l["status"] for l in linhas if l["status"] != "done"}
    assert status["c protegido.pdf"] == "protegido" and status["d quebrado.pdf"] == "invalido"
    assert status["e enorme.pdf"] == "enviar_separadamente" and "palavras" in [l for l in linhas if l["arquivo_original"] == "e enorme.pdf"][0]["observacao"]
    assert len(paginas(mundo)[0].pages) == 4                 # as 2 páginas escaneadas não sumiram


def test_somente_pdfs_unicos_entram_nos_lotes(mundo):
    d = mundo.drive
    a, b = d.pasta("A", mundo.lib), d.pasta("B", mundo.lib)
    p = pdf_texto(2, "igual")
    d.arquivo("um.pdf", p, a, criado="2024-01-01T00:00:00+00:00")
    d.arquivo("dois.pdf", p, b, criado="2024-02-01T00:00:00+00:00")
    d.arquivo("outro.pdf", pdf_texto(2, "outro"), b)
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    nomes = sorted(i["nome"] for pl in plano for i in pl["itens"])
    assert nomes == ["outro.pdf", "um.pdf"]


def test_retomada_de_lotes_sem_duplicar_resultados(mundo):
    d = mundo.drive
    for pasta in ("P1", "P2", "P3"):
        pid = d.pasta(pasta, mundo.lib)
        for n in range(2):
            d.arquivo(f"{pasta} {n}.pdf", pdf_texto(1, f"{pasta}{n}"), pid)
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    assert len(plano) == 3
    original = d.enviar
    contador = {"n": 0}

    def enviar_com_queda(*a, **k):
        if a[0].endswith(".pdf") and "_lote_" in a[0]:
            contador["n"] += 1
            if contador["n"] == 2:
                raise RuntimeError("queda de rede")
        return original(*a, **k)
    d.enviar = enviar_com_queda
    r1 = lt.processar(ctx, plano)
    assert r1["concluidos"] == 2 and r1["erros"] == 1
    merges_antes = len(mundo.pdf.chamadas)
    mundo.ctrl.liberar_trava()
    ctx2 = mundo.abrir(run="run2")
    inventariar(ctx2); dup.detectar(ctx2)
    plano2 = lt.planejar(ctx2)
    r2 = lt.processar(ctx2, plano2)
    assert r2["concluidos"] == 1 and len(mundo.pdf.chamadas) - merges_antes == 1   # só o lote que falhou foi refeito
    saidas = [f["name"] for f in d.itens.values() if "_lote_" in f["name"]]
    assert len(saidas) == 3 and len(set(saidas)) == 3
    r3 = lt.processar(ctx2, lt.planejar(ctx2))
    assert r3["concluidos"] == 0


def test_composicao_alterada_marca_resultado_antigo_como_obsoleto(mundo):
    d, livros = mundo.drive, mundo.drive.pasta("Livros", mundo.lib)
    d.arquivo("a.pdf", pdf_texto(1, "a"), livros)
    d.arquivo("b.pdf", pdf_texto(1, "b"), livros)
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    lt.processar(ctx, lt.planejar(ctx))
    d.arquivo("c.pdf", pdf_texto(1, "c"), livros)           # livro novo chegou
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    lt.processar(ctx, plano)
    linhas = list(csv.DictReader(io.StringIO(lt.indice_csv(ctx))))
    assert {l["status"] for l in linhas} == {"done", "obsoleto"}
    assert len([f for f in d.itens.values() if "_lote_" in f["name"]]) == 2   # nada é apagado


def test_ilovepdf_sem_creditos_bloqueia(mundo):
    mundo.pdf.creditos = 0
    livros = mundo.drive.pasta("Livros", mundo.lib)
    popula_25(mundo, livros)
    ctx = mundo.abrir()
    inventariar(ctx); dup.detectar(ctx)
    plano = lt.planejar(ctx)
    with pytest.raises(lt.ErroLote):
        lt.verificar_ilovepdf(ctx, lt.estimar_uso(ctx, plano))


# ---------- temas e autores ----------
def monta_temas(m):
    d = m.drive
    d.arquivo("Carl Jung - Os Arquétipos e o Inconsciente Coletivo.pdf", b"1" * 50, m.lib)
    d.arquivo("Carl Jung - Psicologia e Alquimia.pdf", b"2" * 50, m.lib)
    d.arquivo("Três Iniciados - O Kybalion hermético.pdf", b"3" * 50, m.lib)
    d.arquivo("Planilha qualquer.xlsx", b"4" * 50, m.lib, mime="application/vnd.ms-excel")


def test_temas_simulacao_nao_move_e_aplicacao_organiza(mundo):
    monta_temas(mundo)
    ctx = mundo.abrir()
    ctx.cfg.d["organizacao"]["temas"] = {"Psicologia e Arquétipos": ["arquétipo", "jung", "psicolog"],
                                          "Hermetismo": ["hermet", "kybalion", "alquimia"]}
    inventariar(ctx); dup.detectar(ctx)
    plano = org.planejar_temas(ctx)
    assert mundo.drive.chamadas.get("mover", 0) == 0                       # simulação
    por_nome = {p["nome"]: p for p in plano}
    j = por_nome["Carl Jung - Os Arquétipos e o Inconsciente Coletivo.pdf"]
    assert (j["tema"], j["autor"], j["acao"]) == ("Psicologia e Arquétipos", "Carl Jung", "mover")
    assert por_nome["Planilha qualquer.xlsx"]["acao"] == "fora_do_escopo_nao_livro"
    r = org.aplicar_temas(ctx, plano)
    assert r["movidos"] == 3 and r["erros"] == 0
    antes = mundo.drive.chamadas["mover"]
    inventariar(ctx)
    plano2 = org.planejar_temas(ctx)
    assert {p["acao"] for p in plano2 if p["tema"]} == {"ja_organizado"}
    assert org.aplicar_temas(ctx, plano2)["movidos"] == 0 and mundo.drive.chamadas["mover"] == antes
    assert dup.restaurar(ctx, "tema")["restaurados"] == 3
    assert "Planilha qualquer.xlsx" in mundo.drive.na_pasta(mundo.lib)


def test_override_manual_vence_regras_e_autores_sao_unificados(mundo):
    d = mundo.drive
    d.arquivo("Carl Jung - Livro A.pdf", b"1" * 50, mundo.lib)
    d.arquivo("carl jung - Livro B.pdf", b"2" * 50, mundo.lib)
    ctx = mundo.abrir()
    ctx.cfg.d["organizacao"]["temas"] = {"Psicologia": ["jung"]}
    inventariar(ctx); dup.detectar(ctx)
    plano = org.planejar_temas(ctx)
    assert len({p["destino"] for p in plano}) == 1                # mesma pasta de autor, sem duplicar por grafia


def test_lixo_de_sistema_fica_fora_do_inventario(mundo):
    d = mundo.drive
    d.arquivo(".DS_Store", b"x" * 10, mundo.lib, mime="application/octet-stream")
    d.arquivo("Thumbs.db", b"y" * 10, mundo.lib, mime="application/octet-stream")
    d.arquivo("livro.pdf", pdf_texto(1, "l"), mundo.lib)
    ctx = mundo.abrir()
    r = inventariar(ctx)
    assert r["ignorados"] == 2
    assert [x["nome"] for x in ctx.estado.q("SELECT nome FROM arquivos")] == ["livro.pdf"]


def test_inventario_em_paralelo_equivale_ao_serial(mundo):
    d = mundo.drive
    for i in range(12):
        p = d.pasta(f"P{i}", mundo.lib)
        sub = d.pasta("sub", p)
        d.arquivo(f"a{i}.pdf", pdf_texto(1, f"a{i}"), p)
        d.arquivo(f"b{i}.pdf", pdf_texto(1, f"b{i}"), sub)
    resultados = []
    for n in (1, 6):
        mundo.cfg.d["execucao"]["paralelismo_listagem"] = n
        ctx = mundo.abrir(run=f"r{n}")
        r = inventariar(ctx)
        resultados.append((r, [tuple(x) for x in ctx.estado.q("SELECT nome, caminho FROM arquivos ORDER BY caminho, nome")]))
        mundo.ctrl.liberar_trava()
    assert resultados[0] == resultados[1] and resultados[0][0]["pastas"] == 25 and resultados[0][0]["arquivos"] == 24


def test_trava_e_liberada_mesmo_se_a_gravacao_do_estado_falhar(mundo):
    from biblioteca import cli as c

    class Cont:
        chamadas = {}
    ctx = mundo.abrir(run="rZ")
    ctx.salvar = lambda: (_ for _ in ()).throw(RuntimeError("queda ao gravar estado"))
    c.encerrar(ctx, mundo.ctrl, Cont())      # não levanta, e libera a trava
    mundo.abrir(run="rW")                    # se a trava tivesse ficado presa, levantaria BibliotecaOcupada


def _trava_ocupada(mundo, dono="rDONO"):
    mundo.abrir(run=dono)          # grava a trava como ocupada e "cai" sem liberar


def test_trava_de_execucao_terminada_e_assumida_sem_esperar_o_prazo(mundo):
    from biblioteca.controle import Controle
    _trava_ocupada(mundo)
    c = Controle(mundo.drive, mundo.ctrl.pasta, mundo.tmp / "t2", "rNOVA", run_ativa=lambda r: False)
    c.adquirir_trava()             # não levanta: o dono já terminou


def test_trava_de_execucao_em_andamento_continua_valendo(mundo):
    from biblioteca.controle import Controle
    _trava_ocupada(mundo)
    c = Controle(mundo.drive, mundo.ctrl.pasta, mundo.tmp / "t3", "rNOVA", run_ativa=lambda r: True)
    with pytest.raises(BibliotecaOcupada):
        c.adquirir_trava()


def test_trava_sem_como_confirmar_usa_o_prazo(mundo):
    from biblioteca.controle import Controle
    _trava_ocupada(mundo)
    c = Controle(mundo.drive, mundo.ctrl.pasta, mundo.tmp / "t4", "rNOVA", run_ativa=lambda r: None)
    with pytest.raises(BibliotecaOcupada):      # trava recente e sem confirmação: respeita o prazo
        c.adquirir_trava()


def test_exemplar_usa_a_data_original_quando_a_criacao_e_a_do_upload(mundo):
    d = mundo.drive
    a, b = d.pasta("A", mundo.lib), d.pasta("B", mundo.lib)
    x = b"MESMO-CONTEUDO" * 20
    upload = "2026-10-04T15:51:00+00:00"          # criação = upload em lote (igual para todos)
    d.arquivo("69e4d9be-codigo.pdf", x, a, criado=upload, modificado="2026-09-01T10:00:00+00:00")
    d.arquivo("Autor - Titulo Original.pdf", x, b, criado=upload, modificado="2025-01-15T10:00:00+00:00")
    ctx = mundo.abrir(saidas=False)
    inventariar(ctx)
    (g,) = dup.detectar(ctx)
    assert g["exemplar"]["nome"] == "Autor - Titulo Original.pdf"        # a data original mais antiga vence
    assert "data mais antiga" in g["motivo"]


def test_exemplar_sem_datas_nao_vira_o_mais_antigo():
    from biblioteca.duplicados import escolher_exemplar
    sem = dict(id="z", nome="sem-data.pdf", caminho="", criado=None, modificado=None)
    com = dict(id="a", nome="com-data.pdf", caminho="", criado="2024-01-01T00:00:00+00:00", modificado=None)
    assert escolher_exemplar([sem, com], [])[0]["id"] == "a"


def test_nao_livros_ficam_fora_do_plano_de_temas():
    assert org.eh_livro("Platão - A republica.pdf", ["pdf", "epub"])
    assert not org.eh_livro("index.html", ["pdf", "epub"])
    assert not org.eh_livro("125x125.jpg", ["pdf"])
    assert not org.eh_livro("Livro.pdf.icloud", ["pdf"])
    temas = {"Filosofia": ["platão", "república", "republica"], "Vendas": ["vendas"]}
    tema, _, conf = org.classificar_regras({"caminho": "", "nome": "Platão - A republica.pdf"}, temas)
    assert tema == "Filosofia" and conf >= 0.7


def test_classificador_openai_le_resposta_e_descarta_tema_fora_da_lista(mundo, monkeypatch):
    ctx = mundo.abrir()
    ctx.cfg.d["organizacao"]["classificador"] = "openai"
    ctx.cfg.d["organizacao"]["temas"] = {"Filosofia": ["x"], "Saúde e Corpo": ["y"]}
    ctx.cfg.openai_key = "sk-teste"
    chamadas = []

    class R:
        def raise_for_status(self): pass
        def json(self):
            return {"choices": [{"message": {"content":
                '```json\n[{"id":"a","tema":"Filosofia","autor":"Platão","confianca":0.9},'
                '{"id":"b","tema":"Inventado","autor":null,"confianca":0.9}]\n```'}}]}

    def fake_post(url, **kw):
        chamadas.append((url, kw["headers"]["Authorization"]))
        return R()

    monkeypatch.setattr(org.requests, "post", fake_post)
    out = org.classificar_ia(ctx, [{"id": "a", "nome": "A República.pdf", "caminho": ""},
                                   {"id": "b", "nome": "Outro.pdf", "caminho": ""}])
    assert chamadas == [("https://api.openai.com/v1/chat/completions", "Bearer sk-teste")]
    assert out["a"] == ("Filosofia", "Platão", 0.9)
    assert out["b"] == (None, None, 0.0)


def test_retry_repete_429_e_nao_repete_401(monkeypatch):
    monkeypatch.setattr(org.time, "sleep", lambda s: None)

    class Resp: 
        def __init__(self, c): self.status_code = c

    n = {"v": 0}
    def instavel():
        n["v"] += 1
        if n["v"] < 3:
            raise org.requests.HTTPError(response=Resp(429))
        return "ok"
    assert org._com_retry(instavel) == "ok" and n["v"] == 3

    def negado():
        raise org.requests.HTTPError(response=Resp(401))
    try:
        org._com_retry(negado)
        assert False
    except org.requests.HTTPError:
        pass


def test_agrupar_por_tema_junta_autores_e_manda_o_resto_para_sem_tema(mundo):
    d = mundo.drive
    h = d.pasta("Hermetismo", mundo.lib)
    a1, a2 = d.pasta("Autor Um", h), d.pasta("Autor Dois", h)
    solta = d.pasta("Curso antigo", mundo.lib)
    d.arquivo("a.pdf", pdf_texto(2, "a"), a1)
    d.arquivo("b.pdf", pdf_texto(2, "b"), a2)
    d.arquivo("c.pdf", pdf_texto(2, "c"), solta)
    d.arquivo("d.pdf", pdf_texto(2, "d"), mundo.lib)
    ctx = mundo.abrir()
    ctx.cfg.d["organizacao"]["temas"] = {"Hermetismo": ["x"]}
    ctx.cfg.d["lotes"]["agrupar_por"] = "tema"
    inventariar(ctx)
    plano = lt.planejar(ctx)
    por_grupo = {pl["pasta"]: sorted(i["nome"] for i in pl["itens"]) for pl in plano}
    assert por_grupo == {"Hermetismo": ["a.pdf", "b.pdf"], "Sem tema": ["c.pdf", "d.pdf"]}


def test_max_documentos_zero_nao_limita_a_quantidade_so_mb_e_palavras():
    from biblioteca.config import carregar
    from biblioteca.pdfs import formar_lotes
    cfg = carregar("/nao/existe.yaml")
    cfg.d["lotes"].update({"max_documentos": 0, "meta_mb": 100, "meta_palavras": 1000})
    itens = [{"id": str(i), "nome": f"{i}.pdf", "tamanho": 1000, "palavras": 10} for i in range(60)]
    lotes, avulsos = formar_lotes(itens, cfg)
    assert [len(l) for l in lotes] == [60] and not avulsos          # 60 livros num arquivo só
    cfg.d["lotes"]["meta_palavras"] = 250                           # a meta de palavras ainda fecha o lote
    lotes, _ = formar_lotes(itens, cfg)
    assert [len(l) for l in lotes] == [25, 25, 10]


def test_nome_do_dono_casa_palavra_inteira_e_ignora_acento_e_hifen():
    from biblioteca.config import carregar
    from biblioteca import pessoal
    cfg = carregar("/nao/existe.yaml")
    cfg.d["pessoal"]["padroes"] = ["elvis pimentel"]
    assert pessoal.eh_pessoal_nome(cfg, "Dossie Elvis Pimentel.pdf")
    assert pessoal.eh_pessoal_nome(cfg, "Desenho Humano - elvis-pimentel.pdf")
    assert pessoal.eh_pessoal_nome(cfg, "ELVIS  PIMENTEL 1610 - Mentoria.pdf")
    assert not pessoal.eh_pessoal_nome(cfg, "Ajay Elvish - Despertando Sentidos.pdf")      # só com o padrão configurado
    cfg.d["pessoal"]["padroes"] = ["elvis pimentel", "ajay elvish", "ajay krishna das"]
    assert pessoal.eh_pessoal_nome(cfg, "Ajay Elvish - Despertando Sentidos.pdf")           # pseudônimo do dono
    assert pessoal.eh_pessoal_nome(cfg, "ajay-krishna-das - Protocolo.pdf")
    assert not pessoal.eh_pessoal_nome(cfg, "Ajay Devgan - Biografia.pdf")
    assert not pessoal.eh_pessoal_nome(cfg, "Elvis Presley - Biografia.pdf")
    assert pessoal.eh_pessoal_caminho(cfg, "Livros/Curso de Hipnose/Curso Elvis Pimentel/Modulo 1")


def test_arquivos_pessoais_vao_para_pasta_propria_e_para_lote_a_parte(mundo):
    d = mundo.drive
    d.arquivo("Carl Jung - Os Arquétipos.pdf", pdf_texto(2, "j"), mundo.lib)
    d.arquivo("Dossie Elvis Pimentel.pdf", pdf_texto(2, "d"), mundo.lib)
    d.arquivo("Elvis Pimentel - Mentoria Kybalion.pdf", pdf_texto(2, "m"), mundo.lib)
    ctx = mundo.abrir()
    ctx.cfg.d["organizacao"]["temas"] = {"Psicologia": ["jung"], "Hermetismo": ["kybalion"]}
    ctx.cfg.d["pessoal"] = {"padroes": ["elvis pimentel"], "pasta": "00 - Pessoais"}
    ctx.cfg.d["lotes"]["agrupar_por"] = "tema"
    inventariar(ctx); dup.detectar(ctx)
    plano = org.planejar_temas(ctx)
    por = {p["nome"]: p for p in plano}
    assert por["Dossie Elvis Pimentel.pdf"]["destino"] == "00 - Pessoais" and por["Dossie Elvis Pimentel.pdf"]["acao"] == "mover"
    assert por["Elvis Pimentel - Mentoria Kybalion.pdf"]["destino"] == "00 - Pessoais"   # nome do dono vence o tema
    assert por["Carl Jung - Os Arquétipos.pdf"]["destino"].startswith("Psicologia/")
    org.aplicar_temas(ctx, plano)
    inventariar(ctx)
    lotes = {pl["pasta"]: sorted(i["nome"] for i in pl["itens"]) for pl in lt.planejar(ctx)}
    assert lotes["00 - Pessoais"] == ["Dossie Elvis Pimentel.pdf", "Elvis Pimentel - Mentoria Kybalion.pdf"]
    assert all("Elvis" not in n for g, ns in lotes.items() if g != "00 - Pessoais" for n in ns)
