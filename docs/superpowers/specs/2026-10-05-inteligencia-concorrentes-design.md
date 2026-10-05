# Inteligência de Concorrentes — Instituto Galifrael (Design)

Data: 2026-10-05
Status: aguardando revisão do Elvis

## 1. Objetivo

Agente que mantém, de forma contínua, um banco de concorrentes do Instituto Galifrael (Brasil e exterior) e identifica os posts de maior engajamento deles. O resultado alimenta a produção de conteúdo pelo método 5-3: 5 concorrentes, 3 conteúdos validados de cada, preferindo conteúdos acima de 1 milhão de views.

## 2. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Plataformas | Instagram + YouTube Shorts |
| Descoberta | O agente descobre os concorrentes do zero; Elvis aprova a lista antes de qualquer coleta |
| Território inicial | A: comportamento e identidade (condicionamento, crenças, padrões, autossabotagem, identidade) |
| Abordagem | Tudo no GitHub (GitHub Actions + arquivos no repositório), custo próximo de zero |
| Migração futura | Modelo de dados plano, migrável para Supabase sem retrabalho |

Territórios futuros (fora do escopo desta fase): hipnose/influência/vendas; aprendizagem e hábito; jogos e jornada; investigação da realidade.

## 3. Fluxo

1. **Descobrir:** o agente busca candidatos do território A (Brasil e exterior) e grava com status `candidato`.
2. **Aprovar:** Elvis revisa e muda para `aprovado` ou `descartado`. Só `aprovado` é coletado.
3. **Coletar:** semanalmente. YouTube pela API oficial; Instagram pela Business Discovery da Meta.
4. **Ranquear:** score por post a partir de visualizações e comentários (inscritos não entram), ranking separado por plataforma.
5. **Analisar:** o modelo de IA (OpenAI) classifica apenas o top 10 da semana, nunca repetindo um post já analisado.
6. **Relatar:** relatório em Markdown e Issue de resumo com notificação.

## 4. Estrutura do repositório

Branch principal (código):
```
inteligencia-concorrentes/
  config/territorios.json      # território A, palavras-chave, limiares
  scripts/                     # descobrir, coletar, ranquear, analisar, relatar
  tests/
.github/workflows/semanal.yml  # na raiz: o GitHub só lê workflows de lá
```

Branch `dados-concorrentes` (dados, nunca force push):
```
data/concorrentes.json         # lista com status
data/posts/AAAA-MM.json        # posts e métricas
data/analises.json             # análises já feitas
relatorios/AAAA-MM-DD.md       # relatório semanal
```

Chaves (YouTube, Meta, OpenAI) ficam somente em GitHub Secrets.

## 5. Modelo de dados

**Concorrente:** `id`, `nome`, `plataforma`, `handle` ou `channel_id`, `pais`, `idioma`, `seguidores`, `territorio`, `status` (candidato | aprovado | descartado | sem_acesso), `motivo`, `descoberto_em`.

**Post:** `id`, `concorrente_id`, `plataforma`, `url`, `formato` (reel | carrossel | imagem | short | video), `publicado_em`, `titulo_ou_legenda`, `views` (somente YouTube), `curtidas`, `comentarios`, `score`, `coletado_em`. Mantém a coleta atual e a anterior; sem histórico completo.

**Análise (top 10):** `post_id`, `gancho`, `tema`, `promessa`, `por_que_funcionou`, `adaptacao_galifrael`.

Concorrentes e posts ficam separados para que aprovar ou descartar um perfil não altere posts já coletados.

## 6. Ranking e análise

- `score` = média das posições do post entre todos os da plataforma, em **views e comentários** (YouTube) ou **curtidas e comentários** (Instagram, sem views). O tamanho do canal (inscritos) não entra na conta: vale o que foi visto e comentado.
- Rankings separados por plataforma; métricas não são comparáveis entre elas.
- Janela: todo o histórico coletado (`janela_dias`, hoje 3650), porque o objetivo é uma biblioteca de conteúdo validado. Posts com menos de 48 horas são excluídos. A análise pelo modelo de IA só pega posts ainda não analisados, então o top vai descendo a cada semana.
- Selo "validado": YouTube com 1 milhão de views ou mais; Instagram com piso de curtidas definido em `config` (sugestão inicial: 50 mil).
- Análise pelo modelo de IA (OpenAI, `modelo_analise`): top 10 = 5 por plataforma (`analise_por_plataforma`); JSON de saída fixo; sem transcrição na fase 1, o gancho vem do título ou da legenda.
- Relatório: para cada um dos 5 melhores concorrentes, os 3 posts de topo; padrões da semana (ganchos e formatos recorrentes); uma sugestão de conteúdo por padrão, ligada à tese do Galifrael.

## 7. Agendamento e erros

- GitHub Actions toda segunda cedo, mais disparo manual.
- Dados em branch separada `dados-concorrentes`; nunca force push.
- Ao final, o workflow abre uma Issue com o resumo.
- Falha em uma fonte não interrompe as demais; aparece no topo da Issue.
- YouTube: na coleta semanal, cada canal aprovado usa a playlist de uploads (recentes, 1 unidade) **e** uma busca dos vídeos mais vistos do canal (`max_mais_vistos_por_canal`, 100 unidades por canal); `videos.list` em lotes de 50 ids. Cota diária de 10.000 unidades: cabe com folga até cerca de 60 canais aprovados.
- Descoberta de candidatos: ocorre sob demanda (disparo manual). Busca os vídeos mais vistos no YouTube por palavra-chave (autores, obras e temas do Elvis, em `config`) e extrai os canais. O filtro é a visualização do melhor vídeo do canal (`min_views_video`), não o número de inscritos; cada candidato mostra esse vídeo como prova. Ordena por quantas palavras o canal cobre. Cada busca custa 100 unidades; `videos.list` e `channels.list` rodam em lotes de 50 ids.
- Token da Meta expira (cerca de 60 dias): a Issue avisa para renovar.
- Perfil sem acesso (não profissional ou privado): marcado `sem_acesso` para decisão do Elvis.

## 8. Testes e segurança

- Desenvolvimento orientado a testes: score, ranking e selo "validado" testados com dados de exemplo, sem chamar APIs.
- Modo `dry-run` roda o fluxo inteiro com dados falsos antes de qualquer chave real.
- Apenas dados públicos; chaves só em GitHub Secrets.

## 9. Limites conhecidos

- A Business Discovery do Instagram não entrega views de Reels e só enxerga contas profissionais ou de criador.
- A disponibilidade e as regras da API da Meta devem ser confirmadas na implementação.
- Custo variável apenas na classificação pelo modelo de IA, limitado ao top 10 semanal.

## 10. Fora do escopo (fase 1)

TikTok, transcrição de vídeos, banco Supabase, os territórios B a E, histórico completo de métricas.
