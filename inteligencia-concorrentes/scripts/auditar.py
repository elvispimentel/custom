"""Modo auditar: dá nota ao perfil de cada cliente e aos concorrentes aprovados dele.

Camada A (sinais do algoritmo, determinística) + camada B (neuromarketing pela
LLM, com citação literal), contextualizadas pelo cartão do cliente de alma.
"""
import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from cartao import CartaoInvalido, load_cartao
from config import load_config
from instagram import GraphError, SemAcesso, TokenExpirado
from perfil import metricas_autenticadas
from report import build_issue_body
from rubrica import pontuar
from sinais import metricas_publicas, notas_camada_a
from storage import load_json, save_json

RAIZ = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = RAIZ / "config" / "territorios.json"
AVISO_IA = "Análise assistida por IA. Notas são hipóteses para revisão humana, não diagnóstico."


def auditar_perfil(perfil: dict, cartao: dict, palavras_chave: list[str], now: datetime, avaliador_b) -> dict:
    metricas = metricas_publicas(perfil, palavras_chave, now)
    notas = notas_camada_a(metricas) + avaliador_b(perfil, cartao)
    textos = [perfil.get("bio", ""), *(p.get("titulo_ou_legenda", "") for p in perfil.get("posts", []))]
    autenticado = any("insights" in p for p in perfil.get("posts", []))
    return {
        "handle": perfil["handle"],
        "auditado_em": now.isoformat(),
        "metricas": metricas,
        "metricas_autenticadas": metricas_autenticadas(perfil) if autenticado else None,
        "notas": notas,
        "pontuacao": pontuar(notas, textos),
    }


def _fmt(valor) -> str:
    return "—" if valor is None else f"{valor:.1f}".replace(".", ",")


def _fmt_pct(valor) -> str:
    return "—" if valor is None else f"{valor * 100:.2f}".replace(".", ",") + "%"


def build_auditoria_md(cliente_id: str, resultados: list[dict], falhas: list[str], now: datetime) -> str:
    out = [f"# Auditoria de perfil — {cliente_id} — {now:%Y-%m-%d}", ""]
    if falhas:
        out += ["## ⚠️ Falhas desta execução", *[f"- {f}" for f in falhas], ""]
    if resultados:
        cliente, *outros = resultados
        ordenados = [cliente, *sorted(outros, key=lambda r: -(r["pontuacao"]["total"] or 0))]
        out += ["| Perfil | Camada A (algoritmo) | Camada B (neuro) | Penalidade ética | Total |",
                "|---|---|---|---|---|"]
        for r in ordenados:
            p = r["pontuacao"]
            out.append(f"| {r['handle']} | {_fmt(p['camada_a'])} | {_fmt(p['camada_b'])} | "
                       f"{p['penalidade_etica']} | {_fmt(p['total'])} |")
        out.append("")
        for r in ordenados:
            out += [f"## {r['handle']}", ""]
            for n in r["notas"]:
                nota = "—" if n["nota"] is None else n["nota"]
                out.append(f"- **{n['camada']} · {n['id']}**: {nota}/3 — {n['evidencia']}")
            for alerta in r["metricas"].get("alertas", []):
                out.append(f"- ⚠️ {alerta}")
            for a in r["pontuacao"]["alertas_copy"]:
                out.append(f"- ⚠️ copy ({a['tipo']}): \"{a['trecho']}\"")
            auth = r.get("metricas_autenticadas")
            if auth:
                out.append(
                    "- Métricas do próprio perfil (mediana por post, sem nota nesta fase): "
                    f"compartilhamentos/alcance {_fmt_pct(auth['sends_por_alcance'])}, "
                    f"curtidas/alcance {_fmt_pct(auth['likes_por_alcance'])}, "
                    f"salvamentos/alcance {_fmt_pct(auth['saves_por_alcance'])}"
                )
            out.append("")
    out.append(AVISO_IA)
    return "\n".join(out) + "\n"


def _caminho_cartao(cliente: dict, base: Path) -> Path:
    caminho = Path(cliente["cartao"])
    return caminho if caminho.is_absolute() else Path(base) / caminho


def run_auditoria(
    config: dict,
    data_dir: Path,
    now: datetime,
    coletar_publico: Optional[Callable[[str], dict]],
    coletar_autenticado: Optional[Callable[[], dict]],
    avaliador_b: Callable[[dict, dict], list[dict]],
    base_config: Path = RAIZ,
) -> tuple[list[Path], list[str]]:
    data_dir = Path(data_dir)
    falhas: list[str] = []
    mds: list[Path] = []
    if coletar_publico is None:
        return mds, ["Instagram não configurado (META_ACCESS_TOKEN / IG_USER_ID)"]

    rivais = [c for c in load_json(data_dir / "data" / "concorrentes.json", [])
              if c.get("plataforma") == "instagram" and c.get("status") == "aprovado"]
    token_expirado = False

    for cliente in config.get("clientes", []):
        if token_expirado:
            break
        inicio = len(falhas)
        nome = cliente.get("id", "?") if isinstance(cliente, dict) else "?"
        faltando = [k for k in ("id", "handle", "cartao") if not isinstance(cliente, dict) or not cliente.get(k)]
        if faltando:
            falhas.append(f"cliente {nome} pulado: entrada em clientes sem {', '.join(faltando)}")
            continue
        try:
            cartao = load_cartao(_caminho_cartao(cliente, base_config))
        except CartaoInvalido as e:
            falhas.append(f"cliente {nome} pulado: {e}")
            continue
        palavras = cartao.get("palavras_chave") or config.get("palavras_chave", [])

        alvos = [(cliente["handle"], cliente.get("proprio") and coletar_autenticado)]
        alvos += [(c["handle"], None) for c in rivais]
        resultados: list[dict] = []
        for handle, autenticado in alvos:
            try:
                perfil = autenticado() if autenticado else coletar_publico(handle)
            except TokenExpirado:
                token_expirado = True
                falhas.append("renovar token Meta (Instagram)")
                break
            except (SemAcesso, GraphError) as e:
                falhas.append(f"instagram {handle}: {e}")
                continue
            except Exception as e:  # rede, resposta malformada: um perfil falha, os outros continuam
                falhas.append(f"instagram {handle}: {type(e).__name__}: {e}")
                continue
            try:
                resultados.append(auditar_perfil(perfil, cartao, palavras, now, avaliador_b))
            except Exception as e:  # um perfil falha, os outros continuam
                falhas.append(f"auditoria de {handle}: {e}")

        if not resultados:
            continue
        save_json(data_dir / "data" / "auditorias" / cliente["id"] / f"{now:%Y-%m-%d}.json",
                  {"cliente_id": cliente["id"], "auditado_em": now.isoformat(), "perfis": resultados})
        caminho = data_dir / "relatorios" / "auditorias" / f"{cliente['id']}-{now:%Y-%m-%d}.md"
        caminho.parent.mkdir(parents=True, exist_ok=True)
        caminho.write_text(build_auditoria_md(cliente["id"], resultados, falhas[inicio:], now), encoding="utf-8")
        mds.append(caminho)
    return mds, falhas


def _escrever_issue(data_dir: Path, mds: list[Path], falhas: list[str], now: datetime) -> None:
    corpo = "\n\n".join(p.read_text(encoding="utf-8") for p in mds) or (
        f"# Auditoria de perfil — {now:%Y-%m-%d}\n\nNenhum perfil auditado.\n\n{AVISO_IA}\n")
    Path(data_dir).mkdir(parents=True, exist_ok=True)
    (Path(data_dir) / "issue.md").write_text(build_issue_body(corpo, falhas), encoding="utf-8")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(DEFAULT_CONFIG))
    ap.add_argument("--data-dir", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    config = load_config(Path(args.config))
    data_dir = Path(args.data_dir)
    now = datetime.now(timezone.utc)

    if args.dry_run:
        from dry_run_fakes import avaliador_b_falso, cliente_exemplo, perfil_falso, sample_concorrentes

        arq = data_dir / "data" / "concorrentes.json"
        if not load_json(arq, []):
            save_json(arq, sample_concorrentes())
        config = {**config, "clientes": config.get("clientes") or [cliente_exemplo(data_dir)]}
        mds, falhas = run_auditoria(config, data_dir, now, perfil_falso, None, avaliador_b_falso)
        _escrever_issue(data_dir, mds, falhas, now)
        return 0

    meta, ig_id = os.environ.get("META_ACCESS_TOKEN"), os.environ.get("IG_USER_ID")
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        print("Falta OPENAI_API_KEY.", file=sys.stderr)
        return 2
    import openai

    from instagram import collect_perfil_publico
    from llm import OpenAILLM
    from perfil import collect_perfil_autenticado
    from rubrica import avaliar_camada_b

    llm = OpenAILLM(openai.OpenAI(api_key=openai_key))
    limite = config.get("max_posts_auditoria", 24)
    publico = (lambda h: collect_perfil_publico(h, ig_id, meta, limit=limite)) if meta and ig_id else None
    autenticado = (lambda: collect_perfil_autenticado(ig_id, meta, limit=limite)) if meta and ig_id else None
    mds, falhas = run_auditoria(
        config, data_dir, now, publico, autenticado,
        lambda p, c: avaliar_camada_b(p, c, llm, config["modelo_analise"]),
    )
    _escrever_issue(data_dir, mds, falhas, now)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
