# Diretoria: onde estamos (atualizado em 2026-10-15)

## Objetivo inicial (12/10)
Achar ou criar algo que acompanhe as mudanças do algoritmo do Instagram, do TikTok e do YouTube,
para as ferramentas do Project OS criarem conteúdo alinhado ao algoritmo, para todos os clientes.

## Pronto
- **Radar do Algoritmo** (Instagram, TikTok e YouTube): lê 20 páginas oficiais toda segunda e propõe
  regras novas por PR para o Elvis aprovar. Já está na `main` (PR #35).
- **Calendário e legendas nas 3 redes** (v0.9.0), com título e descrição para o YouTube. Também na `main`.
- **Notas de ideias**: `notas/ideias-de-conteudo.md`.
- **Jornada de Conteúdo** (v0.12.0, PR #41): Idioma da Marca → Cliente Alinhado → Diagnóstico de Perfil → Planejamento,
  com abas Instagram, TikTok e YouTube; na central de soluções e no projeto. Fala do Idioma funcionando;
  Raiz e Diagnóstico em preparação. Calendário e legendas usam os 3 estilos de vídeo de utilidade
  (contraste, tutorial prático, erro e correção) e a comunicação que não chama o público pela fraqueza.

## Travado (resolver primeiro)
0. **Sem crédito na OpenAI** (15/10): toda IA do Project OS para (Idioma, calendário, legendas, radar). Recarregar antes de testar.
1. ~~Migração do banco~~ **resolvido em 15/10**: conferido no Supabase, colunas, índice e regras estão no lugar.
2. Radar nunca rodou no GitHub: falta ligar "Allow GitHub Actions to create PRs", cadastrar o secret
   `OPENAI_API_KEY` e rodar uma vez à mão.
3. Supermetrics desconectado (para ler os dados do Instagram do Elvis).

## Ideias que surgiram (nenhuma iniciada)
- **Próximas peças da Jornada:** Raiz do Idioma (entrevista paga, liberação manual; precisa de migration),
  Diagnóstico de Perfil por rede, Agente 5-3.
- **Agente 5-3:** 5 concorrentes × 3 conteúdos, por rede, para abastecer o Método dos 300.
- **"O que prende o cliente de alma":** teste de 30 dias com 5 assuntos-hipótese.
- **Roteiro de vídeo** (fase C): desenho pronto, esperando o "sim" do Elvis.
- **Forja de carrosséis:** PR #28, falta teste real.

## Decisões pendentes do Elvis
- A Voz Única manda no tom (e não as promessas do Mapa do Desenho Humano)?
- Formatos por rede estão bons? (TikTok: vídeo, carrossel de fotos, live. YouTube: vídeo longo, Shorts, live.)
- Qual ideia vem depois do destravamento?

## Regra para não se perder
Uma frente por vez: **destravar → testar → só então a próxima ideia.**

## Próximo passo (16/10)
Recarregar a OpenAI → Jornada de Conteúdo → Idioma da Marca → enviar o dossiê Voz Única (.md) → "Escutar meu idioma" → ver se soa como você.

## Radar no Project OS (30/10)
- Entrega 1 pronta: PR #84 (v0.34.0). Falta Elvis colar a migration e o seed no Supabase, mesclar e aprovar os itens em /admin/radar.
- Entregas 2 (robô entrega no painel, sai do GitHub) e 3 (pesquisa semanal da prática + Mosseri) depois.
