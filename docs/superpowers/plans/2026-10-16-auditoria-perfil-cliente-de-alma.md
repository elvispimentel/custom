# Auditoria de Perfil por Cliente de Alma — Plano de Implementação (Fases 0 e 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acrescentar ao `inteligencia-concorrentes` um modo `auditar`. Ele dá nota ao perfil de Instagram de um cliente e aos concorrentes aprovados dele, usando as camadas A (sinais que o algoritmo declara) e B (neuromarketing com evidência), contextualizadas pelo cartão do cliente de alma escrito à mão.

**Architecture:** Módulos pequenos e puros (`sinais`, `etica`, `cartao`, `rubrica`) cercados por coletores com `fetch` injetável, no mesmo padrão de `instagram.py`. A camada A é determinística, calculada a partir de métricas. A camada B é dada pela LLM, que precisa citar um trecho literal do perfil. Um orquestrador `auditar.py` grava JSON e Markdown na branch `dados-concorrentes` e gera o corpo da Issue. A calibração com o Elvis compara as notas da LLM com notas humanas antes de confiar nos números.

**Tech Stack:** Python 3.12, `urllib` (stdlib), `openai` via o adaptador `llm.complete(prompt, model, max_tokens)`, `pytest`, `pyyaml`, GitHub Actions.

**Spec:** `reports/Análise de perfil para cliente de alma.md` (seções "A arquitetura recomendada" e "Próximos passos em fases"). Plano anterior, para o padrão do código: `docs/superpowers/plans/2026-10-05-inteligencia-concorrentes.md`.

## Global Constraints

- Código em `inteligencia-concorrentes/scripts/`, testes em `inteligencia-concorrentes/tests/`. Rodar com `cd inteligencia-concorrentes && python -m pytest -q`. O workflow continua em `.github/workflows/semanal.yml`.
- **Nenhuma dependência nova** nas fases 0 e 1 (pysentimiento e embeddings ficam para a fase 2).
- Toda chamada HTTP recebe `fetch: Callable[[str, dict], dict] = http_get_graph`, para os testes rodarem sem rede. `--dry-run` não usa rede nem chaves.
- Graph API: reaproveitar `GRAPH`, `TokenExpirado`, `SemAcesso` e `GraphError` de `instagram.py`. Nome de campo ou de métrica não confirmado na API real leva o comentário `# NÃO VERIFICADO — confirmar na Fase 0`.
- Nota de cada critério: inteiro de 0 a 3. Na camada B, a `evidencia` precisa ser um trecho literal da bio ou de uma legenda do perfil auditado (comparação sem diferenciar maiúsculas e minúsculas e com espaços normalizados); se não for, a nota vira `None`, com o motivo `"evidência não encontrada no perfil"`.
- Engajamento por seguidor = `(curtidas + comentarios) / seguidores`. Referência: **0,52% (Reels) a 0,55% (carrossel)**, segundo a Socialinsider 2026. O relatório sempre mostra a definição ao lado do número.
- Originalidade: se a taxa estimada de repost nos últimos 30 dias passar de **50%**, sai o alerta `"inelegível para recomendação a não seguidores (regra IG abr/2026)"`.
- LGPD: nunca gravar dado por seguidor. Nenhum texto gerado pode atribuir religião, saúde, vida sexual ou opinião política ao público (art. 5º, II). Todo relatório termina com a linha exata: `Análise assistida por IA. Notas são hipóteses para revisão humana, não diagnóstico.`
- Sem LinkedIn, sem raspagem com login, sem Instaloader nesta fase.
- Saídas na branch `dados-concorrentes`: `data/auditorias/<cliente_id>/AAAA-MM-DD.json` e `relatorios/auditorias/<cliente_id>-AAAA-MM-DD.md`. Datas em ISO 8601 UTC.
- Texto voltado ao usuário em PT-BR.

## Review Focus

- Perfil sem bio, sem nome ou com `media` vazia: a auditoria sai com as notas da camada A que ainda dão para calcular e as da camada B como `None` ("sem texto"), sem quebrar (Tasks 4 e 7).
- `seguidores` 0 ou ausente: engajamento `None`, não `ZeroDivisionError` (Task 4).
- A LLM inventa uma citação que não está no perfil, ou devolve nota fora de 0 a 3: aquele critério vira `None` e o resto se mantém (Task 7).
- Cartão com `"aprovado": false` ou sem chave obrigatória: o cliente é pulado com uma falha legível na Issue, e os outros clientes rodam (Tasks 3 e 8).
- Bio que é do próprio nicho espiritual ("sou terapeuta holística"): não pode ser redigida pelo filtro de LGPD, que só age quando a frase fala do **público** (Task 6).

---

### Task 1: Business Discovery com campos de perfil e `view_count`

**Files:**
- Modify: `inteligencia-concorrentes/scripts/instagram.py`
- Create: `inteligencia-concorrentes/tests/fixtures/ig_business_discovery_perfil.json`
- Test: `inteligencia-concorrentes/tests/test_instagram.py`

**Interfaces:**
- Produces: `checar_erro(resp: dict) -> None`, que levanta `TokenExpirado`/`SemAcesso`/`GraphError` (extraída de `collect_instagram`, sem mudar o comportamento). Também produz `collect_perfil_publico(handle: str, ig_user_id: str, token: str, fetch=http_get_graph, limit: int = 30) -> dict`, que devolve `{"handle", "nome", "bio", "website", "seguidores", "posts": list[dict]}`, com os posts no mesmo formato de `collect_instagram`, `concorrente_id = handle`.
- `collect_instagram` passa a pedir `view_count` e a mapeá-lo para `views` (`None` se ausente).

- [ ] **Step 1: Criar a fixture** `ig_business_discovery_perfil.json`, igual a `ig_business_discovery.json` mais `"username": "canalx"`, `"name": "Ana Terapeuta"`, `"biography": "Ajudo terapeutas a lotar a agenda sem pressão"`, `"website": "https://ana.example"` dentro de `business_discovery`, e `"view_count": 300000` no post `id 1`.
- [ ] **Step 2: Escrever os testes que falham**

```python
def test_collect_perfil_publico_traz_bio_e_views():
    perfil = collect_perfil_publico("canalx", "IGID", "TOKEN", fetch=fetch_from("ig_business_discovery_perfil"))
    assert (perfil["nome"], perfil["bio"], perfil["website"]) == (
        "Ana Terapeuta", "Ajudo terapeutas a lotar a agenda sem pressão", "https://ana.example")
    assert perfil["seguidores"] == 50000
    assert perfil["posts"][0]["views"] == 300000 and perfil["posts"][1]["views"] is None

def test_collect_perfil_publico_pede_campos_de_perfil():
    calls = []
    collect_perfil_publico("canalx", "IGID", "TOKEN", fetch=fetch_from("ig_business_discovery_perfil", calls))
    for campo in ("biography", "name", "website", "view_count", "username(canalx)"):
        assert campo in calls[0][1]["fields"]

def test_perfil_sem_bio_vira_texto_vazio():  # fixture ig_business_discovery.json não tem bio
    perfil = collect_perfil_publico("canalx", "IGID", "TOKEN", fetch=fetch_from("ig_business_discovery"))
    assert perfil["bio"] == "" and perfil["nome"] == ""

def test_collect_perfil_publico_token_expirado():
    with pytest.raises(TokenExpirado):
        collect_perfil_publico("canalx", "IGID", "TOKEN", fetch=fetch_from("ig_error_token"))
```

- [ ] **Step 3: Rodar** `python -m pytest tests/test_instagram.py -q`. Esperado: FAIL (`collect_perfil_publico` não existe).
- [ ] **Step 4: Implementar** `checar_erro`, `collect_perfil_publico` e `view_count` em `collect_instagram`. Reaproveitar um `_mapear_post(m, dono_id, agora) -> dict` único nas duas funções. Marcar `biography`, `name`, `website` e `view_count` com `# NÃO VERIFICADO — confirmar na Fase 0`.
- [ ] **Step 5: Rodar toda a suíte** `python -m pytest -q`. Esperado: tudo PASS, incluindo os testes antigos de `collect_instagram`.
- [ ] **Step 6: Commit** `feat(instagram): perfil público com bio, nome, site e view_count`

### Task 2: Verificador de campos para a Fase 0

**Files:**
- Create: `inteligencia-concorrentes/scripts/verificar_campos.py`
- Test: `inteligencia-concorrentes/tests/test_verificar_campos.py`

**Interfaces:**
- Consumes: `collect_perfil_publico` (Task 1).
- Produces: `verificar(handle: str, ig_user_id: str, token: str, fetch=http_get_graph) -> dict[str, bool]`, com as chaves `"bio"`, `"nome"`, `"website"`, `"view_count"` (True se veio não vazio em ao menos um lugar). Também produz `main(argv) -> int`, que lê `META_ACCESS_TOKEN`/`IG_USER_ID` do ambiente, recebe `--handle` e imprime uma linha `campo: OK|AUSENTE` por chave. Devolve 2 se faltar alguma variável de ambiente.

- [ ] **Step 1: Teste que falha.** Com a fixture `ig_business_discovery_perfil`, `verificar(...)` devolve tudo True. Com `ig_business_discovery`, devolve `{"bio": False, "nome": False, "website": False, "view_count": False}`. `main(["--handle", "x"])` sem as variáveis de ambiente (usar `monkeypatch.delenv`) devolve 2.
- [ ] **Step 2: Rodar.** Esperado: FAIL (módulo não existe).
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `python -m pytest tests/test_verificar_campos.py -q`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: verificador de campos da Business Discovery (fase 0)`

### Task 3: Cartão do cliente de alma (esquema + exemplo)

**Files:**
- Create: `inteligencia-concorrentes/scripts/cartao.py`
- Create: `inteligencia-concorrentes/config/clientes/exemplo/cartao.json`
- Test: `inteligencia-concorrentes/tests/test_cartao.py`

**Interfaces:**
- Produces: `OBRIGATORIOS = ("identidade", "proposito", "cliente_de_alma", "mecanismo_unico", "limites_inegociaveis", "objetivo_negocio")`, `class CartaoInvalido(Exception)` e `load_cartao(path: Path) -> dict`. A função levanta `CartaoInvalido` com a mensagem `"cartão sem: <chaves>"` ou `"cartão não aprovado pelo cliente"`. Opcional: `voz_do_cliente: {"dores", "progresso_desejado", "objecoes", "frases_exatas", "metaforas", "tom"}`, todas listas de str, exceto `tom` (str). Se a seção existir, cada item é validado pelo tipo.

- [ ] **Step 1: Escrever o exemplo** `config/clientes/exemplo/cartao.json` com as 6 chaves (strings; `limites_inegociaveis` é uma lista), `"aprovado": true` e `voz_do_cliente` preenchida com 2 itens fictícios por lista. A primeira chave é `"_como_preencher"`, com uma frase: "Preencha à mão a partir do Briefing de Transição; o cliente revisa e muda aprovado para true."
- [ ] **Step 2: Testes que falham.** O exemplo carrega. Faltar `mecanismo_unico` levanta `CartaoInvalido` com `"mecanismo_unico"` na mensagem. `"aprovado": false` levanta `CartaoInvalido("cartão não aprovado pelo cliente")`. `frases_exatas: "texto"` (string em vez de lista) levanta `CartaoInvalido`.
- [ ] **Step 3: Rodar.** Esperado: FAIL.
- [ ] **Step 4: Implementar** `load_cartao`.
- [ ] **Step 5: Rodar.** Esperado: PASS.
- [ ] **Step 6: Commit** `feat: cartão do cliente de alma com validação e exemplo`

### Task 4: Camada A — sinais públicos determinísticos

**Files:**
- Create: `inteligencia-concorrentes/scripts/sinais.py`
- Test: `inteligencia-concorrentes/tests/test_sinais.py`

**Interfaces:**
- Consumes: o dict de `collect_perfil_publico` (Task 1).
- Produces: `MARCAS_REPOST = ("repost", "via @", "créditos", "credito", "cc:", "📸 @", "regram")` e `metricas_publicas(perfil: dict, palavras_chave: list[str], now: datetime) -> dict`, que devolve:
  - `engajamento_por_seguidor`: mediana de `(curtidas or 0) + (comentarios or 0)` sobre `seguidores`, em fração; `None` se `seguidores` for 0 ou faltar, ou se não houver posts.
  - `mix_formatos`: `dict[str, float]`, com a fatia de cada formato.
  - `palavras_no_nome`, `palavras_na_bio`, `palavras_nas_legendas`: `list[str]` das `palavras_chave` encontradas, sem diferenciar maiúsculas e minúsculas.
  - `taxa_repost_30d`: fatia dos posts dos últimos 30 dias com alguma `MARCAS_REPOST` na legenda; `None` se não houver posts na janela.
  - `alertas: list[str]`.

  Produz também `notas_camada_a(m: dict) -> list[dict]`, com itens `{"id", "camada": "A", "nota": int | None, "evidencia": str}` para os ids `engajamento`, `palavra_chave`, `originalidade` e `mix_formatos`, seguindo estas regras:
  - **engajamento:** < 0,25% → 0; < 0,5% → 1; < 1% → 2; ≥ 1% → 3.
  - **palavra_chave:** nenhuma → 0; só em legendas → 1; na bio → 2; no nome e na bio → 3.
  - **originalidade:** taxa > 50% → 0 e alerta (texto exato em Global Constraints); > 20% → 2; caso contrário → 3.
  - **mix_formatos:** 3 se houver ≥ 2 formatos com ≥ 20% cada, senão 1.
  - **Ausência de dado:** quando a métrica de origem é `None`, a nota é `None`.
  - **evidencia:** traz o número e a definição, por exemplo `"engajamento por seguidor 0,61% (curtidas+comentários)/seguidores; referência 0,52–0,55%"`.

- [ ] **Step 1: Testes que falham** (um por regra, com casos de fronteira):
  - 0,0025 → 1;
  - seguidores 0 → `engajamento_por_seguidor is None` e nota `None`;
  - 3 de 4 posts com "via @" → nota de originalidade 0 e o alerta está em `alertas`;
  - palavra "terapeutas" no nome e na bio → nota 3;
  - `media` vazia → `taxa_repost_30d is None` e nenhuma exceção.
- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** Usar `statistics.median` e reaproveitar `_parse` de `scoring.py` para a data.
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat: camada A de sinais públicos do algoritmo`

### Task 5: Perfil próprio autenticado (insights)

**Files:**
- Create: `inteligencia-concorrentes/scripts/perfil.py`
- Create: `inteligencia-concorrentes/tests/fixtures/ig_me.json`, `ig_media_insights.json`
- Test: `inteligencia-concorrentes/tests/test_perfil.py`

**Interfaces:**
- Consumes: `checar_erro`, `GRAPH` e o formato de post da Task 1; `metricas_publicas` (Task 4).
- Produces: `METRICAS_MIDIA = ("reach", "likes", "comments", "saved", "shares", "views")` (`# NÃO VERIFICADO — confirmar na Fase 0`). Também produz `collect_perfil_autenticado(ig_user_id: str, token: str, fetch=http_get_graph, limit: int = 24) -> dict`, com as mesmas chaves de `collect_perfil_publico` mais `insights` em cada post (`dict[str, int]` com as métricas que vierem). Faz uma chamada a `GET {GRAPH}/{ig_user_id}` (`fields=username,name,biography,website,followers_count,media.limit(n){...}`) e uma a `GET {GRAPH}/{media_id}/insights` por post. Se a chamada de insights de um post der erro, ele fica com `insights = {}` e o resto segue; `TokenExpirado` interrompe tudo. Produz ainda `metricas_autenticadas(perfil: dict) -> dict`, com as medianas por post de `sends_por_alcance` (shares/reach), `likes_por_alcance` e `saves_por_alcance`, cada uma `None` se nenhum post tiver `reach > 0`. Essas métricas **não viram nota** nesta fase (falta referência oficial) e aparecem cruas no relatório.

- [ ] **Step 1: Testes que falham.** O `fetch` falso devolve `ig_me.json` para a URL do usuário e `ig_media_insights.json` para `/insights` (formato `{"data": [{"name": "reach", "values": [{"value": 1000}]}, ...]}`). Afirmações:
  - 2 posts → 3 chamadas;
  - `posts[0]["insights"]["shares"] == 40` e `metricas_autenticadas(...)["sends_por_alcance"] == 0.04`;
  - um post cujo insights responde `{"error": {"code": 100}}` fica com `{}` e o perfil volta inteiro;
  - `ig_error_token` em `/insights` levanta `TokenExpirado`.
- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat: coleta autenticada do perfil do cliente com insights`

### Task 6: Guardas de ética e LGPD

**Files:**
- Create: `inteligencia-concorrentes/scripts/etica.py`
- Test: `inteligencia-concorrentes/tests/test_etica.py`

**Interfaces:**
- Produces:
  - `SENSIVEIS: dict[str, tuple[str, ...]]`, com as categorias `religiao`, `saude`, `sexualidade` e `politica` e seus termos (por exemplo `"cristã", "evangélic", "espírita", "católic", "umbanda"`; `"depressão", "ansiedade", "câncer", "diagnóstico"`; `"gay", "lésbica", "orientação sexual"`; `"esquerda", "direita", "bolsonarista", "petista"`).
  - `PUBLICO = ("seguidor", "público", "audiência", "leitor", "cliente", "sua base")`.
  - `redigir_inferencias(texto: str) -> tuple[str, list[str]]`. Troca por `[removido: inferência sensível sobre o público]` toda frase (separada por `.`, `!`, `?` ou quebra de linha) que contenha um termo de `PUBLICO` **e** um termo de `SENSIVEIS`, e devolve as categorias removidas.
  - `linter_copy(texto: str) -> list[dict]`, com itens `{"tipo": "atributo_pessoal" | "escassez", "trecho": str}`. A regra `atributo_pessoal` detecta `você (que )?(é|está|sofre)` seguido de um termo de `SENSIVEIS`. A regra `escassez` detecta `"últimas vagas"`, `"só hoje"`, `"acaba em"`, `"corre"` + `"vaga"` e `r"\d+ vagas"`.

- [ ] **Step 1: Testes que falham.**
  - `redigir_inferencias("Seu público é majoritariamente evangélico. A bio é clara.")` remove só a primeira frase e devolve `["religiao"]`.
  - `"Sou terapeuta e falo de ansiedade."` fica intacto, porque não fala do público.
  - `linter_copy("Você que é cristã precisa ouvir isso")` devolve um `atributo_pessoal`.
  - `linter_copy("Últimas vagas! Só hoje")` devolve dois itens de `escassez`.
  - Texto neutro devolve `[]`.
- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** Regex com `re.IGNORECASE`; comparar depois de `unicodedata.normalize("NFC")`.
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat: guardas de LGPD e linter de copy ético`

### Task 7: Camada B — rubrica de neuromarketing pela LLM + pontuação

**Files:**
- Create: `inteligencia-concorrentes/scripts/rubrica.py`
- Test: `inteligencia-concorrentes/tests/test_rubrica.py`

**Interfaces:**
- Consumes: o dict de perfil (Tasks 1 e 5), o cartão (Task 3), `notas_camada_a` (Task 4), `redigir_inferencias` e `linter_copy` (Task 6) e `llm.complete(prompt, model, max_tokens) -> str`.
- Produces:
  - `CRITERIOS_B`: tupla de `(id, peso, descricao)`, com estes valores exatos:
    - `("concretude", 3, "promessa diz público, resultado, prazo ou mecanismo")`
    - `("excitacao", 2, "ganchos usam emoção de alta excitação (admiração, indignação, ansiedade com resolução); tristeza ou medo sem saída valem menos")`
    - `("fluencia", 2, "frases curtas, sem jargão, uma chamada para ação por peça")`
    - `("prova", 3, "casos, números ou depoimentos verificáveis")`
    - `("parassocial", 2, "fala direta, bastidores, resposta a comentários, rosto")`
    - `("encaixe_cartao", 3, "fala com o cliente_de_alma e o objetivo_negocio do cartão")`
  - `PESOS_A = {"engajamento": 3, "originalidade": 3, "palavra_chave": 2, "mix_formatos": 1}`.
  - `RUBRICA_PROMPT`: string com `{cartao}`, `{bio}`, `{nome}`, `{legendas}` (as até 12 legendas mais recentes, numeradas). Pede **só JSON** `{"criterios": [{"id", "nota", "evidencia"}]}` e diz: "evidencia deve ser cópia literal de um trecho da bio ou de uma legenda"; "não faça nenhuma inferência sobre religião, saúde, sexualidade ou política do público".
  - `avaliar_camada_b(perfil: dict, cartao: dict, llm, model: str) -> list[dict]`, com itens `{"id", "camada": "B", "nota": int | None, "evidencia": str}` para todos os ids de `CRITERIOS_B`, sem exceção:
    - id ausente, nota fora de 0 a 3 ou que não seja `int` → `nota None` com `evidencia "resposta inválida da LLM"`;
    - evidência que não aparece no perfil → `None` com `"evidência não encontrada no perfil"`;
    - perfil sem bio e sem legendas → nenhuma chamada à LLM e tudo `None` com `"sem texto"`;
    - JSON ilegível → tudo `None`;
    - a `evidencia` aceita passa por `redigir_inferencias`.
  - `pontuar(notas: list[dict], textos: list[str]) -> dict`, que devolve `{"camada_a": float | None, "camada_b": float | None, "total": float | None, "penalidade_etica": int, "alertas_copy": list[dict]}`:
    - cada camada = soma(peso × nota) / soma(peso × 3) × 100, só sobre as notas que não são `None`, arredondado a 1 casa; `None` se a camada não tiver nenhuma nota;
    - `total` = média das camadas que existem − `penalidade_etica`;
    - `penalidade_etica` = 5 × `len(linter_copy(bio + legendas))`, com limite de 20;
    - `total` nunca fica abaixo de 0.

- [ ] **Step 1: Testes que falham** (com um `FakeLLM` igual ao de `test_analyze.py`):
  - JSON válido com 6 critérios e evidências presentes na legenda → 6 notas inteiras;
  - evidência inventada → aquele critério fica `None` e os outros mantêm a nota;
  - `"nota": 5` → `None`;
  - perfil sem texto → `FakeLLM.calls == []`;
  - o prompt contém `"JSON"`, `"literal"` e o texto de `cliente_de_alma` do cartão;
  - `pontuar` com A = [3, 3, None, 1] (pesos 3, 3, 2, 1) dá `camada_a == round((9 + 9 + 1) / (9 + 9 + 3) * 100, 1)`;
  - bio com "Últimas vagas" → `penalidade_etica == 5`.
- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** Extrair o JSON como em `analyze.py` (`texto.index("{")` até `rindex("}")`); `max_tokens = 1200`.
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat: camada B de neuromarketing com citação obrigatória e pontuação`

### Task 8: Orquestrador `auditar`, relatório, dry-run e workflow

**Files:**
- Create: `inteligencia-concorrentes/scripts/auditar.py`
- Modify: `inteligencia-concorrentes/scripts/dry_run_fakes.py` (adicionar fakes de perfil e de avaliador B)
- Modify: `inteligencia-concorrentes/config/territorios.json` (acrescentar `"clientes": []` e `"max_posts_auditoria": 24`; **não** colocar em `REQUIRED`)
- Modify: `.github/workflows/semanal.yml`
- Modify: `inteligencia-concorrentes/README.md` (seção "Auditoria de perfil (fases 0 e 1)")
- Test: `inteligencia-concorrentes/tests/test_auditar.py`, `tests/test_workflow.py`

**Interfaces:**
- Consumes: Tasks 1, 3, 4, 5 e 7; `load_json`/`save_json` de `storage.py`; `concorrentes.json` na branch de dados.
- Produces:
  - Config: cada cliente é `{"id": str, "handle": str, "cartao": "config/clientes/<id>/cartao.json", "proprio": bool}`. Com `proprio: true`, usa a coleta autenticada (o token é do próprio cliente).
  - `auditar_perfil(perfil: dict, cartao: dict, palavras_chave: list[str], now: datetime, avaliador_b) -> dict`, que devolve `{"handle", "auditado_em", "metricas": dict, "metricas_autenticadas": dict | None, "notas": list[dict], "pontuacao": dict}`. Aqui `avaliador_b(perfil, cartao) -> list[dict]`.
  - `run_auditoria(config: dict, data_dir: Path, now: datetime, coletar_publico, coletar_autenticado, avaliador_b, base_config: Path) -> tuple[Path | None, list[str]]`. Para cada cliente: carrega o cartão (`CartaoInvalido` vira uma falha e o cliente é pulado), audita o cliente e cada concorrente de `concorrentes.json` com `plataforma == "instagram"` e `status == "aprovado"`, grava o JSON e o Markdown nos caminhos de Global Constraints e devolve o caminho do Markdown e a lista de falhas. Erros de coleta seguem o mesmo padrão de `run_weekly.run`: `SemAcesso` e `GraphError` viram falha e o processo continua; `TokenExpirado` encerra o Instagram com a falha `"renovar token Meta (Instagram)"`.
  - `build_auditoria_md(cliente_id: str, resultados: list[dict], falhas: list[str], now: datetime) -> str`:
    - tabela por perfil com `camada_a`, `camada_b`, `total` e `penalidade_etica`, com o cliente primeiro e os concorrentes ordenados por `total`;
    - para cada critério, nota e evidência;
    - alertas;
    - métricas autenticadas cruas com a definição;
    - a linha final exata de Global Constraints.
  - `main(argv) -> int`, com `--data-dir` e `--dry-run` (mesmo padrão de `run_weekly.main`). Grava `issue.md` com `build_issue_body`.
- Workflow: acrescentar `auditar` às `options` de `modo`; no passo "Executar", `elif [ "$MODO" = "auditar" ]` roda `python inteligencia-concorrentes/scripts/auditar.py --data-dir dados`; no passo da Issue, o título passa a ser `Auditoria de perfil — $(date -u +%F)` quando `MODO == auditar`.

- [ ] **Step 1: Testes que falham** (`tmp_path`, coletores e avaliador falsos):
  - um cliente com cartão válido e 2 concorrentes aprovados (1 instagram e 1 youtube) → o JSON tem 2 perfis (o YouTube fica de fora nesta fase) e o Markdown existe e termina com a linha de aviso de IA;
  - cartão `aprovado: false` → nada é gravado para esse cliente e a falha contém `"não aprovado"`;
  - concorrente que levanta `SemAcesso` → aparece em falhas e o cliente ainda é auditado;
  - perfil com `media` vazia → a auditoria sai e `pontuacao["camada_b"] is None`;
  - `main(["--data-dir", str(tmp_path), "--dry-run"])` devolve 0 e cria `issue.md`;
  - em `test_workflow.py`: `"auditar"` está nas options e o passo Executar menciona `auditar.py`.
- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar** o orquestrador, os fakes de dry-run, a config, o workflow e a seção do README. O README traz o roteiro da Fase 0:
  1. rodar `python scripts/verificar_campos.py --handle <cliente>` com o token real e anotar os campos que deram AUSENTE;
  2. copiar `config/clientes/exemplo/` para `config/clientes/<id>/` e preencher o cartão a partir do Briefing de Transição;
  3. o cliente revisa e marca `aprovado: true`;
  4. acrescentar o cliente em `clientes`;
  5. rodar Actions → modo `auditar`.
- [ ] **Step 4: Rodar** a suíte inteira com `python -m pytest -q`, depois `python scripts/auditar.py --dry-run --data-dir /tmp/aud-teste`. Esperado: tudo PASS, e um Markdown legível em `/tmp/aud-teste/relatorios/auditorias/`.
- [ ] **Step 5: Commit** `feat: modo auditar com relatório, dry-run e workflow`

### Task 9: Calibração com notas humanas

**Files:**
- Create: `inteligencia-concorrentes/scripts/calibrar.py`
- Test: `inteligencia-concorrentes/tests/test_calibrar.py`

**Interfaces:**
- Consumes: os JSONs de `data/auditorias/` (Task 8).
- Produces:
  - `exportar_planilha(auditorias: list[dict], destino: Path) -> int`. Grava um CSV com as colunas `handle,criterio,nota_llm,evidencia,nota_humana` (`nota_humana` vazia) e devolve o número de linhas.
  - `comparar(csv_preenchido: Path) -> dict[str, dict]`. Para cada critério, devolve `{"n", "erro_medio_abs", "concordancia_exata", "confiavel"}`. Linhas com `nota_llm` ou `nota_humana` vazias são ignoradas. `confiavel = n >= 10 and erro_medio_abs <= 0.5`.
  - `main(argv)`, com os subcomandos `exportar --data-dir D --saida F` e `comparar --csv F`. O `comparar` imprime uma tabela em Markdown.
- O README ganha uma linha: "Fase 1 só termina quando todos os critérios estiverem `confiavel` em ≥ 30 perfis; critério não confiável sai da pontuação até o prompt ser ajustado."

- [ ] **Step 1: Testes que falham.**
  - Exportar 2 auditorias com 10 notas cada gera 20 linhas.
  - CSV com 10 linhas de `concretude` e diferenças `[0,0,1,0,0,0,1,0,0,0]` dá `erro_medio_abs == 0.2`, `concordancia_exata == 0.8` e `confiavel is True`.
  - 9 linhas dão `confiavel is False`.
  - Uma linha com `nota_humana` vazia é ignorada.
- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar** com `csv` da stdlib.
- [ ] **Step 4: Rodar a suíte inteira.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat: calibração das notas da LLM contra notas humanas`

---

## Fora deste plano (fase 2+)

`comentarios.py` (mineração e camada C com cobertura de frases e embeddings), pysentimiento, notas para YouTube e TikTok, transcrição, wrapper FastMCP e Metricool. A Task 3 já prevê `voz_do_cliente`, para a fase 2 não mudar o esquema.
