# Changelog — Autorretrato do Jogador
**RPG — O Jogador Consciente**

Formato: `v0.MENOR.CORREÇÃO`. Menor sobe a cada entrega com mudança de experiência;
correção sobe em ajuste pontual. A `v1.0.0` fica reservada para o dia em que a
Etapa 7 estiver no ar com a aula gravada e o backend recebendo os eventos.

---

## v0.10.0 — 29/08/2026 · Backend de verdade
- **Supabase ligado.** Tabelas `players`, `events`, `admin_users`, `admin_notes`; views `v_funil`, `v_jogadores`, `v_eventos_por_dia`.
- **O navegador nunca toca nas tabelas.** RLS ligada sem política pública: negado por padrão. Tudo entra por Edge Function com chave de serviço — evita o erro clássico de dar `insert` para a chave pública.
- Edge Function `ingestao`: recebe o jogador e a fila de eventos, com validação de formato, teto de 300 eventos e upsert por `event_id` (reenviar a mesma fila não duplica).
- Edge Function `enviar-ficha`: Resend, com o destinatário vindo **sempre da tabela** e nunca do corpo da requisição, respeito ao consentimento gravado e freio de 3 minutos contra rajada.
- Front-end sincroniza 4 s depois de cada evento e ao sair da aba. **Falha não trava nada**: a fila só é limpa do que o servidor confirmou.
- Botão de e-mail passou a enviar de verdade, com mensagem honesta em cada modo de falha.
- Auditoria de segurança do Supabase: zero alertas.

## v0.9.2 — 29/08/2026 · A história em atos
- **Fim do reajuste de linha.** Os caracteres agora entram todos de uma vez, invisíveis, e vão sendo revelados. A frase já nasce com a quebra definitiva — nenhuma palavra pula de linha durante a digitação. Era isso que fazia o olho perder a linha. O cursor tem largura zero para não empurrar nada.
- **Digitação mais lenta de novo**: 22 → 17 caracteres por segundo (sistema 17 → 14).
- **A etapa 6A virou atos.** Um movimento por vez, tela limpa a cada Continuar. Ninguém é arrastado: a pessoa segue quando quiser, e o ato inteiro fica legível (nada escurece dentro dele).
- **As cartas entraram na narração**: o arcano aparece no ato "A sua carta", a carta de tipo no ato "E o que você diz de você".
- **A Ficha leva as duas imagens** — arcano e tipo.
- Imagens deixaram de ser preguiçosas: são duas por jogador, e imagem não carregada virava página em branco no PDF.
- **Baixar a ficha em PDF** gera arquivo de verdade (`Ficha-Nome.pdf`), com a biblioteca buscada só no primeiro clique. Se ela não vier, cai para a impressão do navegador com aviso claro. Testado o caminho de falha: mensagem correta, botão reabilitado, zero erro.
- Corrigido: o rodapé "toque para adiantar" cobria o botão Continuar em atos longos.

## v0.9.1 — 29/08/2026 · As cartas entraram
- **54 cartas no Supabase Storage**, bucket `assets` público de leitura e escrita fechada. Cada jogador baixa **duas**: o arcano dele e o tipo dele. Se a imagem falhar, a carta tipográfica assume e ninguém vê buraco.
- A arte já traz número e nome, então o texto embaixo some quando a imagem carrega — repetir seria ruído.
- Carta de tipo flexionada por gênero: `rpg_ojc_tipo_intj_f.webp` / `_m.webp`.
- **Digitação 25% mais lenta** (30 → 22 caracteres por segundo; sistema 22 → 17).
- **Bug do "toque para adiantar" corrigido.** A camada de clique estava com z-index abaixo do conteúdo — o toque no meio da tela nunca a alcançava. Agora o overlay inteiro escuta, ignorando botões.
- **Instalado na tela de início, os botões Som e Pular ficavam debaixo do relógio e da bateria.** Sem barra do navegador não havia folga; agora toda a interface respeita `env(safe-area-inset-*)`.
- Carimbo de versão saiu de fixo e entrou no fluxo — preso na tela, ele cobria o botão quando a página rolava.

## v0.8.0 — 29/08/2026 · O jogo virou jogo
**Lei nova do projeto: preto = o jogo fala · branco = você fala.**

- **Bug que escondia as atualizações:** a sessão salva devolvia a pessoa para onde ela tinha parado, então as telas novas nunca apareciam — parecia que nada tinha mudado. O estado agora guarda a versão; ao trocar de versão, os dados são preservados e o percurso recomeça.
- **Tudo digita.** A digitação deixou de ser enfeite das frases de sistema e virou o próprio ritmo, a 30 caracteres por segundo — perto da velocidade de leitura, para a pessoa ler acompanhando. Sumiu a pausa de leitura separada: era ela que fazia parecer lento.
- **Som integrado** (estava só no protótipo): atmosfera contínua, toque grave na entrada, textura de digitação e acorde no fecho — tudo sintetizado, sem arquivo, desligado por padrão, botão no topo.
- **Etapas 6 e 7 no escuro.** A história é contada bloco a bloco, com o título de cada movimento em latão. No escuro entram as aberturas e os fechos de cada movimento; a história inteira vive na Ficha — digitar as 1.200 palavras levaria sete minutos e viraria prova de resistência.
- **A Ficha virou item.** "A Ficha do Jogador / da Jogadora" — história e dados no mesmo documento, aberta por cima do jogo, lida e fechada sem sair do mundo. Salvar em PDF, copiar e pedir por e-mail vivem dentro dela.
- **Carimbo de chegada:** ao dar o nome, o sistema responde com o nome, o dia da semana, a data e a hora com segundos. Sem explicar — a semente dos portais fica plantada.
- **A tese do RPG** aparece na Etapa 7: *"Você já está interpretando um papel. A pergunta é se ele foi escolhido por você."*
- Campo de reflexão passou para o fluxo, em caixa clara sobre o escuro — a voz da pessoa.
- Eventos novos: `portal_aberto`, `ficha_opened`, `sound_enabled`, `sound_disabled`.
- Regressão: 12/12 datas idênticas. História no escuro em 74 s, ou um toque.

## v0.7.0 — 29/08/2026 · O jogo fala com quem está jogando
- **Escolha de tratamento** dentro do Modo de Instrução, logo após `SESSÃO INICIADA`: *"Como o jogo vai te chamar?"* — Jogador · Jogadora · prefiro não dizer.
- Ao escolher, **o título do jogo assume a forma escolhida** na própria tela escura: `RPG · A JOGADORA CONSCIENTE`. É o momento em que a pessoa vê que o jogo é dela.
- Flexão aplicada em toda a apresentação: marca, rótulos, tipo áurico (Geradora Manifestante, Projetora, Refletora, Manifestadora), perfil (Investigadora, Ermitã), assinatura, consentimento e carimbo do PDF. **O motor de cálculo não foi tocado.**
- Campo do nome deixou de pedir a certidão: agora é *"Como você quer ser chamado / chamada"*, com o nome que a pessoa usa.
- Frases que traíam gênero reescritas sem marca ("Foi reconhecido" → "O jogo te reconheceu"; "não responde sozinho" → "não responde por conta própria").
- A escolha não pode ser pulada nem adiantada por toque — é resposta da pessoa, não animação.
- Evento novo: `gender_selected`.

## v0.6.3 — 29/08/2026 · dois bugs de publicação
- **Tela ora pequena ora grande** no bloco do site: o app agora detecta que está embutido e para de medir a janela — a moldura se ajusta ao conteúdo, e não o contrário.
- **Piscada de volta ao cartaz** ao iniciar: a tela seguinte passou a ser montada atrás do escuro, e só então o escuro se dissolve. Quem já viu a abertura recebe um escurecer curto em vez de corte seco.

## v0.6.2 — 29/08/2026
- Clique do cartaz por delegação, imune a HTML recriado por construtor de site.
- Faixa de socorro visível se algo quebrar antes da tela montar.
- Modo `?diag=1` com relatório do ambiente.

## v0.6.1 — 29/08/2026 · correção de altura em página incorporada
- **Bug:** publicado dentro de um bloco de HTML de construtor de site (Hostinger), o cartaz esticava sem fim. Causa: o quadro se ajusta à altura do conteúdo, o conteúdo usava `100vh`/`100svh`, e um alimentava o outro num ciclo infinito. Reproduzido em teste: 1158 → 1860 → 2508 → 3210px, sem parar.
- **Correção:** nenhuma unidade de viewport no fluxo do documento. A altura da janela é medida uma vez, em pixels, limitada entre 560 e 1000, e exposta como `--vph`. Só recalcula ao girar o aparelho. Com o ciclo quebrado, a altura estabiliza no primeiro instante.
- Fallback em pixels para cada regra, caso o JavaScript não rode.
- `html{overflow-x:hidden}`.

## v0.6.0 — 29/08/2026 · Modo de Instrução
- **Cartaz de entrada**: tela preta, título em monoespaçada, botão Iniciar e nada mais. Sem espera — a sequência é recompensa por ter clicado, não pedágio.
- Rodapé do cartaz: *"Você teria oito minutos para dedicar a você? É de graça."*
- **Modo de Instrução**: motor de revelação por blocos, duas vozes (sistema em mono, voz em serifa), janela de três blocos, ritmo por número de palavras entre 112 e 172 ppm (Brysbaert 2019). Roda na abertura e na entrada da Etapa 7.
- Controles: toque adianta, botão Pular sempre visível, `prefers-reduced-motion` respeitado, uma vez por jogador.
- **Etapa 1 em dois tempos**: nome, depois data. A barra continua dizendo 1 de 7.
- **Âncora vertical fixa** nas etapas 1, 2, 3 e 5 — a pergunta nasce sempre na mesma altura (COGA 4.2.2).
- Removidas as linhas que narravam o próprio funcionamento da interface.
- Metas de app instalável: `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app`.
- Eventos novos: `instruction_mode_started`, `instruction_completed`, `instruction_skipped`, `initial_instructions_started`, `name_completed`.
- Regressão: 12/12 datas idênticas. Impressão, temas e mobile sem alteração.

## v0.5.0 — 29/08/2026 · Fase 1
- Marca **RPG — O Jogador Consciente**, subtítulo *O jogo da sua vida profissional* (8 substituições classificadas; "O Jogo da Vida" preservado como universo narrativo)
- Data de nascimento em Dia / Mês / Ano — fim do calendário nativo
- Pista de Contribuição fundida à transição final da Etapa 6
- **Etapa 7 — Instruções Iniciais** (nome funcional da aula de ~12 min)
- Campo opcional de reflexão, citado de volta na Etapa 7
- `player_id`, `session_id`, UTM com first/last touch, fila local de 13 eventos
- Auditoria de hipótese: 8 pontos onde interpretação simbólica virava afirmação
- Fim da entrega fictícia de e-mail
- Regressão: 12/12 datas idênticas ao motor original

## v0.4.0 — 27/08/2026
- Corrigida a duplicação da tela 6B ("Como você funciona" × "Ficha do Avatar")
- P.S. no topo da 6B

## v0.3.0 — 26/08/2026
- Narrativa reescrita no tom oficial do projeto
- Aula marcada como "Em breve", sem data
- Ficha do Avatar completa: cruz, quarter, variáveis, 26 ativações

## v0.2.0 — 25/08/2026
- Cruz da Encarnação com ângulo, geometria e quarter
- Casa em vez de grau; explicação das 12 casas
- Consentimentos LGPD, PDF, glossários

## v0.1.0 — 25/08/2026
- Motor de oráculos próprio (astronomy-engine, sem dependência externa)
- Sete etapas, autorretrato gerado como história
- 5.570 municípios com fuso IANA recalculado

---

## Próximas
- **v0.7.0** — Fase 2: backend, eventos reais, e-mail de verdade
- **v0.8.0** — Fase 3: painel administrativo em subdomínio

## v0.11.0 — 02/09/2026
- **Cidades do mundo.** 170.911 cidades de 246 países no Supabase (GeoNames cities1000),
  cada uma com fuso IANA próprio. Busca por nome em português nas cidades grandes
  ("Tóquio", "Nova York", "Londres", "Genebra" → a cidade certa).
- **Autocomplete híbrido.** Brasil resolve na hora, offline, pela lista embutida
  (5.570 municípios). O mundo entra pelo servidor, com atraso de 280 ms.
  Servidor fora do ar = lista do Brasil intacta; o campo nunca trava.
- Ordenação corrigida: "começa com" antes de "contém" ("lisb" → Lisboa, não Felisburgo).
- Fuso passou a exibir qualquer região (`Europe/Lisbon`, `Asia/Tokyo`), não só `America/`.
- **Ponte para a planilha do Google.** Gatilho em `players` → fila → função `planilha`
  → Apps Script, a cada minuto. Falta só a URL da planilha.
- Motor astronômico intocado. Regressão de 12 datas: idêntica.

## v0.11.1 — 03/09/2026
- **PDF consertado.** A Ficha vive num painel `position:fixed` que rola por dentro;
  fotografá-la no lugar capturava só o pedaço visível — era o "print da tela do celular".
  Agora ela é clonada para fora do painel, em largura fixa e altura livre, e o clone
  inteiro é fotografado. Medido: ficha de 11.217 px de altura, 562 px visíveis no celular
  → PDF de 10 páginas com o documento completo.
- Paginação refeita: cada página é uma fatia própria do canvas, em vez da imagem
  inteira deslocada. Menos memória no celular.
- As seções dobradas (`<details>`) abrem no arquivo — o PDF sai completo.
- E-mail da ficha: pedido de resposta em destaque e `Reply-To`. Resposta de quem
  recebe é o sinal mais forte que existe para aquecer domínio novo.

## v0.11.2 — 03/09/2026
- **Mensagens de fase de teste removidas.** Três textos que envelheceram junto com o produto:
  o aviso de que o Autorretrato só existia no navegador (existe backend desde a v0.10.0);
  o botão que dizia que o envio por e-mail "ainda não está no ar" (está); e o erro de
  chave ausente, que acusava o produto em vez de tratar como queda momentânea.
- Ícones do app gerados a partir da arte da porta: 192, 512, 512 maskable, apple-touch e favicons.
- Manifest com as cores reais da marca (#141D24) e o ícone maskable próprio.
- **Continua no ar de propósito:** "Em breve" na Etapa 7. A aula existe mas ainda está
  em edição — mudar esse texto antes do vídeo entrar seria mentir para o jogador.

## v0.12.0 — 15/09/2026 — a Etapa 7 de verdade
- **O vídeo entrou.** Player do Panda embutido em 9:16, abrindo em tela cheia ao toque
  (`playOpensFullscreenNative`). Fim do player simulado.
- **A oferta abre aos 16min50.** Não é escassez: é para a pessoa decidir depois de
  entender, não durante. Dois caminhos de medição — a API do Panda (precisa, respeita
  pausa e avanço) e um relógio de parede como reserva, para a oferta nunca ficar presa
  se a API não vier.
- **A Imersão explicada em onze etapas, cada uma com ponto A e ponto B** — onde a pessoa
  entra e de onde ela sai. Mais Bússola Diária, Diário da Forja e Guardião.
- **Dois checkouts da Cakto, embutidos, sem sair do app** — trimestral e anual, cada um
  no seu botão. Fim da ambiguidade do order bump.
- **Checkout pré-preenchido** com nome, e-mail e WhatsApp que a pessoa já deu no jogo
  (`name`, `email`, `confirmEmail`, `phone` com +55). Menos campo, menos desistência.
- `?porta=10` na URL abre a oferta em 10 segundos, para conferir sem assistir 17 minutos.
- Corrigida colisão de CSS: já existia uma classe `.oferta` de outra tela, que jogava a
  seção inteira em flex-row e criava rolagem horizontal de 1.247px. Renomeada.
- Eventos novos no funil: `immersion_offer_viewed`, `checkout_clicked` (com o plano),
  `initial_instructions_play`. Os três já estavam esperando na Sala de Comando.
- Motor intocado. Regressão de 12 datas: idêntica.

## v0.12.1 — 15/09/2026 — sete correções
- **As cartas voltaram a aparecer na jornada.** A janela deslizante guardava só três
  blocos, e um ato tem quatro (título + carta + duas falas): a carta era a segunda e
  era removida antes de ser vista. No modo de atos a tela já é limpa a cada Continuar,
  então a poda foi desligada. A carta também espera carregar antes de o ato seguir
  (teto de 4s) e as duas imagens começam a ser buscadas no início da história.
- **PDF não deixa mais a tela branca no celular.** O canvas estourava o teto do aparelho
  (o iPhone corta acima de ~16,7 milhões de pixels e devolve imagem vazia). A escala
  agora é calculada para caber, e a caixa temporária deixou de esticar o documento.
- **Etapa 6B recebeu o texto de abertura** ("RPG quer dizer...") antes do P.S.
- **Etapa 7 ficou só com a chamada e o play.** Sem texto repetido.
- **A frase da reflexão aparece uma vez só** — onde está a caixa de digitar.
- **Preload do Panda no `<head>`** — o vídeo começa a ser buscado junto com a página.
- **Mensagem de erro do e-mail passou a dizer a verdade:** o problema é do lado de cá.
- Motor intocado. Regressão de 12 datas: idêntica.

## v0.12.3 — 15/09/2026
- **"Recomeçar" não existe mais na Etapa 7.** Quem chegou ali investiu vinte minutos;
  um toque sem querer apagaria tudo. O botão some pelo CSS, marcado por `data-etapa`.
- **A tela travada acabou de esticar.** O atributo `hidden` da oferta estava sendo
  vencido pelo `display:block` do CSS: a seção ficava invisível mas ocupando
  **4.554 px de rolagem preta** embaixo do vídeo. Com `[hidden]{display:none!important}`
  a tela agora termina onde o vídeo termina — 178 px de sobra em vez de 4.554.
- **O checkout ganhou tela própria.** Saiu a caixa espremida dentro da oferta; entrou
  uma tela cheia por cima do jogo, com o plano escolhido no topo, o pagamento ocupando
  todo o resto e um Voltar. Se a Cakto recusar ser embutida, aparece a saída em nova aba.
- Motor intocado. Regressão de 12 datas: idêntica.
