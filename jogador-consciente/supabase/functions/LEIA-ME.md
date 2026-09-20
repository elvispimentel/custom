# Edge Funções

Quatro funções vivem no Supabase. Todas com `verify_jwt: false`, porque são
chamadas pelo app anônimo — e por isso **nenhuma delas confia no corpo da
requisição**.

| Função | O que faz | Por que importa |
|---|---|---|
| `ingestao` | recebe a fila de eventos e jogadores do app | é o CRM inteiro |
| `enviar-ficha` | manda o Autorretrato por e-mail (Resend) | pega o destinatário **da tabela**, nunca do pedido — senão vira máquina de spam |
| `cidades` | busca as cidades do mundo | expõe `buscar_cidade` sem precisar de chave no HTML |
| `planilha` | escoa a fila para o Apps Script | roda a cada minuto pelo pg_cron |
| `importar-cidades` | carga única do GeoNames | **desativada** depois da carga; devolve 410 |

## Segredos

```
RESEND_API_KEY     chave do Resend com acesso total ou domínio verificado
REMETENTE_FICHA    O Jogador Consciente <contato@ojogadorconsciente.com.br>
RESPOSTA_FICHA     para onde vai a resposta de quem responder (opcional)
```

## Recuperar o código que não estiver aqui

As funções foram implantadas direto pela API. Para trazer o fonte de volta:

```bash
supabase functions download <nome> --project-ref ncvispbuglalzubilvma
```

Ou pelo painel: Edge Functions → a função → Code.

## O erro que já custou uma semana

Se o envio falhar com `502 / erro: resend`, leia o campo `detalhe.message`.
Duas mensagens já apareceram, e são problemas diferentes:

- *"The associated domain with your API key is not verified"* → a **chave** está
  amarrada a um domínio. Crie outra com acesso total.
- *"The X domain is not verified"* → o **domínio** não está verificado no Resend.
  Cuidado com o SPF: ao criar uma caixa de e-mail na Hostinger, ela reescreve o
  SPF do domínio e pode apagar o do Resend. Os dois precisam conviver num único
  registro:
  `v=spf1 include:_spf.mail.hostinger.com include:amazonses.com ~all`

Dois registros SPF separados invalidam os dois.
