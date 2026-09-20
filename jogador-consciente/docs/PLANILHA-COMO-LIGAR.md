# Ligar a planilha do Google ao jogo — 6 minutos

Tudo do lado do servidor já está pronto e rodando. Falta só uma coisa: a **URL da sua planilha**.
Enquanto ela não existir, o sistema guarda tudo numa fila e não perde nada.

---

## Passo 1 — Criar a planilha

1. Abra `sheets.new` e dê um nome: **RPG — Jogadores**.

## Passo 2 — Colar o código

1. Na planilha: **Extensões ▸ Apps Script**.
2. Apague o que estiver lá e cole o conteúdo de **`Codigo.gs`** (arquivo que veio junto).
3. Salve (ícone do disquete).

## Passo 3 — Publicar

1. Botão azul **Implantar ▸ Nova implantação**.
2. Engrenagem ao lado de "Selecione o tipo" → **App da Web**.
3. Preencha:
   - **Executar como:** Eu (seu e-mail)
   - **Quem pode acessar:** **Qualquer pessoa**
4. **Implantar**. O Google vai pedir autorização — autorize (ele avisa "app não verificado"; clique em *Avançado ▸ Acessar*).
5. Copie a **URL do app da Web**. Ela termina em `/exec`.

> "Qualquer pessoa" significa: qualquer um que **saiba a URL** pode enviar dados.
> Ninguém lê a planilha por ali, e a URL é um código longo e aleatório. Se um dia
> vazar, é só criar uma nova implantação — a URL antiga morre.

## Passo 4 — Me mandar a URL

Cole a URL aqui na conversa. Eu gravo no servidor e, no minuto seguinte, os
**11 jogadores que já estão no banco** aparecem na planilha sozinhos.

Se preferir fazer você mesmo: no Supabase, **SQL Editor**, rode

```sql
update public.config_integracao
   set valor = 'COLE_A_URL_AQUI', atualizado_em = now()
 where chave = 'planilha_url';
```

---

## Como funciona por dentro

```
app  ──sincroniza──▶  Supabase (players)
                          │  gatilho
                          ▼
                    planilha_fila
                          │  a cada 1 minuto (pg_cron)
                          ▼
                  função "planilha"  ──POST──▶  Apps Script  ──▶  sua planilha
```

- **Cada jogador é uma linha.** Se ele volta e avança de etapa, a linha dele é
  **atualizada no lugar** — a planilha é um espelho do banco, não um empilhamento.
- **Atraso:** até 1 minuto depois de o app sincronizar. Não é a cada tecla digitada
  — seria um pedido por letra, a planilha do Google não aguenta e o app ficaria lento.
- **Se a planilha cair:** nada é marcado como enviado, a fila segura, e a rodada
  seguinte tenta de novo. Cinco falhas seguidas na mesma linha e ela para de tentar
  (fica registrada em `planilha_fila.erro`, para você ver o motivo).
- **Isso não substitui o CRM.** É a ponte enquanto o CRM não existe. O dado
  verdadeiro continua no Supabase — a planilha é uma janela para ele.

## Para conferir depois

No SQL Editor do Supabase:

```sql
select count(*) filter (where enviado_em is null) as pendentes,
       count(*) filter (where enviado_em is not null) as enviadas,
       max(erro) as ultimo_erro
  from public.planilha_fila;
```
