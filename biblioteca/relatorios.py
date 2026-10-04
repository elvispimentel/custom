import csv
import io


def _csv(cabecalho, linhas) -> str:
    o = io.StringIO()
    w = csv.writer(o)
    w.writerow(cabecalho)
    w.writerows(linhas)
    return o.getvalue()


def inventario_csv(est) -> str:
    return _csv(["id_drive", "nome", "caminho", "formato", "tamanho_bytes", "md5_drive", "situacao", "criado", "modificado"],
                [[r["id"], r["nome"], r["caminho"], r["mime"], r["tamanho"] or "", r["md5"] or "", r["situacao"],
                  r["criado"], r["modificado"]] for r in est.q("SELECT * FROM arquivos ORDER BY caminho, nome")])


def duplicados_csv(est) -> str:
    linhas = []
    for g in est.q("SELECT * FROM grupos_dup ORDER BY sha256"):
        for m in est.q("""SELECT a.*, d.papel FROM membros_dup d JOIN arquivos a ON a.id=d.file_id
                          WHERE d.sha256=? ORDER BY d.papel DESC, a.caminho, a.nome""", g["sha256"]):
            mov = est.q("SELECT status FROM movimentos WHERE file_id=? AND tipo='duplicado' ORDER BY em DESC", m["id"])
            linhas.append([g["sha256"], m["papel"], m["id"], m["nome"], m["caminho"], m["tamanho"], m["criado"],
                           g["motivo"] if m["papel"] == "exemplar" else "", mov[0]["status"] if mov else "nao_movido"])
    return _csv(["sha256", "papel", "id_drive", "nome", "caminho", "tamanho_bytes", "criado", "motivo_da_escolha",
                 "movimento"], linhas)


def movimentacoes_csv(est) -> str:
    return _csv(["id_drive", "tipo", "de_pasta_id", "para_pasta_id", "de_caminho", "para_caminho", "status", "erro", "em"],
                [[r["file_id"], r["tipo"], r["de_pasta"], r["para_pasta"], r["de_caminho"], r["para_caminho"],
                  r["status"], r["erro"] or "", r["em"]] for r in est.q("SELECT * FROM movimentos ORDER BY em")])


def pendencias_csv(est) -> str:
    return _csv(["id_drive", "arquivo", "tipo", "detalhe", "em"],
                [[r["file_id"], r["nome"] or "", r["tipo"], r["detalhe"], r["em"]] for r in est.q(
                    "SELECT p.*, a.nome FROM pendencias p LEFT JOIN arquivos a ON a.id=p.file_id ORDER BY p.tipo, a.nome")])
