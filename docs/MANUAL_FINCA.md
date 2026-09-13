# MANUAL DE CRIAÇÃO — MÉTODO FINCA™
### Instituto Galifrael · Documento-mestre para desenvolvimento em Claude Code
### Versão 1.0 · Preparado a partir de sessão de trabalho com Elvis Pimentel

---

## COMO USAR ESTE DOCUMENTO

Este manual é a fonte única de verdade para a construção do motor do Método Finca™. Ele foi escrito para que quem o implemente — humano ou IA — não precise fazer nenhuma suposição sobre intenção, filosofia, nome, estrutura de dados ou conteúdo do produto-piloto.

Se em algum ponto da implementação surgir uma dúvida que este documento não responde diretamente, a resposta correta é **parar e perguntar ao Elvis** — nunca inferir e seguir em frente. Este documento cobre decisões já tomadas; não cobre decisões que ainda não foram tomadas, e essas duas categorias nunca devem ser confundidas.

Este documento tem doze seções. As dez primeiras são conceituais e de arquitetura. A décima primeira é o conteúdo completo e pronto do produto-piloto — o Código de Vendas Hipnóticas™ — capítulo por capítulo, já escrito, não um placeholder. A décima segunda é o checklist de aceite do MVP.

---

## 1. VISÃO GERAL — O QUE É O MÉTODO FINCA

**Método Finca™** é o sistema proprietário de aprendizado prático do Instituto Galifrael. O nome carrega a tese inteira: *conhecimento que fica e vira prática*.

Ele existe para resolver um problema específico e nomeado por Elvis: um ebook e um audiobook, por melhores que sejam, são as duas faces da mesma moeda — consumo passivo. A pessoa recebe informação, sente que aprendeu, e na primeira conversa real trava, porque nunca produziu nada com aquele conteúdo — só recebeu.

O Finca é a camada que transforma recepção em produção. Ele não substitui o ebook nem o audiobook — ele os envolve. A pessoa lê ou ouve um capítulo, e imediatamente pratica aquele capítulo especificamente, antes de seguir para o próximo. O aprendizado nunca fica pesado o suficiente para ser esquecido antes de virar músculo.

### 1.1 — O objetivo declarado (nas palavras de Elvis, preservadas)

> "A ideia é criar um caminho neural para virar uma habilidade da pessoa e ela sempre se lembrar. [...] Ela não só aprende, mas vira uma habilidade que ela use de forma natural assim como ela respira ou faz coisas inconscientes sem precisar ficar pensando em como fazer. Aí sim ela consegue atingir os resultados que ela quer ver."

Isso é o critério de sucesso do produto. Não é "a pessoa lembra o conteúdo". É "a pessoa aplica o conteúdo sem pensar conscientemente em aplicá-lo". Toda decisão de design deste documento se subordina a esse critério.

### 1.2 — Distinção crítica: Finca não é Etevê

O Instituto Galifrael já tem outro método proprietário, o **Método Etevê™** (Espelho → Tensão → Virada → Escolha), que é uma estrutura narrativa para escrever e avaliar comunicação persuasiva — VSLs, capítulos, ofertas, copy.

**Etevê ensina a comunicar. Finca ensina a aprender.**

São dois sistemas diferentes, com propósitos diferentes, que coexistem no mesmo ecossistema. Um livro pode *usar* a estrutura Etevê para ser escrito, e *ser ensinado através* do motor Finca. Nunca confundir os dois nomes, nunca usar um no lugar do outro, nunca fundir as siglas.

### 1.3 — Distinção crítica: Finca não é O Jogador Consciente

O Instituto também opera um ecossistema de RPG gamificado chamado **O Jogador Consciente**, com Portais, Guardião, arquétipos e uma mitologia narrativa própria (o "lore" do universo).

**O Método Finca é deliberadamente independente desse universo.** Ele não tem lore, não tem personagem, não tem Portal, não tem Guardião. É um companion de aprendizado enxuto, ligado diretamente ao livro que a pessoa comprou — nada mais.

Isso é uma decisão de escopo, não uma limitação técnica. Se um dia fizer sentido absorver o Finca dentro do universo do Jogador Consciente, essa será uma decisão nova, tomada depois, e não deve ser antecipada por quem implementa este documento. **Não importe nenhum termo, mecânica ou referência visual do Jogador Consciente para dentro do Finca.**

Uma ponte entre os dois ecossistemas já existe e deve ser preservada: o **Autorretrato do Jogador**, ferramenta gratuita em `ojogadorconsciente.com.br`, é mencionado ao final de cada livro do Instituto como próximo passo natural. O Finca não substitui essa ponte — ele a antecede.

---

## 2. FUNDAMENTAÇÃO CIENTÍFICA — RESUMO TRADUZIDO PARA DECISÃO DE PRODUTO

O Método Finca é baseado num levantamento de neurociência e psicologia cognitiva sobre como o cérebro humano de fato retém e automatiza conhecimento. O documento-fonte é denso e acadêmico; o que segue é a tradução para decisões de produto, com honestidade sobre o que a ciência sustenta e o que não sustenta.

### 2.1 — O que está comprovadamente errado (e o produto deve evitar)

Reler o mesmo conteúdo, grifar texto, resumir passivamente e usar mnemônicas de imagem têm baixa utilidade comprovada (Dunlosky et al., 2013, *Psychological Science in the Public Interest*). Essas técnicas criam **fluência ilusória** — a sensação de ter aprendido, sem retenção real. O motor Finca nunca deve oferecer "reler o capítulo" como forma de prática. Prática é sempre tentativa de recuperação, nunca revisão passiva.

### 2.2 — O que está comprovadamente certo (e o produto deve fazer)

**Prática de recuperação (retrieval practice):** tentar lembrar ativamente, antes de ver a resposta, consolida memória muito mais que reler. É a técnica de maior utilidade comprovada de todo o corpo de pesquisa revisado.

**Prática espaçada (spaced practice):** o intervalo entre uma exposição e a próxima revisão determina a retenção de longo prazo, numa relação matemática conhecida (Cepeda et al., 2008; Bahrick). A tabela de referência:

| Retenção desejada | Intervalo ideal entre sessões |
|---|---|
| 1 semana | 20% a 40% do prazo → 1 a 2 dias |
| 1 mês | 10% a 20% do prazo → 3 dias a 1 semana |
| 1 ano ou mais | 5% a 10% do prazo → 3 a 5 semanas |

Esta tabela governa o algoritmo de agendamento de revisões descrito na Seção 5.

**Pausa muda pós-aprendizado (Awake SWRs / NSDR):** o cérebro consolida memória em rajadas rápidas (*sharp-wave ripples*) mesmo acordado, em estado de repouso quieto e sem estímulo novo, imediatamente depois de aprender algo. Trocar de estímulo rapidamente — abrir outro aplicativo, iniciar outro conteúdo — interrompe essa consolidação antes que ela termine. Isso justifica a etapa "Calar" do ciclo Finca: uma pausa forçada, sem tela, logo após cada prática.

**Novidade distinta antes do aprendizado:** o cérebro grava mais fundo informação cercada por um elemento fora do padrão rotineiro — uma pergunta inesperada, uma tensão leve, um enquadramento diferente. Isso ativa neuromoduladores (noradrenalina/dopamina via *Locus Coeruleus*) que sinalizam "isto importa". Isso justifica a etapa "Faísca" no início de cada capítulo.

**Autoexplicação e efeito protégé:** explicar um conceito com as próprias palavras — especialmente como se estivesse ensinando alguém — aprofunda a codificação mais do que apenas reconhecer a resposta certa numa lista. Isso justifica a etapa "Nomear".

### 2.3 — O que a ciência NÃO sustenta tão fortemente (honestidade necessária)

O corpo de pesquisa revisado trata majoritariamente de **memória declarativa** — fatos, conceitos, informação que pode ser dita ou escrita. O objetivo de Elvis vai além disso: **automatização comportamental**, habilidade que roda sem pensamento consciente, como dirigir ou respirar. Essa é mais próxima de **memória procedural**, que se consolida por repetição real em contexto real, com feedback — não apenas por testes e espaçamento bem feitos dentro de um aplicativo.

**Implicação de produto, não negociável:** a etapa "Aplicar" do ciclo Finca não é decorativa nem opcional. É a única etapa que empurra a pessoa para fora do aplicativo, para a vida real, e é ela — não o quiz bem feito — que realmente constrói a automatização que Elvis busca. Qualquer implementação que trate "Aplicar" como um campo de texto sem consequência está construindo o produto errado.

---

## 3. O CICLO FINCA — AS CINCO ETAPAS

O nome Finca é também uma sigla. Cada capítulo de cada livro, ao ser trabalhado dentro do motor, percorre até cinco etapas, sempre nesta ordem. Nem todo capítulo usa as cinco — capítulos leves podem pular etapas (ver regra 3.7) — mas quando uma etapa está presente, a ordem nunca muda.

### 3.1 — F de Faísca

**Função:** ativar atenção e leve tensão antes do conteúdo, explorando o mecanismo de novidade distinta descrito na Seção 2.2.

**O que é, na prática:** uma frase curta, provocativa ou inesperada, exibida antes da pessoa ler ou ouvir o capítulo. Não é resumo do capítulo — é gancho. Deve gerar uma pergunta na cabeça da pessoa que só o capítulo responde.

**Regra de escrita:** máximo de duas frases. Nunca entregar a resposta na própria Faísca — se a Faísca já responde a si mesma, ela falhou.

### 3.2 — I de Investigar

**Função:** prática de recuperação ativa (retrieval practice) — o núcleo do sistema.

**O que é, na prática:** depois de ler ou ouvir o capítulo, a pessoa enfrenta uma pergunta, cenário ou desafio que exige que ela **tente lembrar e aplicar** o que acabou de consumir, antes de qualquer confirmação. Nunca mostrar a resposta antes da tentativa.

**Formatos possíveis:** ver Seção 4 — os cinco tipos de prática. Cada capítulo do livro usa um tipo específico, definido no mapa de conteúdo (Seção 11).

**Regra de feedback:** depois da tentativa, sempre mostrar se acertou ou não, e por quê — nunca deixar a pessoa em dúvida sobre o próprio desempenho.

### 3.3 — N de Nomear

**Função:** autoexplicação e efeito protégé — aprofundar a codificação forçando a pessoa a articular o raciocínio, não apenas reconhecer a resposta certa.

**O que é, na prática:** depois do Investigar, um campo de resposta aberta pedindo que a pessoa explique, com as próprias palavras, por que a resposta é o que é — como se estivesse ensinando alguém que nunca leu o livro.

**Regra de avaliação no MVP:** não é preciso correção automática rigorosa nesta etapa em todos os casos. Para a maioria dos capítulos, o valor está no ato de escrever, não na correção. Exceção: a Parte 7 do livro-piloto (Objeções) exige avaliação mais estruturada — ver especificação detalhada na Seção 11.7.

### 3.4 — C de Calar

**Função:** pausa muda pós-aprendizado, para permitir a consolidação descrita na Seção 2.2 (Awake SWRs / NSDR).

**O que é, na prática:** uma tela de espera obrigatória, minimalista, sem conteúdo, sem possibilidade de pular, com uma contagem regressiva visível. Duração varia por capítulo (entre 15 e 90 segundos — especificado por item na Seção 11). Durante essa tela, nenhuma outra ação é possível dentro do aplicativo.

**Regra de design:** esta tela deve ser deliberadamente vazia. Nada de dicas, nada de progresso de outros capítulos, nada de notificação. Uma frase fixa e discreta pode aparecer, algo como *"Não faça nada. Deixe isso assentar."* — e nada mais.

**Regra de produto:** o aplicativo não deve permitir minimizar e abrir outro aplicativo durante essa tela sem penalidade — se tecnicamente inviável impedir isso (mobile web), ao menos o timer deve reiniciar se a aba perder o foco antes do fim, reforçando a regra sem tentar policiar o dispositivo do usuário de forma invasiva.

### 3.5 — A de Aplicar

**Função:** a etapa mais importante do ciclo inteiro, por tudo que a Seção 2.3 estabelece. É aqui que conhecimento declarativo vira início de automatização procedural.

**O que é, na prática:** uma instrução de ação real, fora do aplicativo, na vida da pessoa — geralmente algo para fazer na próxima conversa real que ela tiver. Junto com a instrução, um mecanismo de retorno: a pessoa é convidada a voltar depois (o sistema agenda esse retorno, ver Seção 5) e registrar o que aconteceu.

**Regra de escrita:** a ação deve ser pequena, concreta e verificável pela própria pessoa — nunca vaga ("preste atenção à comunicação") e nunca grande demais para caber numa única conversa real.

### 3.6 — Ordem e ciclo completo

A sequência dentro de um capítulo é sempre: **Leitura/Escuta do capítulo → Faísca (antes, se aplicável) → Investigar → Nomear → Calar → Aplicar**.

Nota de correção de ordem: a Faísca é o único elemento que pode aparecer *antes* do conteúdo do capítulo (funcionando como gancho de entrada) ou logo *depois* dele e antes do Investigar (funcionando como ponte). Definir por capítulo qual das duas posições faz mais sentido — especificado por item na Seção 11.

### 3.7 — Regra de capítulos leves

Nem todo capítulo do livro tem densidade suficiente para justificar as cinco etapas completas. Capítulos leves (memorização simples, conteúdo de tom emocional/reflexivo) podem pular Faísca, Nomear e/ou Aplicar. **Investigar e Calar nunca são puláveis** quando o capítulo tem qualquer conteúdo prático — são o coração do mecanismo. A única exceção é conteúdo puramente reflexivo (ver Parte 11 do livro-piloto, Seção 11.11), onde Investigar não se aplica e Nomear assume a forma de reflexão livre.

---

## 4. OS CINCO TIPOS DE PRÁTICA (ETAPA INVESTIGAR)

Todo capítulo de todo livro do Instituto Galifrael cabe em um destes cinco moldes. O motor deve implementar os cinco como componentes reutilizáveis e genéricos — a diferença entre um capítulo e outro é o conteúdo carregado no molde, nunca uma nova peça de interface.

### 4.1 — Classificação

A pessoa recebe uma fala, cenário ou trecho curto e escolhe, entre opções, a categoria correta (qual Código de Ignição está ativo, qual das sete funções está em jogo, qual estratégia clássica está sendo usada, etc.).

**Estrutura de dados do item:**
```
{
  "tipo": "classificacao",
  "enunciado": "texto do cenário ou fala apresentada",
  "opcoes": ["opção A", "opção B", "opção C", "opção D"],
  "resposta_correta": "opção B",
  "explicacao": "por que a resposta correta é essa, e por que as outras não são"
}
```

### 4.2 — Ordenação

A pessoa recebe elementos embaralhados (etapas, trechos, blocos) e precisa arrastar/organizar na sequência correta.

**Estrutura de dados do item:**
```
{
  "tipo": "ordenacao",
  "enunciado": "instrução da tarefa",
  "elementos_embaralhados": ["elemento 1", "elemento 2", "elemento 3", "elemento 4"],
  "ordem_correta": [2, 4, 1, 3],
  "explicacao": "por que essa é a ordem certa e o que quebra se for diferente"
}
```

### 4.3 — Resposta Aberta Avaliada

A pessoa escreve uma resposta livre (geralmente simulando uma situação real, como responder a uma objeção), e o sistema avalia se critérios específicos foram cumpridos.

**Estrutura de dados do item:**
```
{
  "tipo": "resposta_aberta",
  "enunciado": "situação apresentada, ex: uma objeção de cliente",
  "criterios_avaliacao": [
    "reconheceu genuinamente o que foi dito, sem ignorar ou desviar",
    "reorganizou a percepção da pessoa sem contradizer diretamente",
    "ofereceu um próximo passo claro sem pressão"
  ],
  "exemplo_resposta_forte": "texto de referência de uma boa resposta",
  "modo_avaliacao": "autoavaliacao_guiada"
}
```

No MVP, `modo_avaliacao` deve ser `"autoavaliacao_guiada"`: depois de escrever, a pessoa vê os critérios e marca ela mesma quais cumpriu, comparando com o exemplo de referência. Avaliação automática via IA (LLM lendo a resposta e pontuando os critérios) é melhoria de fase posterior — ver Seção 10 (Roadmap), não bloqueia o MVP.

### 4.4 — Flashcard

Par pergunta-resposta ou associação rápida, sem julgamento, para memorização de baixa complexidade (ex: cor associada a Código de Ignição).

**Estrutura de dados do item:**
```
{
  "tipo": "flashcard",
  "frente": "texto ou elemento visual do lado A",
  "verso": "resposta ou associação do lado B"
}
```

### 4.5 — Reflexão

Pergunta aberta sem certo ou errado, para conteúdo de identidade ou autoconhecimento. Não há avaliação — a resposta fica registrada para a própria pessoa reler depois.

**Estrutura de dados do item:**
```
{
  "tipo": "reflexao",
  "pergunta": "pergunta aberta e pessoal",
  "sem_avaliacao": true
}
```

### 4.6 — Regra de reaproveitamento

Estes cinco tipos são a única superfície de dados que o front-end precisa saber renderizar. Adicionar um sexto livro ao ecossistema nunca deve exigir um sexto tipo de componente — apenas novos itens de conteúdo usando os cinco tipos existentes. Se durante a implementação parecer necessário um tipo novo, isso é sinal de alerta: parar e verificar com Elvis antes de expandir o modelo.

---

## 5. MOTOR DE ESPAÇAMENTO E INTERCALAÇÃO

### 5.1 — Objetivo do motor

Depois que uma pessoa completa um item de prática pela primeira vez, o sistema precisa decidir quando trazer aquele item de volta para revisão — e também precisa, de tempos em tempos, misturar itens antigos de capítulos já vistos junto com o conteúdo novo (prática intercalada), em vez de tratar cada capítulo como uma ilha.

### 5.2 — Algoritmo de agendamento (v1, simplificado)

Para o MVP, implementar uma versão simplificada baseada diretamente na tabela da Seção 2.2, sem a complexidade de sistemas como SM-2 completo:

1. Meta de retenção padrão do produto: **1 mês** (adequado ao ritmo de um curso, não de uma prova). Isso posiciona o intervalo padrão entre revisões em **3 dias a 1 semana** (10% a 20% do prazo).

2. Na primeira vez que um item é respondido:
   - Se a resposta estiver **correta**: agendar a próxima revisão para **5 dias depois** (ponto médio da faixa de 1 mês).
   - Se a resposta estiver **incorreta**: agendar a próxima revisão para **1 dia depois** (faixa mais curta, equivalente à meta de retenção de 1 semana, porque o item ainda não está consolidado).

3. A cada revisão subsequente **correta**, aumentar o intervalo seguinte multiplicando por um fator entre 1.8 e 2.2 (usar 2.0 como padrão simples), até um teto de **35 dias** (limite superior da faixa de retenção de 1 ano).

4. A cada revisão subsequente **incorreta**, resetar o intervalo para **1 dia**, independente de quantas revisões corretas vieram antes.

5. Este cálculo deve ser armazenado por item, por usuário — nunca global.

### 5.3 — Regra de intercalação

Sempre que a pessoa abre a tela de prática de um novo capítulo, antes de apresentar o conteúdo novo, o sistema verifica se existem itens de capítulos anteriores com `proxima_revisao` vencida (data igual ou anterior a hoje). Se existirem, apresentar **até dois** desses itens antigos primeiro, misturados, antes de seguir para o conteúdo novo do capítulo atual.

Isso implementa a prática intercalada (Seção 2.2) sem exigir uma tela separada de "revisão" — a revisão acontece embutida no fluxo natural de avanço do curso. Uma tela de revisão dedicada, para quando a pessoa já terminou o livro inteiro e só quer reforçar, é melhoria de fase posterior (ver Roadmap).

### 5.4 — Priorização quando há mais itens vencidos do que o limite de dois

Priorizar por: (1) itens já errados anteriormente, sobre itens sempre certos; (2) entre itens de mesma prioridade, o mais atrasado (data de vencimento mais antiga) primeiro.

---

## 6. ARQUITETURA DE PRODUTO — CAMADAS DE ACESSO E PREÇO

### 6.1 — Estrutura de preço confirmada por Elvis

Existem dois livros "grandes" no catálogo do Instituto Galifrael: **Código de Vendas Hipnóticas™** e **Curso de Magnetismo Pessoal** (reescrita autoral do material clássico de V. Turnbull). Cada um segue a mesma estrutura de duas camadas:

| Camada | Preço | O que inclui |
|---|---|---|
| Base | R$67 | Ebook + Audiobook do livro, consumidos livremente (a pessoa escolhe ler ou ouvir, nunca as duas coisas ao mesmo tempo por design) |
| Finca | R$197 | Tudo da camada Base + acesso ao motor do Método Finca™ para aquele livro específico — o ciclo completo de prática, capítulo por capítulo, com agendamento de revisão |

**Importante:** os outros três produtos do catálogo atual (Linguagem de Influência Consciente™, O Código Invisível das Vendas™, Vocabulário de Presença™) são produtos menores, vendidos como order bumps independentes, e **não fazem parte do escopo do Finca nesta fase**. Não implementar acesso Finca para eles a menos que Elvis solicite explicitamente no futuro.

### 6.2 — Implicação de dados

O acesso ao motor Finca é **por produto, não universal**. Uma pessoa pode comprar o Código de Vendas Hipnóticas na camada Base e, semanas depois, fazer upgrade para a camada Finca daquele mesmo produto. Ou pode comprar diretamente na camada Finca. Cada produto tem seu próprio estado de acesso, independente dos demais — uma pessoa pode ter Finca desbloqueado no Código de Vendas Hipnóticas e não ter no Magnetismo Pessoal, e vice-versa.

### 6.3 — Gate de acesso no MVP

Para o MVP, o gate de acesso pode ser **manual**: Elvis confere o pagamento na Cakto e concede acesso manualmente através de um painel simples (ou até diretamente no banco de dados via Supabase Studio). Automação via webhook de pagamento é melhoria de fase posterior (ver Roadmap, Seção 10) — **não é bloqueio para o lançamento do MVP**.

---

## 7. ESPECIFICAÇÃO TÉCNICA

### 7.1 — Stack recomendada

Reutilizar o mesmo par de ferramentas já validado e em uso ativo por Elvis no ecossistema O Jogador Consciente: **Lovable** para o desenvolvimento do front-end/aplicação, e **Supabase** (Postgres + Auth) como backend.

**Importante:** este deve ser um **projeto Lovable novo e um projeto Supabase novo**, completamente separados da instância que already roda O Jogador Consciente. Os dois produtos não devem compartilhar banco de dados nem projeto — são negócios e ecossistemas distintos, mesmo compartilhando o padrão de ferramentas. Isso segue o mesmo princípio já aplicado por Elvis a outros negócios paralelos (ex: PerfectJus opera fora da base do Jogo da Vida).

Pagamento: **Cakto**, mesma plataforma já usada pelo Instituto Galifrael para os demais produtos.

### 7.2 — Modelo de dados (schema conceitual)

```
usuarios
- id (uuid, via Supabase Auth)
- email
- nome
- criado_em

produtos
- id
- slug (ex: "codigo-vendas-hipnoticas", "magnetismo-pessoal")
- titulo

acessos
- id
- usuario_id → usuarios.id
- produto_id → produtos.id
- camada ('base' | 'finca')
- concedido_em

capitulos
- id
- produto_id → produtos.id
- ordem (inteiro, define a sequência)
- titulo

itens_pratica
- id
- capitulo_id → capitulos.id
- ordem (posição dentro do capítulo, se houver mais de um item)
- tipo ('classificacao' | 'ordenacao' | 'resposta_aberta' | 'flashcard' | 'reflexao')
- faisca_texto (nullable)
- faisca_posicao ('antes_conteudo' | 'depois_conteudo' | null)
- payload_investigar (jsonb — estrutura varia por tipo, ver Seção 4)
- tem_nomear (boolean)
- nomear_prompt (nullable)
- calar_segundos (inteiro, 0 se não aplicável)
- tem_aplicar (boolean)
- aplicar_texto (nullable)

progresso_usuario
- id
- usuario_id → usuarios.id
- item_pratica_id → itens_pratica.id
- status ('nao_iniciado' | 'concluido')
- ultima_resposta (jsonb)
- acertou (boolean, nullable — não se aplica a flashcard/reflexão)
- concluido_em (timestamp)
- proxima_revisao_em (date, nullable)
- intervalo_atual_dias (inteiro, usado pelo cálculo da Seção 5.2)

registros_nomear_aplicar
- id
- usuario_id → usuarios.id
- item_pratica_id → itens_pratica.id
- tipo ('nomear' | 'aplicar' | 'reflexao')
- texto_resposta
- criado_em
```

### 7.3 — Telas necessárias

1. **Login/Onboarding** — autenticação simples via Supabase Auth (email/senha ou magic link).
2. **Meus Livros** — lista dos produtos que o usuário possui, com indicação visual da camada (Base ou Finca) e barra de progresso por livro (apenas para quem tem camada Finca; quem só tem Base não vê progresso, porque não há prática a progredir).
3. **Capa do Livro / Lista de Capítulos** — capítulos em ordem, indicando concluído/em andamento/bloqueado (capítulos são sequenciais — não é possível pular para o capítulo 5 sem completar o ciclo do capítulo 4, reforçando o ritmo de aprendizado desenhado).
4. **Ler ou Ouvir** — tela de escolha obrigatória antes do conteúdo de cada capítulo. Duas opções lado a lado, nunca uma opção combinada. Ao escolher, abre o conteúdo (link para o PDF/trecho de texto, ou player de áudio) daquele capítulo especificamente — não o livro inteiro.
5. **Faísca** — tela curta, só texto, botão para continuar.
6. **Investigar** — quatro variações de layout conforme o tipo (Seção 4), mas com cabeçalho e navegação consistentes entre elas.
7. **Nomear** — campo de texto livre, com o prompt visível no topo.
8. **Calar** — tela cheia, minimalista, contagem regressiva, sem navegação possível até o fim.
9. **Aplicar** — texto da instrução + botão "marcar como feito" que, quando clicado depois (não imediatamente — a pessoa precisa ter tido a conversa real primeiro), abre um campo curto para registrar o que aconteceu.
10. **Painel de Domínio** *(fase 2, especificar mas não bloquear MVP)* — visão geral de quais temas/Códigos a pessoa já domina bem versus quais ainda erra, por livro.

### 7.4 — Notificações

No MVP, notificação pode ser tão simples quanto um e-mail disparado quando um item entra em `proxima_revisao_em` igual à data de hoje, ou até ausente — a pessoa simplesmente vê os itens vencidos na próxima vez que abrir o capítulo seguinte (Seção 5.3 já cobre isso organicamente). Notificação via WhatsApp, se desejada depois, é melhoria de fase posterior.

---

## 8. IDENTIDADE VISUAL E TOM DE VOZ

### 8.1 — Paleta de cores

Reutilizar a identidade já estabelecida em todo o material do Instituto Galifrael:

- Roxo principal: `#1A0066`
- Roxo médio: `#2D0099`
- Dourado: `#C9A84C`
- Dourado claro: `#E8C97A`
- Fundo claro (padrão para telas com texto longo): `#F4F1EC` ou branco puro `#FFFFFF`
- Texto principal: `#1A1040` (quase preto, nunca preto puro)
- Texto secundário/cinza: `#555555` ou `#666666`

**Lição já aprendida e não repetir:** uma primeira versão de um artefato deste ecossistema foi construída com fundo escuro e texto escuro sobre ele, tornando a leitura impossível. A regra fixa a partir de aqui: **telas de leitura, texto e formulários usam fundo claro com texto escuro.** Fundo escuro (roxo profundo) é reservado para elementos decorativos, capas, e blocos de destaque específicos — nunca para áreas de leitura extensa ou de preenchimento de formulário.

### 8.2 — Tipografia

Títulos e citações: fonte serifada (Georgia ou Cormorant Garamond). Corpo de texto e interface: fonte sans-serif limpa (DM Sans ou similar).

### 8.3 — Tom de voz

O motor Finca fala com a pessoa na mesma voz que os livros do Instituto Galifrael: direto, prático, sem jargão de "gamificação" forçada, sem emojis em excesso, sem tom de professor. As telas de Calar e Faísca, em particular, devem ser as mais silenciosas e diretas de todo o produto — nenhum excesso de entusiasmo ali, coerente com a função de pausa e reflexão que carregam.

---

## 9. REGRAS DE GOVERNANÇA E TERMINOLOGIA

Estas regras nunca devem ser quebradas em nenhuma tela, texto ou peça de comunicação do produto:

1. **Método Finca™** leva o símbolo de trademark na primeira menção de cada tela/documento onde aparece, seguindo o mesmo padrão já usado para Método Etevê™ e Códigos de Ignição™.
2. **Nunca usar a palavra "bônus"** para descrever a camada Finca ou qualquer produto do catálogo — ela é um upgrade de camada, um produto pago em pé de igualdade, nunca um extra gratuito ou secundário.
3. **Nunca importar terminologia de O Jogador Consciente** (Portal, Guardião, Antessala, Arcano) para dentro do Finca, conforme já estabelecido na Seção 1.3.
4. **Grafia obrigatória "Instituto Galifrael"** — nunca "Galifriel" nem outras variações.
5. **A escolha entre ler e ouvir é sempre apresentada como opção paralela e igual**, nunca como "modo padrão" com uma alternativa secundária. As duas opções devem ter o mesmo peso visual.
6. **Nunca oferecer a opção de reler um capítulo como forma de "praticar"** — conforme a Seção 2.1, isso contraria a base científica do produto. Se a pessoa quiser reler, ela pode voltar à tela de Ler/Ouvir livremente, mas isso nunca deve ser apresentado ou contado como conclusão de prática.

---

## 10. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1 — MVP (escopo deste documento)
Motor genérico completo (Seções 3 a 5) implementado e funcionando para um único produto: **Código de Vendas Hipnóticas™**, com o conteúdo integral especificado na Seção 11. Gate de acesso manual (Seção 6.3). Sem notificações automatizadas. Avaliação de resposta aberta no modo autoavaliação guiada (Seção 4.3).

### Fase 2 — Automação comercial
Integração automática com webhook de pagamento da Cakto para liberar acesso sem intervenção manual de Elvis.

### Fase 3 — Segundo livro
Aplicar o motor genérico (sem alterações de código, apenas novo conteúdo) ao **Curso de Magnetismo Pessoal**, provando que a arquitetura é de fato reutilizável entre livros.

### Fase 4 — Refinamentos de aprendizado
Avaliação por IA das respostas abertas (Parte 7 do livro-piloto e equivalentes futuros), Painel de Domínio visual, tela de revisão dedicada para quem já terminou o livro, notificações via WhatsApp.

### Fase 5 — Expansão de catálogo
Avaliar, com Elvis, se os demais livros do Instituto (incluindo possivelmente os três produtos menores atuais) entram no motor Finca.

---

## 11. CONTEÚDO COMPLETO — MAPA FINCA DO LIVRO-PILOTO

Este é o conteúdo real e final para o produto **Código de Vendas Hipnóticas™**, estruturado capítulo por capítulo (correspondendo às 11 Partes do livro), pronto para ser inserido diretamente no banco de dados conforme o schema da Seção 7.2. Nada aqui é placeholder.

---

### 11.1 — Parte 1: O Que Ninguém Te Contou Sobre a Mente de Quem Compra (as 7 Funções)

**Tipo de prática:** Classificação

**Faísca** *(posição: antes do conteúdo)*
> "Toda fala que você já disse numa conversa de venda pertence a uma de sete categorias — e até hoje você nunca soube nomear qual."

**Investigar**
Apresentar, uma de cada vez, as falas abaixo. Para cada uma, a pessoa escolhe a qual das 7 Funções (Presença, Direcionar Atenção, Compreensão de Valor, Aprofundar Conexão, Instalar Nova Perspectiva, Trabalhar Resistência, Reorientar Crença) ela pertence.

1. *"[Nome], posso te fazer uma pergunta meio estranha?"* → **Presença** (interromper o padrão com verdade).
2. *"Quantos clientes por dia passam aqui e não compram?"* → **Compreensão de Valor** (cálculo em voz alta).
3. *"Entendo. Faz sentido você pensar assim."* → **Trabalhar Resistência** (concordar antes de reorientar).
4. *"Não é falta de esforço. É que o esforço está sendo aplicado no lugar errado."* → **Instalar Nova Perspectiva** (nomear o padrão).
5. *"Uma cliente minha me disse depois de um mês..."* → **Aprofundar Conexão** (vulnerabilidade/história como prova).
6. *"Já tentei isso e não deu certo."* respondido com *"Isso é uma leitura, não um fato — o que exatamente você tentou, e em que contexto?"* → **Reorientar Crença** (separar fato de leitura).

Feedback por item: mostrar a função correta e uma frase explicando por que aquela fala cumpre aquela função especificamente.

**Nomear**
> "Escolha a fala que você mais errou (ou achou mais difícil de classificar) e explique, como se fosse ensinar alguém que nunca leu o livro, por que ela pertence a essa função."

**Calar:** 45 segundos.

**Aplicar**
> "Na sua próxima conversa real — de venda ou não — apenas observe. Não mude nada ainda. Tente identificar, em tempo real, qual das 7 Funções está acontecendo a cada troca de fala. Volte aqui depois e registre o que você percebeu."

---

### 11.2 — Parte 2: Os 14 Códigos de Ignição™

**Tipo de prática:** Classificação + Nomear reforçado (esta é a parte mais importante do livro; o ciclo de prática deve ser o mais robusto)

**Faísca** *(posição: antes do conteúdo)*
> "Você está prestes a aprender a ler, em tempo real, os 14 estados emocionais que decidem por qualquer pessoa antes da razão dela entrar em ação."

**Investigar**
Apresentar cenários curtos e pedir qual Código de Ignição está mais ativo (entre as 14 opções, ou um subconjunto de 5-6 mais prováveis para não sobrecarregar):

1. *"O cliente pergunta várias vezes se outras pessoas como ele já usaram o produto."* → **Segurança**.
2. *"O cliente diz: 'quero ser o primeiro do meu grupo a ter isso'."* → **Vaidade**.
3. *"O cliente pergunta se existe um jeito mais rápido de já começar a ver resultado."* → **Preguiça** (eficiência).
4. *"O cliente conta, sem que você pergunte, que está cansado de tentar sozinho e não conseguir."* → **Ira** (padrão que limita).
5. *"O cliente pergunta insistentemente 'mas como isso funciona por dentro?'"* → **Curiosidade**.
6. *"O cliente menciona o filho várias vezes ao explicar por que quer decidir agora."* → **Amor**.

Feedback: explicar o mecanismo do Código identificado, reforçando a definição do livro.

**Nomear**
> "Explique em uma frase: por que esse Código está ativo aqui, e não outro dos 14?"

**Calar:** 60 segundos (a parte mais densa do livro recebe a pausa mais longa entre as práticas de classificação).

**Aplicar**
> "Escolha uma pessoa com quem você vai conversar nos próximos dias. Antes da conversa, tente prever qual Código de Ignição estará mais ativo nela. Depois da conversa, volte aqui e registre se você acertou — e o que te fez perceber isso."

**Nota de agendamento:** por ser o conteúdo mais central do livro, este item deve ser um dos primeiros candidatos a reaparecer nas intercalações de capítulos seguintes (Seção 5.3).

---

### 11.3 — Parte 3: O Método Etevê™

**Tipo de prática:** Ordenação

**Faísca** *(posição: depois do conteúdo, como ponte)*
> "Você acabou de atravessar uma estrutura de quatro etapas sem perceber — lendo exatamente este capítulo. Vamos ver se você reconhece ela nua, fora do contexto onde acabou de vê-la."

**Investigar**
Apresentar quatro trechos curtos e embaralhados de uma peça de comunicação fictícia (pode ser adaptado de um exemplo do próprio livro), pedindo que a pessoa arraste na ordem correta: Espelho → Tensão → Virada → Escolha.

Exemplo de conjunto:
- *(Escolha)* "Você prefere pagar no Pix agora ou no cartão em duas vezes?"
- *(Espelho)* "Você já ficou diante de um cliente e sentiu que a venda escapou sem saber exatamente onde?"
- *(Tensão)* "Isso acontece com a maioria — e o custo disso nunca aparece de forma clara, só se acumula, semana após semana."
- *(Virada)* "O problema nunca foi o que você disse. Foi a ordem em que disse."

**Nomear**
> "Por que essa peça não funcionaria se a Virada viesse antes da Tensão? O que exatamente se perde na ordem trocada?"

**Calar:** 45 segundos.

**Aplicar**
> "Pegue a última mensagem comercial que você escreveu — um WhatsApp, um story, uma proposta. Marque mentalmente ou no papel onde está cada uma das quatro etapas. Se alguma estiver faltando, reescreva a mensagem agora com as quatro."

---

### 11.4 — Parte 4: Os 12 Passos de Uma Conversa que Converte

**Tipo de prática:** Ordenação + diagnóstico

**Faísca** *(antes do conteúdo)*
> "Toda conversa que travou no meio tinha um passo faltando — e quase nunca é o passo que você imagina."

**Investigar**
Apresentar uma conversa curta, fictícia, que fracassa — e pedir que a pessoa identifique qual dos 12 passos foi pulado.

Exemplo: uma abordagem que vai direto de "presença" para "produto como resposta", pulando "diagnóstico antes de solução" e "sua história com brevidade". A pessoa aponta o passo ausente.

**Nomear**
> "Se esse passo tivesse sido incluído, o que especificamente teria mudado no resultado dessa conversa?"

**Calar:** 45 segundos.

**Aplicar**
> "Pense numa conversa recente sua que não fechou. Aplique esse mesmo diagnóstico retroativamente: qual dos 12 passos faltou?"

---

### 11.5 — Parte 5: Estratégias Clássicas, Aplicadas com Consciência

**Tipo de prática:** Classificação

**Faísca** *(antes do conteúdo)*
> "Monroe, AIDA, comprometimento progressivo — você provavelmente já usou pelo menos duas dessas estratégias sem saber o nome delas."

**Investigar**
Trechos curtos de conversa → identificar qual estratégia clássica (Monroe, Comprometimento Progressivo, Contraste de Valor, Repetição com Variação) está em uso.

**Nomear**
> "Qual Código de Ignição essa estratégia específica ativa com mais força, e por quê?"

**Calar:** 30 segundos.

**Aplicar**
> "Escolha uma das quatro estratégias e use-a deliberadamente, de propósito, na sua próxima conversa de venda."

---

### 11.6 — Parte 6: A Linguagem da Presença

**Tipo de prática:** Autoprática (sem certo/errado — única parte com gravação de voz)

**Faísca** *(antes do conteúdo)*
> "Sua voz carrega uma informação que suas palavras nunca vão carregar sozinhas. Vamos ouvir a sua."

**Investigar** *(adaptado — não é quiz, é gravação)*
> "Grave 30 segundos de uma abertura de conversa, como se estivesse falando com um cliente real agora, aplicando o que você acabou de aprender sobre ritmo e silêncio."

**Nomear** *(autoavaliação guiada, reescutando a própria gravação)*
> "Reescute o que você gravou e responda: (1) você notou algum momento de silêncio intencional? (2) sua fala acelerou em algum ponto? (3) o que você mudaria?"

**Calar:** 20 segundos, posicionado antes de uma possível segunda tentativa de gravação — "antes de regravar, fique 20 segundos em silêncio total, sem pensar na técnica."

**Aplicar**
> "Grave a mesma abertura novamente daqui a três dias (o sistema vai te lembrar) e compare as duas gravações."

**Nota de agendamento:** por ser prática motora/vocal, não puramente declarativa, usar intervalo de revisão maior que o padrão — 3 dias, não a faixa curta de itens errados.

---

### 11.7 — Parte 7: Transformando Objeções em Aberturas

**Tipo de prática:** Resposta Aberta Avaliada — a prática mais valiosa e mais complexa do produto

**Faísca** *(antes do conteúdo)*
> "A objeção mais difícil que você já ouviu na vida vai aparecer aqui de novo. Dessa vez, você vai estar pronto — e vai poder provar isso."

**Investigar**
Apresentar, uma de cada vez, as cinco objeções centrais do livro. Para cada uma, a pessoa escreve livremente sua resposta:

1. "Não tenho tempo agora."
2. "Estou sem dinheiro."
3. "Já tentei algo assim e não funcionou."
4. "Preciso pensar."
5. "Não te conheço."

Depois de escrever, apresentar os três critérios de avaliação (correspondentes à estrutura Etevê aplicada a objeções, já presente no livro):
- Reconheceu genuinamente o que foi dito, sem ignorar nem desviar?
- Reorganizou a percepção da pessoa sem contradizer diretamente?
- Ofereceu um próximo passo claro, sem pressão?

A pessoa se autoavalia em cada critério (sim/não), e em seguida vê o exemplo de resposta forte do livro para comparação.

**Nomear**
> "Qual Código de Ignição você tentou ativar na sua resposta? Ele era o mais adequado para essa objeção específica, ou existia um Código mais forte que você não usou?"

**Calar:** 60 segundos.

**Aplicar**
> "Na próxima vez que você ouvir exatamente essa objeção numa conversa real, aplique sua resposta. Volte aqui depois e registre o que aconteceu — funcionou, travou, precisou de ajuste?"

**Nota de agendamento:** este é o item de maior prioridade de revisão de todo o produto. Reaparecer com frequência nas intercalações (Seção 5.3), mesmo depois de respostas corretas, dado o peso que Elvis atribui a essa habilidade específica.

---

### 11.8 — Parte 8: O Fechamento Consciente

**Tipo de prática:** Comparação + justificativa

**Faísca** *(antes do conteúdo)*
> "Duas pessoas podem fechar a mesma venda com frases completamente diferentes. Só uma das duas frases realmente fecha."

**Investigar**
Apresentar pares de frases de fechamento (uma fraca, uma forte) e pedir que a pessoa escolha a mais forte e explique por quê.

Exemplo de par:
- Fraca: *"Você quer comprar?"*
- Forte: *"Você prefere pagar no Pix agora ou no cartão em duas vezes?"*

**Nomear**
> "Reescreva a frase fraca, transformando-a numa frase forte usando o princípio de alternativa com direção."

**Calar:** 30 segundos.

**Aplicar**
> "Use o modelo de alternativa (nunca 'vai comprar?', sempre uma escolha entre duas opções válidas) na sua próxima venda real."

---

### 11.9 — Parte 9: A Psicologia das Cores na Comunicação Visual

**Tipo de prática:** Flashcard (capítulo leve — pula Faísca e Nomear, conforme regra 3.7)

**Investigar**
Rodada rápida de flashcards cor ↔ Código de Ignição ativado (vermelho/urgência-ira, verde/segurança-crescimento, roxo/vaidade-pertencimento, etc., conforme tabela do livro).

**Calar:** 15 segundos (a mais curta do produto, proporcional à leveza do conteúdo).

**Aplicar** *(pequena, opcional)*
> "Escolha a cor certa para o seu próximo story ou peça de divulgação, com base no Código que você quer ativar."

---

### 11.10 — Parte 10: Táticas de Fechamento Consciente

**Tipo de prática:** Classificação por cenário

**Faísca** *(antes do conteúdo)*
> "Existem seis táticas de fechamento no seu arsenal agora. Só uma delas é a certa para cada momento específico — usar a errada é o motivo mais comum de perder uma venda quase fechada."

**Investigar**
Cenário breve → qual das 6 táticas (contexto de interesse, escassez genuína, escolha com intenção, presença e ritmo, ancoragem de valor, continuidade) cabe ali.

**Nomear**
> "Por que as outras cinco táticas não caberiam tão bem nesse cenário específico?"

**Calar:** 30 segundos.

**Aplicar**
> "Na sua próxima oportunidade de fechamento, identifique antes qual das seis táticas o momento pede, e aplique deliberadamente."

---

### 11.11 — Parte 11: O Ativo que Ninguém Pode Tirar de Você

**Tipo de prática:** Reflexão pura (sem Investigar — conforme exceção da regra 3.7)

Este é o capítulo mais silencioso do produto. Ele prepara a pessoa para o Autorretrato do Jogador, a ponte para o ecossistema maior do Instituto Galifrael, e não deve ter tom de "prática técnica" como os demais.

**Faísca:** nenhuma.

**Investigar:** não se aplica.

**Nomear** *(assume a forma de reflexão livre)*
> "Em que momento desta semana você sentiu o teto de que o livro fala — a comunicação já funcionando, mas alguma coisa maior ainda travando? Não precisa ter resposta. Só escreva o que vier."

**Calar:** 90 segundos — a pausa mais longa do produto, com uma instrução adicional na tela: *"Fique em silêncio real antes de escrever. Não pense na técnica agora."*

**Aplicar** *(não é ação de venda — é a ponte para o ecossistema)*
> "O próximo passo não está neste aplicativo. Existe um Autorretrato do Jogador, gratuito, em ojogadorconsciente.com.br. Ele não te diz quem você é — devolve um mapa e termina em pergunta. Se o que você sentiu agora tem a ver com identidade, é por ali que continua."

**Nota de agendamento:** este item não entra no ciclo de revisão espaçada da Seção 5 — é fechamento, não conteúdo técnico a ser testado.

---

## 12. CHECKLIST DE ACEITE DO MVP

O MVP está pronto para ser mostrado a Elvis quando todos os itens abaixo forem verdadeiros:

- [ ] Existe um projeto Lovable e um projeto Supabase novos, separados da infraestrutura de O Jogador Consciente.
- [ ] O schema de dados da Seção 7.2 está implementado.
- [ ] As cinco telas de tipo de prática (Seção 4) renderizam corretamente a partir dos dados, sem conteúdo hardcoded.
- [ ] A tela de Calar bloqueia navegação até o fim da contagem e reinicia se a aba perde o foco.
- [ ] A tela de Ler ou Ouvir apresenta as duas opções com peso visual igual, nunca simultâneas.
- [ ] O algoritmo de agendamento da Seção 5.2 está implementado e testável (um item errado agenda para amanhã; um item certo agenda para daqui a cinco dias na primeira vez).
- [ ] A intercalação da Seção 5.3 traz itens antigos vencidos antes do conteúdo novo de cada capítulo.
- [ ] Todo o conteúdo da Seção 11 (as 11 Partes do Código de Vendas Hipnóticas) está carregado no banco de dados, não como placeholder.
- [ ] O gate de acesso por camada (Base/Finca) está funcionando, ainda que a concessão seja manual.
- [ ] Nenhuma tela usa fundo escuro com texto escuro (Seção 8.1) nem qualquer terminologia proibida (Seção 9).
- [ ] Uma pessoa consegue, do início ao fim, completar o ciclo Finca de pelo menos três capítulos diferentes sem erro de navegação ou de dados.

Quando este checklist estiver completo, o MVP deve ser apresentado a Elvis para validação com usuário real antes de qualquer investimento em Fase 2 ou além.

---

*Fim do Manual de Criação — Método Finca™ · Instituto Galifrael*
*Preparado para handoff em Claude Code · Toda dúvida não coberta aqui deve ser levada a Elvis Pimentel antes de prosseguir.*
