# Inteligência de Concorrentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agente semanal, rodando em GitHub Actions, que coleta posts de concorrentes aprovados (YouTube + Instagram), ranqueia por engajamento, analisa o top com o Claude e publica um relatório 5-3 numa Issue.

**Architecture:** Scripts Python pequenos e puros (score, ranking, storage) cercados por coletores com `fetch`/cliente injetáveis, para testar sem rede. Um orquestrador isola falhas por fonte. Os dados vivem na branch `dados-concorrentes`; o código, na branch principal.

**Tech Stack:** Python 3.12, `urllib` (stdlib) para HTTP, `anthropic` (análise), `pytest`, `pyyaml` (teste do workflow), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-05-inteligencia-concorrentes-design.md`

## Global Constraints

- Tudo em `inteligencia-concorrentes/`, exceto o workflow em `.github/workflows/semanal.yml` (o GitHub só lê workflows na raiz).
- Módulos em `inteligencia-concorrentes/scripts/`; testes em `inteligencia-concorrentes/tests/`; rodar com `cd inteligencia-concorrentes && python -m pytest -v`.
- `score = (curtidas + 2 × comentarios) / seguidores`; rankings separados por plataforma.
- Janela: 90 dias; exclui posts com menos de 48 horas.
- Selo validado: YouTube ≥ 1.000.000 views; Instagram ≥ 50.000 curtidas (valores em `config/territorios.json`).
- YouTube na coleta semanal: playlist de uploads (1 unidade), nunca `search.list` (100 unidades). `search.list` só na descoberta, limitada por `max_buscas_youtube`.
- Instagram: Business Discovery da Meta; sem views. Perfil não profissional/privado vira `sem_acesso`; token expirado vira falha "renovar token Meta".
- Só concorrentes com `status == "aprovado"` são coletados.
- Análise do Claude: só top da semana, nunca repete post já analisado, saída JSON fixa.
- Datas em ISO 8601 UTC. Chaves só em GitHub Secrets (`YOUTUBE_API_KEY`, `META_ACCESS_TOKEN`, `IG_USER_ID`, `ANTHROPIC_API_KEY`).
- Dados na branch `dados-concorrentes`; nunca force push. TDD; `--dry-run` sem rede nem chaves.

**Ajustes ao spec decididos neste plano** (aplicados no Task 1): (a) workflow na raiz do repo; (b) `data/` e `relatorios/` ficam na branch `dados-concorrentes`; (c) formato `imagem` adicionado para posts de foto única do Instagram; (d) "top 10" = 5 por plataforma (`analise_por_plataforma`).

## Review Focus

- Concorrente com `seguidores` 0 ou ausente: score `0.0`, sem `ZeroDivisionError` (Task 2).
- Instagram com curtidas ocultas (`like_count` ausente): post não é descartado nem quebra; conta 0 curtidas (Tasks 2 e 5).
- Mesmo post em duas coletas: não duplica e preenche `anterior` (Task 3).
- Claude devolve texto fora do JSON esperado: o post fica sem análise, é tentado de novo na semana seguinte e a execução continua (Task 6).
- Concorrente `descartado` ou `candidato` nunca é coletado nem aparece no ranking (Tasks 2 e 8).

---

### Task 1: Esqueleto, config e ajustes no spec

**Files:**
- Create: `inteligencia-concorrentes/pytest.ini` (`pythonpath = scripts`, `testpaths = tests`), `inteligencia-concorrentes/requirements.txt` (`anthropic`, `pytest`, `pyyaml`), `inteligencia-concorrentes/scripts/config.py`, `inteligencia-concorrentes/config/territorios.json`, `inteligencia-concorrentes/tests/test_config.py`
- Modify: `docs/superpowers/specs/2026-10-05-inteligencia-concorrentes-design.md` (aplicar os 4 ajustes acima nas seções 4, 5 e 6)

**Interfaces:**
- Produces: `load_config(path: Path) -> dict`; levanta `ValueError` se faltar chave obrigatória.
- `territorios.json` com: `territorio: "A"`, `nome`, `palavras_chave` (PT e EN: condicionamento, crenças limitantes, autossabotagem, identidade, mudança de comportamento, behavior change, limiting beliefs, self-sabotage), `limiares: {youtube_views_validado: 1000000, instagram_curtidas_validado: 50000}`, `janela_dias: 90`, `idade_minima_horas: 48`, `analise_por_plataforma: 5`, `modelo_analise: "claude-haiku-4-5-20251001"`, `max_buscas_youtube: 5`, `max_posts_por_concorrente: 30`.

- [ ] **Step 1: Write failing tests** in `tests/test_config.py`: `test_config_real_tem_valores_do_spec` (carrega `config/territorios.json`; assert `limiares["youtube_views_validado"] == 1_000_000`, `janela_dias == 90`, `idade_minima_horas == 48`) e `test_config_sem_chave_obrigatoria_falha` (arquivo sem `limiares` → `pytest.raises(ValueError)`).
- [ ] **Step 2: Run** `cd inteligencia-concorrentes && python -m pytest tests/test_config.py -v`. Expected: FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `load_config` em `scripts/config.py` e criar `territorios.json`, `pytest.ini`, `requirements.txt`.
- [ ] **Step 4: Run** o mesmo comando. Expected: PASS.
- [ ] **Step 5: Atualizar o spec** com os 4 ajustes; **Commit** `feat: esqueleto e config do agente de concorrentes`.

### Task 2: Score, selo validado e ranking

**Files:** Create `scripts/scoring.py`, `tests/test_scoring.py`

**Interfaces:**
- Produces:
  - `score_post(post: dict, seguidores: int) -> float`
  - `is_validated(post: dict, config: dict) -> bool`
  - `in_window(post: dict, now: datetime, config: dict) -> bool`
  - `rank(posts: list[dict], concorrentes: list[dict], config: dict, now: datetime) -> dict[str, list[dict]]` — chaves `"youtube"` e `"instagram"`; cada post ganha `score` e `validado`; ordenado por `score` decrescente; só concorrentes `aprovado`.
- Post: chaves do spec (seção 5); `curtidas` pode ser `None`.

- [ ] **Step 1: Write failing tests:** `test_score_formula` (`curtidas=100, comentarios=10`, seguidores 1000 → `0.12`); `test_score_seguidores_zero_retorna_zero`; `test_score_curtidas_ocultas_contam_zero` (`curtidas=None, comentarios=10`, seguidores 100 → `0.2`); `test_validado_youtube_no_limite` (999_999 → False, 1_000_000 → True); `test_validado_instagram_usa_curtidas` (50_000 → True); `test_janela_exclui_menos_de_48h_e_mais_de_90d` (47h → False, 49h → True, 91d → False); `test_rank_separa_plataformas_e_ordena`; `test_rank_ignora_concorrente_descartado_e_candidato`.
- [ ] **Step 2: Run** `python -m pytest tests/test_scoring.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** as quatro funções; datas ISO 8601 UTC convertidas com `datetime.fromisoformat`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: score, selo validado e ranking`.

### Task 3: Storage e merge de posts

**Files:** Create `scripts/storage.py`, `tests/test_storage.py`

**Interfaces:**
- Produces:
  - `load_json(path: Path, default)` e `save_json(path: Path, data) -> None` (escrita atômica: arquivo temporário + `os.replace`; `indent=2`, `ensure_ascii=False`).
  - `posts_path(data_dir: Path, now: datetime) -> Path` → `data/posts/AAAA-MM.json`.
  - `merge_posts(existing: list[dict], new: list[dict]) -> list[dict]` — chave `id`; no post já existente, `anterior = {views, curtidas, comentarios, coletado_em}` recebe a coleta antiga e os campos atuais vêm da nova.

- [ ] **Step 1: Write failing tests:** `test_save_json_atomico_e_load_default` (arquivo ausente → default); `test_merge_nao_duplica_e_preenche_anterior`; `test_merge_post_novo_vem_sem_anterior`.
- [ ] **Step 2: Run** `python -m pytest tests/test_storage.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** as três funções.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: storage e merge de posts`.

### Task 4: Coletor YouTube

**Files:** Create `scripts/youtube.py`, `tests/test_youtube.py`, `tests/fixtures/youtube_channel.json`, `tests/fixtures/youtube_playlist.json`, `tests/fixtures/youtube_videos.json`

**Interfaces:**
- Produces: `collect_youtube(concorrente: dict, api_key: str, fetch: Callable[[str, dict], dict] = http_get_json, max_videos: int = 30) -> tuple[list[dict], int]` — retorna `(posts, seguidores)`.
- Sequência de chamadas: `channels.list` (`contentDetails,statistics`) → `playlistItems.list` (uploads) → `videos.list` (`statistics,contentDetails`). Total: 3 unidades.
- `formato = "short"` se duração ≤ 180 s, senão `"video"`; `views`, `curtidas`, `comentarios` como inteiros; `url = https://www.youtube.com/watch?v=<id>`; `id = "yt:<videoId>"`.

- [ ] **Step 1: Write failing tests** com `fetch` falso lendo as fixtures: `test_collect_youtube_mapeia_campos` (assert `id`, `url`, `views`, `seguidores`); `test_collect_youtube_classifica_short_por_duracao` (PT0M59S → short, PT10M → video); `test_collect_youtube_nunca_usa_search` (assert que nenhuma URL chamada contém `search`).
- [ ] **Step 2: Run** `python -m pytest tests/test_youtube.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `collect_youtube` e `http_get_json(url, params) -> dict` com `urllib.request`, timeout 30 s.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: coletor YouTube pela playlist de uploads`.

### Task 5: Coletor Instagram

**Files:** Create `scripts/instagram.py`, `tests/test_instagram.py`, `tests/fixtures/ig_business_discovery.json`, `tests/fixtures/ig_error_nao_profissional.json`, `tests/fixtures/ig_error_token.json`

**Interfaces:**
- Produces: `class SemAcesso(Exception)`, `class TokenExpirado(Exception)`, `collect_instagram(concorrente: dict, ig_user_id: str, token: str, fetch: Callable[[str, dict], dict] = http_get_json, limit: int = 30) -> tuple[list[dict], int]`.
- Consome `http_get_json` de `youtube.py`.
- Chamada: `GET /{ig_user_id}?fields=business_discovery.username(<handle>){followers_count,media.limit(N){id,caption,media_type,permalink,timestamp,like_count,comments_count}}`.
- Mapeamento: `VIDEO` → `reel`, `CAROUSEL_ALBUM` → `carrossel`, `IMAGE` → `imagem`; `views = None`; `curtidas = None` se `like_count` ausente; `id = "ig:<id>"`.
- Erro código 190 → `TokenExpirado`; erro de usuário inexistente/não profissional → `SemAcesso`.
- **Antes de implementar, confirmar na documentação atual da Meta** os campos e códigos de erro da Business Discovery; ajustar fixtures se divergirem.

- [ ] **Step 1: Write failing tests:** `test_collect_instagram_mapeia_formatos`; `test_curtidas_ocultas_viram_none`; `test_nao_profissional_levanta_sem_acesso`; `test_token_expirado_levanta_token_expirado`.
- [ ] **Step 2: Run** `python -m pytest tests/test_instagram.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `collect_instagram` e as duas exceções.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: coletor Instagram via Business Discovery`.

### Task 6: Análise pelo Claude

**Files:** Create `scripts/analyze.py`, `tests/test_analyze.py`

**Interfaces:**
- Produces:
  - `select_top(ranked: dict[str, list[dict]], analisadas: set[str], config: dict) -> list[dict]` — `analise_por_plataforma` posts por plataforma, pulando ids em `analisadas`.
  - `analyze_post(post: dict, client, model: str) -> dict | None` — retorna `{post_id, gancho, tema, promessa, por_que_funcionou, adaptacao_galifrael}` ou `None` se a resposta não for JSON válido com essas chaves.
  - `ANALISE_PROMPT: str` — pede JSON fixo, em português, e liga `adaptacao_galifrael` à tese "descubra quem você está repetindo".
- `client` é qualquer objeto com `.messages.create(...)` (compatível com `anthropic.Anthropic`).

- [ ] **Step 1: Write failing tests** com cliente falso: `test_select_top_respeita_limite_por_plataforma`; `test_select_top_pula_ja_analisados`; `test_analyze_post_json_valido`; `test_analyze_post_texto_fora_do_json_retorna_none`.
- [ ] **Step 2: Run** `python -m pytest tests/test_analyze.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** as duas funções e o prompt; `max_tokens` baixo (600).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: análise do top semanal pelo Claude`.

### Task 7: Relatório 5-3 e corpo da Issue

**Files:** Create `scripts/report.py`, `tests/test_report.py`

**Interfaces:**
- Produces:
  - `build_report(ranked: dict[str, list[dict]], concorrentes: list[dict], analises: dict[str, dict], falhas: list[str], now: datetime) -> str`
  - `build_issue_body(report_md: str, falhas: list[str]) -> str` (falhas no topo; depois resumo curto com link para o arquivo).
- Regras do relatório: falhas primeiro; os 5 concorrentes melhores (mais posts validados, desempate pelo maior `score`) com os 3 posts de topo cada; seção "Padrões da semana" (formatos e temas mais frequentes entre os analisados); uma sugestão por padrão, vinda de `adaptacao_galifrael`.

- [ ] **Step 1: Write failing tests:** `test_relatorio_lista_5_concorrentes_com_3_posts_cada`; `test_relatorio_poe_falhas_no_topo`; `test_relatorio_sem_analises_nao_quebra`; `test_issue_body_avisa_renovar_token` (falha "renovar token Meta" aparece na primeira linha).
- [ ] **Step 2: Run** `python -m pytest tests/test_report.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** as duas funções.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: relatório 5-3 e resumo para Issue`.

### Task 8: Orquestrador semanal com `--dry-run`

**Files:** Create `scripts/run_weekly.py`, `scripts/dry_run_fakes.py`, `tests/test_run_weekly.py`

**Interfaces:**
- Consome: `rank`, `merge_posts`, `posts_path`, `load_json`, `save_json`, `select_top`, `analyze_post`, `build_report`, `build_issue_body`, `collect_youtube`, `collect_instagram`, `SemAcesso`, `TokenExpirado`.
- Produces:
  - `@dataclass Collectors: youtube: Callable[[dict], tuple[list[dict], int]]; instagram: Callable[[dict], tuple[list[dict], int]]`
  - `@dataclass RunResult: report_path: Path; issue_body: str; falhas: list[str]`
  - `run(config: dict, data_dir: Path, now: datetime, collectors: Collectors, analyzer: Callable[[dict], dict | None]) -> RunResult`
  - `main(argv: list[str]) -> int` — flags `--config`, `--data-dir`, `--dry-run`; sem `--dry-run` monta coletores reais com as variáveis de ambiente; grava `<data-dir>/issue.md`.
- Regras: coleta só `aprovado`; `SemAcesso` marca o concorrente `sem_acesso`; `TokenExpirado` adiciona "renovar token Meta" às falhas e pula todo o Instagram; qualquer outra exceção de um concorrente vira linha em `falhas` e as demais fontes continuam; atualiza `seguidores` do concorrente; grava análises em `data/analises.json` e o relatório em `relatorios/AAAA-MM-DD.md`.

- [ ] **Step 1: Write failing tests** com `tmp_path` e coletores falsos: `test_nunca_coleta_candidato_nem_descartado`; `test_sem_acesso_marca_status`; `test_token_expirado_pula_instagram_e_avisa`; `test_falha_de_um_canal_nao_interrompe_os_outros`; `test_dry_run_gera_relatorio_posts_e_issue_sem_rede` (chama `main(["--dry-run", "--data-dir", str(tmp_path), ...])`; assert exit 0 e três arquivos existem); `test_nao_reanalisa_post_ja_analisado`.
- [ ] **Step 2: Run** `python -m pytest tests/test_run_weekly.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `run`, `main` e `dry_run_fakes.py` (coletores e analisador determinísticos com 2 concorrentes de exemplo).
- [ ] **Step 4: Run** a suíte inteira `python -m pytest -v`. Expected: tudo PASS.
- [ ] **Step 5: Commit** `feat: orquestrador semanal com dry-run e isolamento de falhas`.

### Task 9: Descoberta de candidatos (sob demanda)

**Files:** Create `scripts/discover.py`, `tests/test_discover.py`, `tests/fixtures/youtube_search.json`

**Interfaces:**
- Produces:
  - `merge_candidates(existing: list[dict], found: list[dict]) -> list[dict]` — dedupe por `(plataforma, handle ou channel_id)`; novos entram com `status: "candidato"`; nunca altera `aprovado`/`descartado`.
  - `youtube_candidates(config: dict, api_key: str, fetch=http_get_json) -> list[dict]` — no máximo `max_buscas_youtube` chamadas a `search.list`, uma por palavra-chave; cada candidato traz `motivo = "palavra-chave: <termo>"`.
  - `main(argv: list[str]) -> int` — grava em `<data-dir>/data/concorrentes.json`.
- Candidatos de Instagram: nesta fase, o Elvis adiciona handles manualmente em `concorrentes.json` com `status: "candidato"`. Busca web por Claude fica para a fase 2 (precisa confirmar custo e disponibilidade da ferramenta).

- [ ] **Step 1: Write failing tests:** `test_merge_nao_duplica_nem_rebaixa_aprovado`; `test_youtube_candidates_respeita_max_buscas` (config com 2 termos e `max_buscas_youtube = 1` → 1 chamada); `test_candidato_traz_motivo_e_status`.
- [ ] **Step 2: Run** `python -m pytest tests/test_discover.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** as funções.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: descoberta de candidatos no YouTube`.

### Task 10: Workflow, README e verificação final

**Files:** Create `.github/workflows/semanal.yml`, `inteligencia-concorrentes/README.md`, `inteligencia-concorrentes/tests/test_workflow.py`

**Interfaces:** Consome `run_weekly.main` e `discover.main`.

- Workflow: `on: schedule: cron "0 9 * * 1"` (UTC) e `workflow_dispatch` com input `modo` (`coletar` | `descobrir`); `permissions: contents: write, issues: write`; passos: checkout → Python 3.12 → `pip install -r inteligencia-concorrentes/requirements.txt` → rodar testes → preparar branch de dados via `git worktree` em `dados/` (cria órfã `dados-concorrentes` se não existir) → executar `run_weekly.py` ou `discover.py` com `--data-dir dados` → commit e push **normal** na `dados-concorrentes` → `gh issue create --body-file dados/issue.md`.
- README: como cadastrar os 4 Secrets; como aprovar candidatos (editar `data/concorrentes.json` na branch `dados-concorrentes` pelo GitHub e mudar `status` para `aprovado`); como renovar o token da Meta; como disparar manualmente.

- [ ] **Step 1: Write failing tests** em `tests/test_workflow.py` (lê o YAML): `test_cron_semanal_segunda`; `test_tem_disparo_manual_com_modo`; `test_permissoes_minimas`; `test_nunca_usa_force_push` (nenhum trecho com `--force` ou `push -f`); `test_chaves_vem_de_secrets` (nenhuma chave literal; as quatro referenciadas como `secrets.*`).
- [ ] **Step 2: Run** `python -m pytest tests/test_workflow.py -v`. Expected: FAIL.
- [ ] **Step 3: Escrever** `semanal.yml` e `README.md`.
- [ ] **Step 4: Verificar:** `python -m pytest -v` (tudo PASS) e `python scripts/run_weekly.py --dry-run --data-dir /tmp/dados-teste`; Expected: exit 0, relatório e `issue.md` gerados.
- [ ] **Step 5: Commit** `feat: workflow semanal e README do agente de concorrentes`.
