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
4. **Ranquear:** score por post, ranking separado por plataforma.
5. **Analisar:** o Claude classifica apenas o top 10 da semana, nunca repetindo um post já analisado.
6. **Relatar:** relatório em Markdown e Issue de resumo com notificação.

## 4. Estrutura do repositório

```
inteligencia-concorrentes/
  config/territorios.json      # território A, palavras-chave, limiares
  data/concorrentes.json       # lista com status
  data/posts/AAAA-MM.json      # posts e métricas
  relatorios/AAAA-MM-DD.md     # relatório semanal
  scripts/                     # descobrir, coletar, ranquear, analisar, relatar
  .github/workflows/semanal.yml
```

Chaves (YouTube, Meta, Claude) ficam somente em GitHub Secrets.

## 5. Modelo de dados

**Concorrente:** `id`, `nome`, `plataforma`, `handle` ou `channel_id`, `pais`, `idioma`, `seguidores`, `territorio`, `status` (candidato | aprovado | descartado | sem_acesso), `motivo`, `descoberto_em`.

**Post:** `id`, `concorrente_id`, `plataforma`, `url`, `formato` (reel | carrossel | short | video), `publicado_em`, `titulo_ou_legenda`, `views` (somente YouTube), `curtidas`, `comentarios`, `score`, `coletado_em`. Mantém a coleta atual e a anterior; sem histórico completo.

**Análise (top 10):** `post_id`, `gancho`, `tema`, `promessa`, `por_que_funcionou`, `adaptacao_galifrael`.

Concorrentes e posts ficam separados para que aprovar ou descartar um perfil não altere posts já coletados.

## 6. Ranking e análise

- `score = (curtidas + 2 × comentarios) / seguidores`.
- YouTube tem também `views / seguidores`.
- Rankings separados por plataforma; métricas não são comparáveis entre elas.
- Janela: últimos 90 dias. Posts com menos de 48 horas são excluídos.
- Selo "validado": YouTube com 1 milhão de views ou mais; Instagram com piso de curtidas definido em `config` (sugestão inicial: 50 mil).
- Análise do Claude: JSON de saída fixo; sem transcrição na fase 1, o gancho vem do título ou da legenda.
- Relatório: para cada um dos 5 melhores concorrentes, os 3 posts de topo; padrões da semana (ganchos e formatos recorrentes); uma sugestão de conteúdo por padrão, ligada à tese do Galifrael.

## 7. Agendamento e erros

- GitHub Actions toda segunda cedo, mais disparo manual.
- Dados em branch separada `dados-concorrentes`; nunca force push.
- Ao final, o workflow abre uma Issue com o resumo.
- Falha em uma fonte não interrompe as demais; aparece no topo da Issue.
- YouTube: na coleta semanal, usar playlist de uploads (1 unidade) em vez de busca (100 unidades); cota diária de 10.000 unidades.
- Descoberta de candidatos: ocorre sob demanda (disparo manual), não semanalmente, usando busca na web e busca do YouTube (100 unidades por chamada, com número limitado de chamadas por execução).
- Token da Meta expira (cerca de 60 dias): a Issue avisa para renovar.
- Perfil sem acesso (não profissional ou privado): marcado `sem_acesso` para decisão do Elvis.

## 8. Testes e segurança

- Desenvolvimento orientado a testes: score, ranking e selo "validado" testados com dados de exemplo, sem chamar APIs.
- Modo `dry-run` roda o fluxo inteiro com dados falsos antes de qualquer chave real.
- Apenas dados públicos; chaves só em GitHub Secrets.

## 9. Limites conhecidos

- A Business Discovery do Instagram não entrega views de Reels e só enxerga contas profissionais ou de criador.
- A disponibilidade e as regras da API da Meta devem ser confirmadas na implementação.
- Custo variável apenas na classificação pelo Claude, limitado ao top 10 semanal.

## 10. Fora do escopo (fase 1)

TikTok, transcrição de vídeos, banco Supabase, os territórios B a E, histórico completo de métricas.
