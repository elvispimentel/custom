# Tutor de Idiomas

App pessoal de conversa por voz em **inglês** e **espanhol** (contextos: Argentina, Bolívia, Paraguai e Uruguai), em formato PWA para Vercel. Você fala, o tutor responde em áudio, corrige um ou dois pontos por vez e lembra das suas dificuldades na sessão seguinte. Lembretes push três vezes ao dia.

## Como funciona

| Parte | Escolha | Por quê |
|---|---|---|
| App | Next.js 16 (App Router) + TypeScript | Roda na Vercel sem configuração extra |
| Ouvir você | OpenAI `gpt-4o-mini-transcribe` | US$ 0,003/min; aceita o áudio do Safari (mp4) e do Chrome (webm); não depende do reconhecimento do navegador |
| Tutor | OpenAI `gpt-4.1-mini`, com saída estruturada | Rápido e barato; responde, traduz e corrige em JSON |
| Voz do tutor | OpenAI `gpt-4o-mini-tts` | Uma única chave de API; “mais devagar” reaproveita o mesmo áudio (sem custo) |
| Dados | Supabase (Postgres), tabelas `tutor_*` | Persistente; RLS ligado sem políticas, então só o servidor acessa |
| Lembretes | 24 crons diários da Vercel (um por hora UTC) + Web Push (VAPID) | Funciona no plano Hobby, que só permite crons diários |
| Acesso | Senha única + cookie assinado (HMAC), 60 dias | Uso pessoal, sem cadastro |

Os modelos podem ser trocados pelas variáveis `OPENAI_CHAT_MODEL`, `OPENAI_STT_MODEL`, `OPENAI_TTS_MODEL` e `OPENAI_TTS_VOICE`.

**O que fica guardado:** preferências, texto das conversas, resumos, tempo praticado, dificuldades e vocabulário por idioma, horários e inscrições de push. **Gravações de áudio não são guardadas**: o áudio vai direto para a transcrição e é descartado.

**Proteções de custo:** limites diários de áudio (60 min), voz do tutor (60 mil caracteres) e chamadas de IA (400). Cada áudio pode ter até 2 min e 4 MB. Login com bloqueio após 8 tentativas erradas. Todos os endpoints exigem login, exceto o cron, que usa `CRON_SECRET`.

## Publicar (primeira vez)

1. **Supabase:** crie um projeto (ex.: `tutor-idiomas`, região `us-east-1`). No *SQL Editor*, rode `supabase/migrations/001_tutor.sql`. Em *Project Settings › API*, copie a URL e a chave `service_role`.
2. **OpenAI:** em platform.openai.com crie uma API key. Em *Limits*, defina um orçamento mensal (ex.: US$ 20).
3. **Vercel:** *Add New › Project* › importe o repositório. Se o app estiver numa subpasta, defina *Root Directory* = `tutor-idiomas`. Em *Environment Variables*, cadastre:
   - `APP_PASSWORD`: sua senha de acesso (longa)
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`: texto aleatório longo (ex.: gere com `openssl rand -hex 32`)
4. Faça o deploy. As chaves VAPID do push são geradas sozinhas no primeiro uso e guardadas no banco.

## Instalar no celular e ativar lembretes

- **iPhone (iOS 16.4+):** abra o link no **Safari** › Compartilhar › **Adicionar à Tela de Início**. Abra pelo ícone › *Lembretes e ajustes* › **Ativar lembretes neste aparelho** › Permitir. Sem instalar na Tela de Início, o iPhone não entrega push.
- **Android:** Chrome › menu ⋮ › **Instalar app** › *Lembretes e ajustes* › Ativar.
- **Computador:** Chrome/Edge/Firefox › *Lembretes e ajustes* › Ativar.
- Use **Enviar teste** para confirmar.

**Precisão dos horários:** no plano Hobby da Vercel, cada cron roda em algum momento dentro da hora agendada. Por isso os horários são em horas cheias, e o aviso chega entre a hora escolhida e cerca de 1 hora depois. A tabela `tutor_reminder_log` garante no máximo um aviso por horário por dia. Se você já praticou aquele idioma nos últimos 90 min, o aviso é pulado. O fuso padrão é `America/Sao_Paulo` e pode ser trocado nos ajustes (útil em viagem).

## Custo estimado

Premissas: 45 min de sessão por dia (3 × 15). Você fala ~35% do tempo (~16 min de áudio processado), o tutor fala ~35% (~16 min de voz gerada) e são ~70 trocas por dia com ~3,5 mil tokens de contexto cada. Preços conferidos em out/2026.

| Item | Por dia | Por mês (30 dias) |
|---|---|---|
| Transcrição (16 min × US$ 0,003) | US$ 0,05 | US$ 1,50 |
| Voz do tutor (~16 min × ~US$ 0,015) | US$ 0,24 | US$ 7,20 |
| Tutor de texto (gpt-4.1-mini) + resumos | US$ 0,13 | US$ 4,00 |
| Vercel Hobby e Supabase Free | US$ 0 | US$ 0 |
| **Total estimado** | **~US$ 0,42** | **~US$ 13** (faixa provável: US$ 8–18) |

“Repetir” e “Mais devagar” reaproveitam o áudio já gerado e não custam nada. Com os limites diários padrão, o teto teórico fica em torno de US$ 1,70/dia. Acompanhe o consumo em platform.openai.com › *Usage*. A tabela `tutor_usage` também registra o uso diário.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha
npm run dev
```

```bash
npm test && npm run typecheck && npm run build
```
