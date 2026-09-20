# Plano de Evolução — Autorretrato do Jogador + Primeira Estrutura Administrativa

**Status:** proposta aguardando aprovação. Nenhuma alteração de código foi feita.
**Regra aplicada:** não reconstruir o app; preservar cálculos, motor, identidade visual, responsividade, PDF, tema e persistência.

---

## A. Resumo do entendimento

O app hoje é **uma experiência sem memória e sem dono**. Ele calcula um autorretrato correto, bonito e defensável — e depois esquece que a pessoa existiu. Você quer três coisas, nessa ordem de dependência:

1. **Narrativa contínua**, terminando em pergunta e não em conclusão. O Autorretrato é etapa de *reconhecimento*, não de definição. Ele entrega o mapa e abre a lacuna — "e agora?" — que a Etapa 7 (Instruções Iniciais, ~12 min) desenvolve, e que só a imersão paga **Entre o Mapa e a Jogada** (~3h) resolve.
2. **Acessibilidade da data de nascimento** — dia digitável, mês em select, ano digitável. Fim do calendário nativo.
3. **Backend + /admin** — player_id único, eventos, UTM, funil, CRM.

Vocabulário travado por esta atualização:
- "Entre o Mapa e a Jogada" = **só** a imersão paga de ~3h. Nunca a aula de 12 min.
- Aula de ~12 min = **Etapa 7 — Instruções Iniciais**.
- "Antessala" = conceito interno de arquitetura. Nunca aparece na interface.
- "Inventário do Jogador" = não revelado nesta fase.

---

## B. Partes do código que serão alteradas

**Arquivos que NÃO serão tocados** (garantia de zero regressão de cálculo):
- `motor.browser.js` (929 linhas) — todo o motor de oráculos
- `engine/` — fonte do motor, tabelas, testes
- `cidades.json` — 5.570 municípios + fusos IANA
- `astronomy-engine` — efemérides

**`app4.js`** (390 linhas) — cirurgias pontuais:
| Onde | O quê |
|---|---|
| `T1()` | troca `<input type="date">` por Dia / Mês / Ano |
| novo `validarData()` | valida, impede data inexistente e futura, normaliza para `YYYY-MM-DD` |
| `T6()` parte 1 | nova transição final (item 6) + Pista de Contribuição (item 4) |
| `T6()` parte 2 | campo opcional de reflexão (item 8) |
| `T7()` | reescrita completa como Instruções Iniciais |
| `ETAPAS[]` | rótulo da etapa 7 |
| boot | captura de UTM, geração de `player_id`, `session_id` |
| novo `trackEvent()` | fila local + envio |
| `S` | ganha `playerId`, `reflexao`, `utm`, `fila` |

**`narrativa.js`** (175 linhas) — auditoria de hedge (item 5): revisar `TIPO`, `SIGNO_SOL`, `CASA_TEMA`, texto do arcano e `fecho()`. Trocar afirmação absoluta por hipótese verificável.

**`page2.tpl.html`** — CSS novo: linha de data em 3 campos, `.pista`, `.card-etapa7`, `textarea`. Nada existente é removido.

**Arquivos novos:** `admin.html`, `admin.js`, `supabase/schema-v2.sql`, `supabase/functions/registrar-evento/`.

---

## C. Arquitetura proposta

**Princípio: a fila local desacopla frontend de backend.**

```
Jogador → app (localStorage)
             │
             ├─ trackEvent() grava na fila local SEMPRE
             │
             └─ tenta enviar ao Supabase
                  ├─ sucesso → limpa da fila
                  └─ falha  → fica na fila, tenta de novo depois
```

Consequência prática: **a Fase 1 vai ao ar sem backend nenhum**. Os eventos ficam guardados no navegador e sobem quando o backend existir. Nada se perde, nada trava, e você não precisa esperar infraestrutura para publicar a narrativa nova.

**Identidade:** `player_id` = UUID gerado no primeiro carregamento, guardado em localStorage, imutável. `session_id` = novo a cada abertura. Nome nunca é identificador.

**Atribuição:** UTMs lidas da URL no primeiro carregamento → `first_touch` (nunca sobrescrito) e `last_touch` (atualizado). Sobrevivem a todas as etapas porque vivem no localStorage, não na URL.

---

## D. Banco / persistência disponível

**Hoje:** `localStorage['antessala3']` — só isso. Zero servidor.

**Já escrito e não implantado** (`out/supabase/`): `schema.sql` com `jogadores`, `oraculos`, `inventarios`, `funnel_events`, `config_oraculos`, função `buscar_municipio()` e RLS; `seed_municipios.sql` com os 5.570 municípios; Edge Function `ingestao-de-alma`. Foi desenhado antes desta especificação — cobre talvez 60% do que o item 10 pede.

**Proposta:** Supabase. Sem custo no plano free até volume relevante, Postgres real, RLS, Auth e Edge Functions no mesmo lugar. Extensão necessária ao schema existente:

- `players` — `player_id` uuid PK, nome, email, whatsapp, `data_nascimento`, cidade, `current_stage`, `reflection_selected`, `source`, 5 campos UTM, `first_touch_source`, `last_touch_source`, `consentimentos` jsonb, `created_at`, `updated_at`
- `events` — `event_id`, `player_id` FK, `event_name`, `timestamp`, `session_id`, `screen`, utm jsonb, `metadata` jsonb
- `admin_users` — quem pode ler o CRM
- `admin_notes` — notas administrativas por jogador
- views: `v_funil`, `v_dashboard_diario`

**RLS:** o público tem permissão de **inserir e atualizar apenas a própria linha** (`player_id` do cabeçalho). Leitura pública: **negada**. Leitura completa: só quem estiver em `admin_users`. A chave anon no HTML é pública por design — a segurança é a policy, não o segredo.

---

## E. Autenticação do /admin

**Supabase Auth com e-mail + senha, e-mail restrito a uma allowlist na tabela `admin_users`.**

- Senha nunca no HTML/JS. O que fica no arquivo é a chave anon, que é pública por natureza e não dá acesso a nada sem policy.
- Toda leitura do CRM passa por policy `exists (select 1 from admin_users where id = auth.uid())`.
- Sem sessão válida, o `/admin` renderiza só o formulário de login — não existe rota "escondida".
- MFA fica disponível para ligar depois, sem retrabalho.

Alternativa descartada: senha comparada em JavaScript. Isso é decoração, não segurança — qualquer pessoa lê o arquivo.

---

## F. Riscos de regressão

| Risco | Gravidade | Contenção |
|---|---|---|
| Entrada de data quebrar o cálculo | **Alta** | Normalizar para `YYYY-MM-DD` antes de qualquer coisa. `calcular()` e `fusoTexto()` fazem `S.data.split('-')` — se o formato for idêntico, o motor não percebe diferença. Teste automatizado com 12 datas conhecidas antes e depois. |
| Etapa 6 voltar a ficar cansativa | **Alta** | O item 4 (Pista) e o item 6 (transição) somam ~450 palavras novas no mesmo lugar de onde acabamos de tirar peso. **Proposta: fundir os dois num movimento de fechamento único**, em vez de empilhar dois blocos. Precisa da sua decisão. |
| Duplicação de conteúdo na Etapa 7 | Média | O bloco atual "Enquanto ela não vem" já pede a frase que mais bateu. Ele é substituído pelo card novo, não somado. |
| `render()` reconstrói o DOM inteiro | Média | O `<textarea>` da reflexão perde foco a cada render. Solução: salvar no `blur`, não no `input`. |
| Auditoria de hedge diluir o tom | Média | Hedge demais vira covardia e mata o tom hipnótico. Critério: hedge onde o sistema **interpreta**; afirmação onde o motor **calcula**. Posição de planeta é fato. Significado é hipótese. |
| Duas fontes de verdade (local + banco) | Média | O localStorage é a fonte para a experiência; o banco é histórico. Nunca o inverso. O app nunca lê o banco para renderizar. |
| Perda do estado de quem já começou | Baixa | Chave `antessala3` preservada; migração silenciosa acrescenta os campos novos. |
| PDF/tema/mobile | Baixa | Verificação com Playwright nos dois temas + 430px + print, como já é feito. |

---

## G. Limitações da infraestrutura atual

1. **HTML estático.** Um arquivo, sem servidor, sem rota. `/admin` será um segundo arquivo — não existe roteamento real.
2. **O envio por e-mail é simulação.** Hoje o botão escreve na tela que enviou; nada sai. Para a etapa 7 prometer "você recebe no e-mail", isso precisa virar real (Resend via Edge Function). **É o maior débito aberto do produto.**
3. **Nada é persistido fora do navegador.** Quem limpa o cache perde tudo, e você não tem um único registro de quem passou por lá.
4. **Sem servidor não há segredo.** Toda chave no arquivo é pública. A defesa é RLS.
5. **O arquivo tem 430 KB.** Ainda aceitável; crescimento pede separar o motor em arquivo próprio com cache.
6. **Sem analytics hoje.** Nenhum evento existe. O funil descrito no item 13 é 100% novo.
7. **A hospedagem** precisa aceitar um segundo arquivo em `/admin`. Se não aceitar, o admin vai para subdomínio ou para um app Lovable separado.

---

## H. Plano de implementação por etapas

### Fase 1 — Frontend puro *(sem backend, publicável no mesmo dia)*
1. Entrada de data Dia/Mês/Ano + validação + normalização
2. Auditoria de hedge na narrativa
3. Nova transição final da etapa 6 (fundida com a Pista de Contribuição)
4. Etapa 7 reconstruída como Instruções Iniciais
5. Campo opcional de reflexão
6. `player_id`, `session_id`, captura de UTM
7. `trackEvent()` gravando em fila local
8. Verificação: 12 datas, dois temas, mobile, PDF

**Entrega:** HTML pronto para o site. Nada depende de infraestrutura.

### Fase 2 — Backend
1. Projeto Supabase + `schema-v2.sql` + RLS
2. Edge Function `registrar-evento`
3. Descarga da fila local
4. E-mail real (Resend) — fecha o débito do item G2

### Fase 3 — Admin
1. `admin.html` com Supabase Auth + allowlist
2. Dashboard (filtros hoje / 7 / 30 / personalizado)
3. CRM com busca e filtros
4. Funil com os estágios atuais + os futuros já previstos
5. Perfil individual com linha do tempo e notas

### Fase 4 — LGPD e futuro
1. Exportação e exclusão por por jogador
2. Registro de consentimentos versionado
3. Eventos futuros já mapeados, sem implementar

---

## Decisões que dependem de você

1. **Fundir Pista de Contribuição + transição final** num movimento só, ou manter como dois blocos separados?
2. **Criar projeto Supabase novo**, ou aproveitar um que já exista em algum projeto Lovable seu?
3. **Onde mora o /admin** — mesmo domínio, subdomínio, ou app separado?
4. **Nomenclatura:** "Instruções Iniciais" e "Entre o Mapa e a Jogada" são vocabulário novo. Pela sua própria regra de governança, entram primeiro como linha na Matriz de Decisões, depois no módulo de conteúdo, depois no changelog. Confirma que abro essa linha?
