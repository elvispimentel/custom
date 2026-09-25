# Sala de Comando — como usar

Arquivo: `admin.html`. Reconstruída em 02/09/2026 contra as seções 13 e 14 do seu briefing.

---

## Como colocar no ar

1. No Hostinger, crie o subdomínio **`admin.ojogadorconsciente.com.br`**.
2. Renomeie `admin.html` para **`index.html`** e suba na pasta desse subdomínio.
3. Pronto. Não vai para a Lovable — é uma página só, sem build.

**Usuário e senha:** os que você já criou no Supabase (Authentication ▸ Users).
Não existe senha no HTML. Quem entra é autenticado pelo Supabase, e só passa quem
está na tabela `admin_users`. Um estranho que baixe o arquivo inteiro não vê um dado
sequer sem uma conta autorizada.

---

## O que tem dentro

### Aba **Painel**
Sete números, cada um com a conversão embaixo: entraram, começaram o autorretrato,
concluíram, deixaram contato, deixaram reflexão, chegaram às Instruções, iniciaram
as Instruções. Abaixo, o funil curto — só o que já existe no produto.

### Aba **Funil**
As 12 etapas, do "entrou" até "comprou a Imersão". As quatro últimas aparecem
apagadas com o selo **a construir**: ainda não existem, mas você vê o caminho inteiro.

Cada etapa mostra três coisas: **quantas pessoas**, **quanto sobrou do topo** e
**quantas caíram ali**. É a linha vermelha "−N aqui" que interessa. Onde o número
for grande, não foi a pessoa que desistiu — foi o jogo que a perdeu naquele ponto.

### Aba **Jogadores**
Nome, contato, origem, entrada, etapa, última atividade e três bolinhas:
autorretrato concluído · Instruções (chegou / iniciou) · reflexão.
Busca livre e filtros prontos: quem não concluiu, quem deixou contato, quem
deixou reflexão.

### Ficha individual
Clique em qualquer linha. Abre com a **frase que a pessoa escreveu** em destaque —
é o que ela disse que mais tocou nela. Depois: quem é, de onde veio (com as UTMs
e os consentimentos), onde chegou, a linha do tempo de todos os eventos, e as
suas notas.

O e-mail abre o cliente de e-mail. O WhatsApp abre a conversa direto.

### LGPD
Dentro de cada ficha: **Exportar os dados dela** (JSON, para responder a um pedido
de acesso) e **Apagar tudo** (remove a pessoa, os eventos e as notas; pede confirmação
duas vezes e não tem volta).

### Filtros de período e exportação
Hoje · 7 dias · 30 dias · Tudo — recalculam o funil e a lista.
**Exportar CSV** baixa exatamente o que está filtrado na tela, não a base inteira.

---

## O que ela deliberadamente NÃO faz

Nada de scoring psicológico, classificação de leads ou IA decidindo por você —
seção 15 do seu briefing. A pessoa aparece como ela se descreveu, e o resto é
comportamento observado: onde clicou, onde parou.
