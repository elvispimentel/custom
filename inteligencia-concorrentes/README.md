# Inteligência de Concorrentes — Instituto Galifrael

Agente semanal que coleta os posts de maior engajamento de concorrentes aprovados
(YouTube + Instagram), ranqueia, analisa o top com um modelo da OpenAI e abre uma Issue com o
relatório 5-3 (5 concorrentes, 3 conteúdos de cada).

Spec: `docs/superpowers/specs/2026-10-05-inteligencia-concorrentes-design.md`

## Onde ficam as coisas

- **Código:** branch principal, pasta `inteligencia-concorrentes/` e `.github/workflows/semanal.yml`.
- **Dados e relatórios:** branch `dados-concorrentes` (criada sozinha na primeira execução).
  - `data/concorrentes.json`, `data/posts/AAAA-MM.json`, `data/analises.json`, `relatorios/AAAA-MM-DD.md`.

## Configurar (uma vez)

No GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Para quê | Obrigatório |
|---|---|---|
| `YOUTUBE_API_KEY` | YouTube Data API v3 (grátis, 10.000 unidades/dia) | sim |
| `OPENAI_API_KEY` | Análise do top semanal (único custo variável; precisa de créditos da API em platform.openai.com) | sim |
| `META_ACCESS_TOKEN` | Token da Meta com acesso à Business Discovery | só para Instagram |
| `IG_USER_ID` | ID da sua conta profissional do Instagram | só para Instagram |

Sem os dois secrets da Meta, a coleta roda só no YouTube e a Issue avisa "Instagram não configurado".

## Usar

1. **Descobrir candidatos (sob demanda):** Actions → *Concorrentes semanal* → Run workflow → modo `descobrir`.
   O agente busca no YouTube os **vídeos mais vistos** para cada palavra de `palavras_chave` (autores, obras e temas,
   em `config/territorios.json`) e lista os **canais** desses vídeos. O que conta é a visualização do melhor vídeo
   (`min_views_video`, hoje 100 mil), **não** o número de inscritos; cada candidato mostra esse vídeo como prova.
   Canais que aparecem em mais palavras vêm primeiro.
   Cada busca custa 100 unidades da cota diária (10.000); o limite por execução é `max_buscas_youtube`.
   Para buscar outro autor ou obra, acrescente a palavra em `palavras_chave` (e aumente `max_buscas_youtube` se passar de 20).
   Se já houver candidatos antigos que você não quer, deixe `data/concorrentes.json` como `[]` antes de rodar de novo.
2. **Aprovar:** na branch `dados-concorrentes`, edite `data/concorrentes.json` pelo GitHub e mude
   `"status": "candidato"` para `"aprovado"` (ou `"descartado"`). Só `aprovado` é coletado.
   Concorrentes do Instagram: adicione manualmente com `plataforma: "instagram"`, `handle` e `status`.
3. **Coletar:** para cada canal aprovado, o agente pega os vídeos recentes **e** os mais vistos do canal (100 unidades de cota por canal), e ranqueia por **visualizações e comentários** de todo o histórico (inscritos não entram na conta). Roda sozinho toda segunda (06h em Brasília), ou manualmente com modo `coletar`.
   O resultado chega como uma Issue.

## Renovar o token da Meta

Quando a Issue mostrar "renovar token Meta", gere um novo token de longa duração (dura ~60 dias)
e atualize o secret `META_ACCESS_TOKEN`.

## Rodar localmente (sem rede, sem chaves)

```
cd inteligencia-concorrentes
pip install -r requirements.txt
python -m pytest -q
python scripts/run_weekly.py --dry-run --data-dir /tmp/dados-teste
```

## Limites conhecidos

- A Business Discovery do Instagram **não entrega views** de Reels e só enxerga contas profissionais/criador.
- **A integração com a Meta não foi verificada contra a API real**: nomes de campos, versão da API
  (`GRAPH` em `scripts/instagram.py`) e códigos de erro vieram de conhecimento prévio. Confirme na primeira
  execução com o token real.
- Sem transcrição: o gancho vem do título/legenda (o modelo usado fica em `modelo_analise`, em `config/territorios.json`; fase 2: transcrição e adaptação ao seu acervo do Drive).
