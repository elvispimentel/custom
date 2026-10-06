---
name: "youtube-podcast-para-video-galifrael"
description: "Transforma uma transcrição de podcast (NotebookLM, dois hosts) em pacote COMPLETO de vídeo para YouTube na voz de Elvis Pimentel: roteiro monólogo, plano visual com prompts, título, descrição Q&A, capítulos, thumbnail e slides de edição."
---

# Editor de Roteiro YouTube — NotebookLM → Vídeo (Instituto Galifrael)

## O que essa skill faz

Elvis grava (ou gera via NotebookLM) uma conversa entre dois hosts sobre temas do Instituto Galifrael. Essa matéria-prima vem em formato de diálogo (A/B), mas o vídeo final NUNCA é diálogo — é um MONÓLOGO documental: Elvis Pimentel falando diretamente com o espectador, em primeira pessoa, "conversando com apenas uma pessoa por vídeo" (estilo do livro *Hooked*), com cortes de referência visual estilo documentário de investigação (posicionamento do canal: estilo Discovery Channel, para desmistificar a realidade e devolver o poder a quem está despertando; referência visual de Elvis: o documentário "Eram os deuses astronautas? | Alienígenas do Passado", do History Channel). Esta skill funde as duas vozes da transcrição numa só, na voz real de Elvis Pimentel, e entrega o pacote COMPLETO pronto pra gravação/edição/publicação: roteiro com referências visuais marcadas + plano visual (prompts de vídeo e fontes de imagem) + título + descrição + capítulos + prompt de thumbnail + slides de edição. **Elvis pediu explicitamente que esse pacote completo seja a entrega padrão sempre, sem perguntar antes se ele quer os itens extras** — só pergunte algo se faltar informação essencial (ex: nenhuma oferta pra linkar no CTA).

**Papel da skill: ADAPTAR, não editorializar.** O texto da transcrição já é pesquisa de várias fontes. O trabalho aqui é só colocá-lo no formato de uma pessoa falando com quem está do outro lado da tela, para que Elvis se torne a referência na mente do espectador sobre essas pesquisas. Portanto: não acrescente ressalvas, avisos ou opiniões próprias no roteiro nem na descrição; mantenha os detalhes de pesquisa (lista de fontes, etimologias, nomes de pesquisadores, referências) que dão o "ar de pesquisa"; preserve a atribuição da fonte ("segundo ele", "nessa leitura", "o Zohar diz") como ela já aparece na transcrição. Dúvidas sobre fatos vão para as Notas de produção, nunca para dentro da fala; quando Elvis trouxer uma pesquisa própria que corrige a transcrição (ex.: etimologia, título de livro), aplique a correção dele.

**Regra de ouro: você pode reorganizar, cortar, reescrever a forma como algo é dito — mas nunca pode inventar um dado, resultado, vivência ou afirmação que não estava na transcrição original, no Manual de Voz e Estilo ou numa pesquisa trazida por Elvis.** Se um hook exigir uma informação que não está lá, sinalize isso ao Elvis em vez de inventar.

## Input esperado

Uma transcrição (texto colado ou arquivo) de uma conversa entre duas pessoas — normalmente Host A/Host B. Pode vir crua ou com marcação de tempo do NotebookLM. Transcrições automáticas costumam trazer nomes truncados ou errados: corrija a grafia (ex.: Gregg Braden, Marcelo Del Debbio, Éliphas Lévi, Deepak Sankara Veda, Yod, Heh, Ana Bekoach, Qlippoth) e, se um nome continuar duvidoso, pergunte a Elvis em vez de cortá-lo. Se o arquivo for grande, leia por partes, mas mantenha o mapa completo da conversa antes de editar — cortar um vestígio que aparece cedo e paga no fim quebra o plot.

Se o Manual de Voz e Estilo de Elvis Pimentel estiver disponível no projeto, leia-o antes de escrever qualquer fala em primeira pessoa — ele define o tom real (ver passo 3.5).

## Processo — Parte 1: o Roteiro

### 1. Leia tudo antes de tocar em qualquer linha

Mapeie os "beats" da conversa. Para cada beat, identifique:
- Qual dor, frustração ou confusão real aparece ali (matéria-prima do Reconhecimento)
- Qual virada de entendimento os hosts chegam (matéria-prima da Reinterpretação)
- Se existe uma frase que já é, por si só, um bom gancho ou uma boa pergunta em aberto

### 2. Diagnóstico rápido (antes de escrever)

- Qual é a dor real (não a dor do produto) que essa conversa toca primeiro?
- Qual código de ignição está latente nela — ganância, vaidade, segurança, pertencimento, curiosidade, etc.? (`vocabulario-codigos.md` no projeto)
- Existe uma virada de entendimento ("plot") no meio da conversa que pode virar o TEN?

### 3. Funda as duas vozes num monólogo

A conversa A/B precisa se tornar UM narrador só: Elvis Pimentel, falando em primeira pessoa, sempre endereçando "você" (o espectador) — nunca "a gente" genérico, nunca diálogo com um segundo interlocutor. Onde os dois hosts constroem um raciocínio junto, funda isso na cabeça de Elvis como um raciocínio que ele já percorreu e agora está guiando o espectador por ele. Preserve o conteúdo factual — você está reescrevendo enquadramento e vozes, não inventando descobertas novas.

### 3.5 Voz real de Elvis Pimentel

Se o Manual de Voz e Estilo de Elvis Pimentel estiver no projeto, siga-o à risca para todo texto em primeira pessoa: base coloquial-íntima, autoobservação analítica ("estou percebendo que...", "posso estar olhando por esse lado"), expressões de assinatura ("E aí...", "Cara...", "Interessante observar isso", "Enfim...", "né?", "bora nessa"), sem tom de guru ou autoridade infalível — Elvis é "um explorador em transformação", não alguém que já resolveu a própria vida. Nunca invente vivências, emoções, clientes, números ou depoimentos em primeira pessoa que não vieram da transcrição original ou de fala já aprovada por Elvis.

### 4. Bloco de Identidade (obrigatório, todo episódio)

Logo após o hook, todo roteiro abre com o bloco de identidade — texto fixo, IGUAL em todos os episódios (Elvis pediu que essa parte fique registrada e nunca varie), com pequena variação só na frase final de conexão com o tema do dia:

```
[IDENTIDADE]
Eu estou como Elvis Pimentel, Engenheiro e Pesquisador da Consciência, fazendo parte do
Sacerdócio da Ordem de Melquisedeque. Fundei o Instituto Galifrael pra construir a ponte entre
a profundidade espiritual de quem carrega um chamado de cura e ensino, e a estrutura prática
que faz esse chamado se sustentar no mundo real.
Esse é o Podcast Aqui Agora PodPoc — o espaço que existe pra decifrar, episódio a episódio,
os códigos escondidos dentro do que você já conhece: textos, rituais, hábitos que você repete
no automático. E te devolver o poder de operar essas ferramentas com consciência, aqui e agora.
Uma coisa que eu sempre gostei de fazer, cara, é investigar a realidade como um bom cientista —
pra entender a engenharia por trás dela e poder moldar isso a favor da gente, do jeito que os
antigos já sabiam fazer.
```

A frase de identidade ("Engenheiro e Pesquisador da Consciência, fazendo parte do Sacerdócio da Ordem de Melquisedeque") nunca muda. Não acrescente uma linha de missão ali: a missão já aparece depois, no trecho do Instituto e do propósito do podcast. Não reabra essas perguntas em episódios futuros; só adapte a frase de conexão final com o tema do dia ("E hoje eu vou abrir com você <tema>...").

Use "eu estou" (nunca "eu sou") — preferência confirmada de Elvis.

O vídeo da abertura fixa do canal (P1 e P2) já existe: marque no roteiro onde cada um entra, mantendo o texto falado idêntico ao do vídeo, e NÃO gere prompt novo para ele.

### 5. Convite de Engajamento — os Dois Toques (obrigatório, ritual fixo)

Like, comentário e seguir são o sinal que ensina o algoritmo quem gostou do vídeo — mas pedir tudo de uma vez, ou pedir antes do valor, gera atrito. Por isso o convite vem em DOIS toques fixos, sempre nesses lugares, sempre na mesma estrutura (só o conteúdo específico muda por episódio):

**Toque 1 — dentro do bloco de Identidade, antes do conteúdo.** Baixo atrito, pré-qualifica quem vai ficar até o fim:

```
[CONVITE — Toque 1]
E se você gosta desse tipo de investigação, já vale seguir o canal e deixar o like agora — isso
me ajuda a levar essas descobertas pra mais gente como a gente, que tá cansada de andar no
automático. Bora nessa?
```

**Toque 2 — depois do CTA da aula/oferta, antes do Ketsu.** Pedido completo e específico. O comentário puxa mais retenção de sessão que o like (gera resposta/thread), então sempre inclua uma pergunta pontual ligada ao episódio — nunca um "comenta aqui" genérico:

```
[CONVITE — Toque 2]
Se isso fez sentido pra você, comenta aqui embaixo: <pergunta específica do episódio>.
Eu leio e respondo. E se quiser receber o próximo código antes de todo mundo, é só seguir o
canal e deixar o like nesse vídeo — é isso que faz essa mensagem chegar em mais gente como
você e como eu.
```

Regra: o Toque 2 vem DEPOIS do CTA de venda (aula/oferta), nunca antes e nunca junto — pedidos de custo zero (like/seguir/comentar) e pedidos de decisão (comprar/assistir aula) competem pela mesma atenção; separar em sequência evita que um canibalize o outro. Nunca varie a estrutura das duas frases-ritual — varie só a pergunta do comentário no Toque 2 e a frase de conexão do Toque 1. É a repetição do padrão, não das palavras exatas, que constrói reconhecimento de marca.

### 6. Construa a abertura (Hook, 0–3 segundos)

A abertura do áudio bruto do NotebookLM quase nunca serve. Substitua por uma abertura que:

- Deixa claro em 1–2 frases **o que o espectador vai sentir/entender ao assistir**.
- Abre uma **Lacuna de Curiosidade**: informação suficiente pra pessoa perceber que não sabe algo específico — nunca a resposta completa.
- Puxa de uma **dor semelhante**, não da dor/produto direto.
- Evita: explicar o mecanismo, "vou te contar uma curiosidade" sem ângulo, prometer o resultado antes de mostrar o problema.

Se a conversa original já tem uma frase que cumpre isso naturalmente, puxe ela pra abertura.

### 7. Estrutura do corpo — Kishotenketsu no monólogo

- **KI (abertura)** — hook (passo 6) + Identidade + Toque 1 (passos 4–5). O início deve ser emocionalmente turbulento: o primeiro vídeo (cold open) e o hook carregam a sensação do que está sendo dito.
- **SHO (desenvolvimento)** — Elvis constrói o problema com o espectador, com exemplos, sem ainda entregar a virada completa.
- **TEN (virada)** — o insight central, a reinterpretação, o "ah, é por isso que...". Aqui o vídeo entrega o valor prometido no hook.
- **KETSU (fechamento)** — reforço do que foi entendido + CTA de oferta (se houver) + Toque 2 + fechamento.

Não force os quatro blocos em proporções rígidas — um vídeo longo pode ter vários ciclos menores de KI-SHO-TEN (um por sub-tópico), com um KETSU só no final.

### 8. Marque as quebras de padrão

Marque `[QUEBRA DE PADRÃO]` com sugestão curta pro editor/gravação nos pontos estruturais reais: toda vez que o assunto muda, toda vez que a conversa desacelera, e pelo menos uma vez a cada 60–90 segundos de fala contínua em vídeos longos. Não force isso a cada poucas frases. Essa tag é sobre RITMO DE CORTE (mudança de plano, tom, energia) — diferente da tag do passo 9, que é sobre REFERÊNCIA VISUAL/B-ROLL específica.

### 9. Referências Visuais — o Documentário (obrigatório, ritual fixo)

Elvis grava pensando em formato documental: corta pra fora do seu rosto pra mostrar a referência do que está sendo dito, e volta pra você. Isso é o gancho visual que segura o cliente de alma — ele adora ver a referência concreta pra depois pesquisar por conta própria. Marque isso com a tag `[REF. VISUAL: <descrição>]`, sempre na linha exata onde a referência é falada. Regras:

- **Toda primeira menção de um pesquisador/autor nomeado** → `[REF. VISUAL: foto de <nome>]`. Se um livro específico foi citado, acrescente `+ capa de "<título do livro>"` e dê preferência à CAPA EM PORTUGUÊS (edição brasileira); a montagem autor + capa é criada no slide (passo 19).
- **Todo conceito, objeto ou texto antigo nomeado** que tenha uma imagem real associável (Zohar, hieróglifo, dupla-hélice de DNA, símbolo cabalístico, mapa arqueológico) → `[REF. VISUAL: imagem de <conceito/objeto>]`.
- **Frase que carrega o peso do bloco** (não toda frase — só a que resume a virada daquele trecho) → `[TEXTO NA TELA: "<frase exata, palavra por palavra>"]`. Frase errada ou parafraseada na tela quebra a confiança de quem pausa pra ler. Nunca invente texto de tela que não seja fala do roteiro.
- **Volta pro rosto** depois de 2–4 segundos de cada corte de referência — nunca deixe o B-roll rolar solto por mais tempo que isso. É a sua presença na tela que sustenta a intimidade de "conversando com uma pessoa só"; documentário demais sem voltar pra você perde esse vínculo.
- Não precisa de referência visual em toda frase — só nos pontos com nome próprio, conceito nomeável ou frase de virada. Excesso de corte cansa tanto quanto falta de corte.
- **Realidade antes de ilustração:** Elvis prefere trazer a realidade para o documentário. Use imagens VERDADEIRAS e livres de direitos (domínio público ou Creative Commons) sempre que existirem; imagem gerada por IA só para conceitos que não têm imagem real (ver passos 17 e 18).

### 10. Posicione o CTA de oferta — o Limiar

Quando houver uma oferta real (aula, curso, produto do Instituto) para promover:

- **Nunca antes do TEN.** Só depois que o espectador passou por Reconhecimento e Reinterpretação.
- **Estrutura do CTA padrão do canal (3 partes, não encurte):**
  1. Um parágrafo que NOMEIA o problema, ligado ao tema do episódio. Modelo do episódio 1: "Só que aqui mora um problema que eu preciso te nomear: você pode saber exatamente o que fazer — decorar o código inteiro que eu acabei de te mostrar — e ainda assim perder o acesso ao que sabe bem na hora que a conversa mais importa." Adapte o primeiro trecho ao assunto de cada episódio (no episódio 2, a ponte foi "o Adão não perdeu o conhecimento, perdeu o acesso").
  2. A apresentação da aula com a copy real: "Eu tenho uma aula que decifra exatamente por que isso te acontece: por que estudar mais pode aumentar a sua consciência sem aumentar a sua capacidade de agir, o que faz suas palavras e sua direção desaparecerem justamente nas conversas que mais pesam, e como transformar o que você sabe numa habilidade recuperável — sem script engessado, sem pressão, sem personagem comercial."
  3. A chamada final, sempre: "Clica no link da descrição e assiste." (sempre "link da descrição", nunca "link da bio"; confira que o link está de fato na descrição.)
- **Use a copy real da oferta**, verbatim ou adaptada — nunca invente o que ela entrega.
- **Repetição só com informação nova**, se repetir mais adiante.
- **Gatilho consciente, não reptiliano.** Nunca medo fabricado, escassez ou urgência falsa.
- **Onde:** logo depois do TEN, seguido do Toque 2 do Convite de Engajamento, depois o Ketsu.

Se não houver oferta específica no episódio, pule direto do TEN pro Toque 2 e o Ketsu.

### 11. Vocabulário e ética (Código Galifrael)

| Nunca use | Use em vez |
|---|---|
| arsenal | sistema |
| controle total | clareza completa |
| hackear | otimizar / organizar |
| manipular | conduzir |
| truque | estrutura / técnica |
| forçar | alinhar |
| pressionar | convidar / conduzir |
| empurrar venda | criar as condições para a decisão |
| segredo sujo | princípio pouco conhecido |

Evite sempre: promessas milagrosas ou garantidas, dinheiro fácil, misticismo exagerado, marketing agressivo, apelo ao "cérebro reptiliano", escassez ou urgência falsa, clickbait que promete algo que o vídeo não entrega.

Se fizer sentido, use com naturalidade palavras do vocabulário de alta conversão do Instituto: resultado, clareza, estrutura, consciência, presença, coerência, natural, autêntico, prático, concreto, alinhado, ponte, decisão, transformação, campo, arquitetura, identidade, conduzir, confiança. Vocabulário completo por código de ignição em `vocabulario-codigos.md`.

Respeite a **Regra do Nome Inteiro**: na primeira menção de qualquer ferramenta ou produto oficial do Instituto, use o nome completo — nunca abrevie na primeira aparição. Isso também vale pra GEO (passo 14) e pras Referências Visuais (passo 9): nomes de conceitos e pesquisadores devem aparecer grafados de forma idêntica no roteiro, na descrição e nos capítulos.

### 12. Formato de entrega do roteiro

```
[HOOK — 0:00]
(abertura reescrita, monólogo, primeira pessoa)

[IDENTIDADE]
(texto fixo do passo 4, com a frase de conexão do episódio)

[CONVITE — Toque 1]
(texto fixo do passo 5, Toque 1)

[BLOCO 1 — <tema>]
(monólogo)
[REF. VISUAL: <foto/capa/imagem de conceito, na linha exata da menção>]
[TEXTO NA TELA: "<frase de peso, se houver uma nesse bloco>"]
[QUEBRA DE PADRÃO: <sugestão de corte/plano/tom>]
...

[TEN — virada principal]
...

[CTA — <onde e por quê, se houver oferta>]
"<texto exato do CTA, nas 3 partes do passo 10>"

[CONVITE — Toque 2]
(texto do passo 5, Toque 2, com pergunta específica do episódio)

[KETSU / FECHAMENTO]
...
```

Mantenha o conteúdo factual fiel ao que foi dito na transcrição original — você está reescrevendo enquadramento, corte, ordem e fusão de vozes, não o conteúdo. Se cortar um trecho inteiro, avise Elvis num resumo curto nas Notas de produção ("cortei X porque Y"); prefira manter os detalhes de pesquisa a cortá-los.

## Processo — Parte 2: o Pacote de Publicação (SEMPRE, sem perguntar)

Elvis pediu pra receber isso junto com todo roteiro, sem precisar pedir de novo. Entregue as peças abaixo depois do roteiro, sempre: título, descrição, capítulos, thumbnail (passos 13 a 16) e o plano visual com slides de edição (passos 17 a 19).

### 13. Título (SEO)

Entregue 1 título principal + 2 alternativas pra teste A/B. Regras:
- Palavra-chave central do tema (o termo que a pessoa buscaria) sempre presente.
- Gancho real, sem clickbait vazio — o título tem que corresponder ao que o vídeo entrega.
- Pode incluir "Aqui Agora PodPoc" no final quando fizer sentido pra marca, mas isso é secundário ao gancho.

### 14. Descrição em formato pergunta-resposta (AEO/GEO)

AEO (Answer Engine Optimization) e GEO (Generative Engine Optimization) significam escrever pra ser citado por buscadores de IA, não só indexado pelo Google. Isso exige:
- Abrir com o CTA da aula no topo, com o link por extenso (a aula é citada no vídeo como "link da descrição"), seguido de 1–2 frases de gancho (aparecem no snippet de busca).
- 4–6 perguntas reais que alguém faria sobre o tema, cada uma com resposta direta e autocontida em 1–3 frases (uma IA de busca deve conseguir extrair a resposta sem precisar do resto do texto), mais uma pergunta própria "Onde assisto à aula gratuita citada no vídeo?" com o link e a copy real da aula.
- Nomes de pesquisadores, conceitos e termos técnicos grafados de forma idêntica ao roteiro — grafia inconsistente quebra a correspondência de entidade que os motores de busca de IA usam pra citar a fonte.
- Quando relevante, distinguir o que é dado (ex.: o DNA tem quatro bases) do que é interpretação espiritual, atribuindo a leitura à fonte ("é a leitura de Braden"), sem acrescentar ressalvas de autoria própria nem apresentar crença como fato.
- Terminar com a lista de capítulos (passo 15), o nome do Instituto Galifrael e Elvis Pimentel, e hashtags relevantes ao tema (3–6, sem exagerar).

### 15. Lista de capítulos

Um capítulo por bloco/beat estrutural do roteiro (não um por frase). Nomenclatura exata dos conceitos do Instituto e dos temas do episódio — título de capítulo vago ("Parte 2", "Continuação") perde indexação em resposta de IA. Estime o tempo proporcionalmente ao tamanho de cada bloco no roteiro quando não houver gravação real ainda (cerca de 145 palavras por minuto), e avise que é estimativa a ajustar na edição. Se o roteiro mudar, refaça os tempos.

### 16. Prompt de thumbnail

O cliente de alma do Aqui Agora PodPoc reage a rosto real + contraste de mundos, não a ilustração genérica de "mistica". Fórmula fixa a seguir:

- **Rosto em primeiro plano**, expressão de revelação/desconforto — sobrancelhas levemente franzidas, olhos arregalados olhando pra câmera, boca semiaberta processando uma descoberta. Nunca sorriso — sorriso não comunica descoberta perturbadora.
- **Contraste de dois mundos** dividindo o quadro: um lado familiar/cotidiano ligado ao tema do episódio (o objeto, texto ou hábito comum sendo decifrado), outro lado com um elemento visual do "código oculto" (geometria sagrada, campo de energia, padrão luminoso) — sutil e quase holográfico, nunca cartunesco ou "neon de app".
- **Sem texto na imagem** (o texto do título entra depois, no editor, curto e fora do rosto).
- **Paleta do canal**, unificada com o Instituto: azul profundo #1A3A5C, ouro #B8860B, lilás #5C4A8A, branco e cinza escuro #1A1A2E.
- **Evitar sempre**: terceiro olho desenhado, mandala genérica, roxo neon de app de meditação, qualquer cliché espiritual de banco de imagem.

Escreva o prompt final adaptando esses elementos ao tema específico do episódio (qual objeto/hábito cotidiano contrasta com qual elemento do código oculto revelado).

### 17. Plano visual: prompts de vídeo e padrão de documentário (SEMPRE entregar)

Todo episódio sai com os prompts para gerar os vídeos que se intercalam entre texto e imagens. Eles vivem numa seção própria do documento do episódio, com cada prompt em bloco de código, em inglês (16:9, sem texto, sem rosto reconhecível), na paleta do canal.

**Padrão do canal (inspirado no estilo de "Alienígenas do Passado", do History Channel):**

| Quando Elvis... | O visual é... |
|---|---|
| explica um conceito | vídeo personalizado (prompt gerado) |
| cita um autor ou fonte | foto real do autor + legenda (nome, obra, ano); capa em português montada no slide; ou, com cuidado, trecho curto de palestra pública do autor com análise por cima |
| cita um texto antigo | imagem real do manuscrito ou gravura, com o trecho destacado |
| traz um dado científico | animação ou imagem real com a fonte na legenda |
| dá uma leitura ou hipótese | Elvis em câmera |
| abre o episódio | vídeo turbulento (cold open) ANTES do hook; depois a abertura fixa P1/P2 |

Regras: o primeiro vídeo (cold open) é emocionalmente turbulento, de acordo com o Kishotenketsu, e traduz em imagem o que o hook diz; o Bloco 1 pede vídeo personalizado; cada explicação de conceito ganha o seu. Ritmo a testar (heurística, não fonte verificada): troca de visual a cada 3 a 6 segundos, Elvis em câmera 8 a 20 segundos, silêncio de 1 a 2 segundos antes de revelação, música baixa que cai na pergunta; calibrar pela retenção do YouTube Analytics. Não copie os vícios da série de referência (entrevista fora de contexto, empilhar "evidências" rápido demais). Vídeo do próprio autor falando: só trecho curto com análise por cima, e avisar que crédito sozinho não protege (fair use do YouTube; no Brasil, Lei 9.610/98, art. 46, a confirmar).

### 18. Imagens reais livres de direitos (SEMPRE entregar)

Para cada [REF. VISUAL] entregue uma tabela: referência, fonte com URL, licença exata e status. Prefira domínio público ou Creative Commons de Wikimedia Commons, Internet Archive, NASA, Met Museum, NYPL, Wellcome, bibliotecas e museus. NUNCA invente URL: só liste o que foi aberto e verificado; o que não pôde ser aberto (o Wikimedia pode estar bloqueado na ferramenta) vai como "conferir no Commons", com o termo de busca. Pessoas vivas e autores recentes normalmente não têm foto livre: indique o caminho legal (site oficial, press kit, pedir autorização) e diga "sem imagem livre". Capas de livros são protegidas: só citação ou resenha, com crédito. Quando não existir imagem real (ex.: um diagrama), sugira redesenhar ou, em último caso, um prompt de imagem.

### 19. Slides de edição (SEMPRE entregar, após roteiro e pacote)

Depois do roteiro e do pacote, entregue o deck de slides para a edição, criado a partir do tipo Slides (paleta do canal; fontes EB Garamond e DM Sans). Um slide por corte: (a) cada [TEXTO NA TELA], com a frase EXATA da fala; (b) cada autor: espaço para a foto + legenda (nome, obra, ano) e, quando há livro, espaço para a CAPA EM PORTUGUÊS montada ao lado; (c) imagens de texto antigo; (d) diagramas (ex.: as quatro fases, mapa de elementos e letras); (e) os convites Toque 1 e Toque 2 e o CTA. As imagens reais entram nos espaços marcados (a fonte vai escrita no espaço e nas notas do slide); não invente texto de tela. Texto mínimo de 24 px.

**Onde fazer:** o deck e o documento podem ser feitos direto no Claude (tipo Slides). O Claude Code, no terminal, compensa quando for preciso automatizar o pipeline repetido (baixar imagens livres, montar .pptx, versionar no GitHub); se Elvis pedir, entregue junto um prompt pronto para colar no Claude Code com a estrutura do deck e a lista de fontes.

## Quando algo não fechar

Se a transcrição não tiver material suficiente para um hook forte, ou se o "plot twist" da conversa for fraco/confuso, diga isso direto ao Elvis em vez de forçar um gancho artificial por cima de um conteúdo fraco. Sugira que a gravação ou trecho precisa ser refeito antes de virar vídeo.