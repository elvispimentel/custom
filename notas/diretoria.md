# Diretoria: onde estamos (atualizado em 2026-10-15)

## Objetivo inicial (12/10)
Achar ou criar algo que acompanhe as mudanças do algoritmo do Instagram, do TikTok e do YouTube,
para as ferramentas do Project OS criarem conteúdo alinhado ao algoritmo, para todos os clientes.

## Pronto
- **Radar do Algoritmo** (Instagram, TikTok e YouTube): lê 20 páginas oficiais toda segunda e propõe
  regras novas por PR para o Elvis aprovar. Já está na `main` (PR #35).
- **Calendário e legendas nas 3 redes** (v0.9.0), com título e descrição para o YouTube. Também na `main`.
- **Notas de ideias**: `notas/ideias-de-conteudo.md`.

## Travado (resolver primeiro)
1. **Migração do banco não aplicada.** O calendário está fora do ar em produção desde 12/10.
   Para destravar: colar o SQL no SQL Editor do Supabase, projeto "RPG - OJC".
2. Radar nunca rodou no GitHub: falta ligar "Allow GitHub Actions to create PRs", cadastrar o secret
   `OPENAI_API_KEY` e rodar uma vez à mão.
3. Supermetrics desconectado (para ler os dados do Instagram do Elvis).

## Ideias que surgiram (nenhuma iniciada)
- **Jornada em 6 passos no Project OS:**
  1. Voz Única
  2. Cliente de Alma
  3. Base da comunicação (já existe)
  4. Diagnóstico de Perfil por objetivo
  5. Radar e Referências 5-3
  6. Calendário, legenda e roteiro
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
