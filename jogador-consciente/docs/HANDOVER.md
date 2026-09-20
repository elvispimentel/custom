# Passagem de bastão — do chat para o Claude Code

**Data:** 20/09/2026 · **Versão entregue:** 0.12.3 · **Autor do sistema:** Elvis Pimentel

---

## 1. Por que esta mudança precisa acontecer agora

O código-fonte do seu produto está hoje dentro de um contêiner temporário na
nuvem. Não é um servidor, não é um backup, não é um repositório: é uma máquina
que existe enquanto a conversa existe e é reciclada depois.

Traduzindo sem rodeio: **hoje, o único lugar onde o seu sistema existe por
inteiro é um lugar que some.** O que está publicado na Lovable é o resultado
compilado — um HTML de 527 KB com tudo embutido. Dá para servir; não dá para
manter. A partir dele ninguém reconstrói o motor, nem as migrações do banco, nem
a história de por que cada decisão foi tomada.

Levar para o Claude Code não é troca de ferramenta. É **tirar o seu negócio de
cima de uma superfície que evapora** e colocá-lo num repositório versionado, onde
cada alteração tem autor, data e possibilidade de volta atrás.

---

## 2. O que está indo junto

```
jogador-consciente/
├── CLAUDE.md            ← as regras. É o arquivo mais importante do pacote.
├── README.md            ← como construir, testar, publicar
├── CHANGELOG.md         ← v0.1.0 até v0.12.3, com o motivo de cada mudança
├── VERSAO
├── build.py             ← monta o HTML final (já reapontado para a nova estrutura)
├── build_bundle.py      ← monta o motor para o navegador
├── src/                 ← o app, a narrativa, o CSS, as cidades do Brasil
├── engine/src/          ← o motor de oráculos (fonte)
├── vendor/              ← astronomy-engine (efemérides, MIT)
├── admin/               ← a Sala de Comando
├── supabase/
│   ├── migracoes/       ← 001 base · 002 painel · 003 cidades · 004 planilha · 005 GODMODE
│   ├── functions/       ← as Edge Functions
│   └── Codigo.gs        ← o Apps Script da planilha
├── testes/              ← Playwright, incluindo a regressão do motor
├── icones/              ← ícones do app + manifest
└── docs/                ← este documento e os briefings
```

Testado: o `build.py` roda de dentro do repositório e gera os mesmos dois
arquivos que você publica hoje. A regressão do motor passa com o mesmo
`md5 5a0cb5f7…` de sempre.

---

## 3. O que NÃO está indo, e precisa ir

Três coisas moram fora do repositório e você precisa trazer:

**O fonte de três Edge Functions.** `ingestao`, `cidades` e `planilha` foram
implantadas direto pela API e o fonte vive só no Supabase. Recupere com
`supabase functions download <nome> --project-ref ncvispbuglalzubilvma` e
comite. Enquanto não fizer isso, uma parte do backend continua sem versão.

**As chaves.** `RESEND_API_KEY`, `REMETENTE_FICHA`, a chave da Cakto, o token da
Panda. Nunca entram no repositório. Ficam nos segredos do Supabase e num
gerenciador de senhas seu.

**As 54 imagens das cartas.** Estão no Storage do Supabase, que é o lugar certo.
Mas você não tem cópia própria delas em lugar nenhum — se a conta cair, a arte
cai junto. Baixe e guarde fora.

---

## 4. Os quatro passos para virar a chave

### Passo 1 — instalar o Claude Code
No computador, com Node instalado:
```bash
npm install -g @anthropic-ai/claude-code
```

### Passo 2 — criar o repositório
Descompacte o pacote, entre na pasta e:
```bash
git init
git add .
git commit -m "Estado inicial: v0.12.3, vindo do Cowork"
```
Depois crie um repositório **privado** no GitHub e empurre. Privado, não público:
tem chave de API pública do Supabase no `admin.html` e links de checkout no app.
Nada secreto, mas também nada que precise estar aberto.

### Passo 3 — abrir o Claude Code na pasta
```bash
cd jogador-consciente
claude
```
Ele lê o `CLAUDE.md` sozinho, na primeira mensagem. Não precisa colar contexto.

### Passo 4 — o primeiro pedido
Comece com um que force uma volta completa, para você ver se tudo está de pé:

> Leia o CLAUDE.md. Rode `python3 build_bundle.py`, `python3 build.py` e a
> regressão do motor. Me diga se o md5 bate com a linha-base.

Se o md5 bater, o sistema atravessou inteiro.

---

## 5. O que muda no seu dia

**Fica igual:** você testa no celular, volta com a lista numerada de defeitos, e
recebe o arquivo pronto para publicar na Lovable.

**Fica melhor:** cada conserto vira um commit. Quando algo quebrar, dá para ver
exatamente o que mudou e voltar atrás em um comando. Hoje, se uma alteração
quebra outra coisa, a única saída é descobrir na mão.

**Fica pior:** o Claude Code no seu computador não tem os acessos que esta
conversa tem — Supabase, Drive, Gmail. Para mexer no banco, você vai precisar
instalar o MCP do Supabase nele, ou fazer pelo painel. Não é difícil, mas é um
passo a mais.

---

## 6. GODMODE — o modo operador da Sala de Comando

### 6.1 Por que ele precisa existir

O app vai falhar com gente real. Não é pessimismo, é aritmética: quanto mais
gente entra, mais casos estranhos aparecem. E hoje, quando aparece um, a sua
única resposta é "não tem o que eu fazer".

Os casos já são previsíveis:

- Alguém paga por **Pix direto** ou entra na turma-piloto, e o acesso à Imersão
  não existe porque não passou pela Cakto.
- O webhook da Cakto atrasa ou falha, e a pessoa pagou mas está do lado de fora.
- Uma jogadora digita o e-mail errado e jura que não recebeu a ficha.
- O app trava numa etapa por causa de um defeito, e ela fica presa lá.

Nenhum desses casos se resolve pedindo para a pessoa "tentar de novo". Todos se
resolvem em cinco segundos se alguém tiver a chave.

### 6.2 A regra que governa tudo

> **GODMODE mexe em acesso e estado. Nunca em verdade calculada.**

Ele libera a Imersão, destrava uma etapa, corrige um e-mail, reenvia uma ficha.
Ele **nunca** altera o Autorretrato, as posições astronômicas ou as respostas do
inventário.

Isso não é excesso de zelo. Um mapa editado à mão deixa de ser um mapa e vira
uma opinião com aparência de cálculo — e o produto inteiro se sustenta na
promessa de que aquilo ali foi *calculado*, não escolhido. No dia em que existir
um botão para "ajustar" o retrato de alguém, o Autorretrato perde o que o torna
diferente de um teste de revista.

Por isso a migração `005` **não tem** `god_editar_autorretrato`, nem
`god_mudar_respostas`, nem `god_alterar_nascimento`. E o comentário no arquivo
avisa o próximo programador: se sentir vontade de criar uma dessas, pare.

### 6.3 A segunda regra: nada acontece sem rastro

Em agosto este projeto perdeu um mês inteiro de dados porque nada era registrado.
Catorze jogadores existem hoje no banco; os de antes de 30/08 sumiram sem deixar
sombra.

Não se repete. **Toda ação de GODMODE grava uma linha** em `admin_acoes`: quem
fez, o quê, em quem, quando, como estava antes, como ficou, e **por quê** — o
motivo é obrigatório, a função recusa sem ele.

Isso não é burocracia. É o que te deixa responder, daqui a seis meses, quando
alguém disser "eu nunca pedi isso".

### 6.4 Os poderes, um a um

| Poder | Para quê | Função |
|---|---|---|
| **Liberar a Imersão** | pagou por fora, cortesia, turma-piloto | `god_liberar_imersao(player, plano, motivo)` |
| **Corrigir o e-mail** | erro de digitação — causa nº1 de "não recebi" | `god_corrigir_email(player, email, motivo)` |
| **Destravar uma etapa** | o app falhou e a pessoa ficou presa | `god_destravar_etapa(player, etapa, motivo)` |
| **Reempurrar para a planilha** | a fila engasgou | `god_reenfileirar(player, motivo)` |

Planos aceitos em `god_liberar_imersao`: `trimestral` (3 meses), `anual` (1 ano)
e `cortesia` (sem prazo). O vencimento é calculado sozinho.

### 6.5 Quem pode usar

Ser administrador **não** dá GODMODE. São duas permissões diferentes:

- `admin_users` → **lê** o painel, o funil, as fichas. É o que você tem hoje.
- `admin_users.godmode = true` → **escreve** no estado dos jogadores.

```sql
update public.admin_users set godmode = true where email = 'seu@email.com';
```

Essa separação existe para quando você tiver equipe. Alguém de suporte precisa
ver o CRM; não precisa poder dar acesso vitalício de graça.

### 6.6 O que falta construir

A migração `005_godmode.sql` cria **o banco inteiro** — permissão, livro de
bordo, tabela de acessos, as quatro funções, com todas as travas. Está pronta
para aplicar.

O que ainda não existe é a **interface** na Sala de Comando. A ficha individual
precisa ganhar uma seção que só aparece para quem tem `godmode`:

1. Um **interruptor** que liga o modo, e que volta a desligar sozinho ao sair.
   Poder não pode ficar ligado por padrão — é assim que alguém concede acesso
   sem querer com o polegar.
2. Os quatro botões, cada um pedindo o **motivo** antes de executar.
3. O **histórico de ações** daquele jogador, lido de `admin_acoes`, logo abaixo
   da linha do tempo de eventos.
4. Um visual que **avise**: borda vermelha, fundo diferente, o nome "GODMODE" em
   letra de sistema. A pessoa precisa saber que saiu da área de leitura.

Peça ao Claude Code assim, na primeira sessão em que for mexer nisso:

> Aplique `supabase/migracoes/005_godmode.sql` e construa a interface do GODMODE
> na ficha individual do `admin/admin.html`, seguindo a seção 6.6 do
> `docs/HANDOVER.md`. Respeite as duas regras do cabeçalho da migração.

---

## 7. O que está aberto, em ordem de urgência

| # | O quê | Por que agora |
|---|---|---|
| 1 | **Webhook da Cakto** | sem ele, toda venda vira trabalho manual — e você já vendeu |
| 2 | **Nomes dos 16 tipos** | ainda usam nomenclatura MBTI/16Personalities, que é marca de terceiro num produto vendido |
| 3 | **Interface do GODMODE** | o banco está pronto; falta a tela |
| 4 | **PDF vetorial** | depende do modelo de impressão vir do branding |
| 5 | **Fonte das 3 Edge Functions** | parte do backend ainda sem versão |

---

## 8. Se alguma coisa der errado na mudança

O pacote inclui `out/` com os HTML já construídos. Se o build não rodar na sua
máquina por qualquer motivo, **o que está publicado continua publicado** — nada
do que você tem no ar depende desta migração dar certo hoje.

A migração é sobre o futuro do código, não sobre o presente do produto.
