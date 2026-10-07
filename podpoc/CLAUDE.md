# Podcast Aqui Agora PodPoc — Estúdio de episódios (Elvis Pimentel)

Canal estilo documentário (Discovery / History Channel) que desmistifica a realidade e devolve o poder a quem está despertando. Elvis fala sozinho para a câmera, com cortes de referência visual. Todo episódio vira: roteiro + pacote de publicação + overlays animados prontos para a timeline.

## Regra de ouro de trabalho
- Elvis tem pouco tempo. Não faça perguntas que você mesmo pode resolver. Decida, registre a decisão no relatório e siga.
- Só pare para perguntar quando faltar algo que só ele tem (foto autorizada, link, nome de pesquisador).
- Idioma: português do Brasil em tudo que ele lê. Código e comentários podem ser em inglês.

## Voz e conteúdo (não negociar)
- Use a skill `youtube-podcast-para-video-galifrael` para tudo que for roteiro, título, descrição, capítulos e thumbnail. Ela é a fonte da verdade.
- Texto na tela = frase exata falada no roteiro. Nunca invente texto de tela.
- Só adaptar a pesquisa do texto-fonte. Sem ressalvas ou opinião nossa dentro da fala.
- Grafias fixas: Gregg Braden, Marcelo Del Debbio, Éliphas Lévi, Deepak Sankara Veda, Qlippoth, Ana Bekoach, Yod, Heh, Vav.
- Identidade fixa (igual em todo episódio): "Engenheiro e Pesquisador da Consciência, fazendo parte do Sacerdócio da Ordem de Melquisedeque". "Instituto Galifrael" (nunca "Galifriel").
- Posicionamento: referência em pesquisa que desmistifica a realidade e lembra a humanidade quem ela realmente é.

## Identidade visual (design atual, nada de século passado)
- Paleta: azul profundo #1A3A5C, ouro #B8860B (texto sobre escuro: #E0B84F), lilás #5C4A8A, cinza escuro #1A1A2E, off-white #F2EEE4. Sem roxo neon, sem mandala genérica, sem clichê espiritual de banco de imagem.
- Tipografia: Instrument Serif (títulos) + Inter (apoio), via Google Fonts. Texto mínimo 48 px em tela cheia 1080p e 36 px em legendas.
- Linguagem de movimento: cinematográfico e sóbrio. Easing suave (spring amortecido), entradas por máscara e revelação de palavra, parallax leve em imagens de arquivo, grain de filme sutil (3 a 6%), vinheta leve, tratamento duotone azul/ouro unificando as imagens de arquivo.
- Lower third minimalista: nome em serifa, obra e ano em sans pequeno, barra fina ouro. Entra em 0,4 s, fica 3 a 4 s, sai com fade.
- Enquadramento: Elvis grava em fundo verde e fica no CANTO INFERIOR DIREITO do quadro (zona reservada x ≥ 1180, y ≥ 460 em 1920x1080; constante `ELVIS` em `remotion/src/theme.ts`). Textos, lower thirds, fotos e capas ficam à esquerda dessa zona. Diagramas e cortes de arquivo ficam COMPLETOS e centralizados, sob a camada do Elvis (ele grava por cima, em chroma key; se quiser, tira a si mesmo na edição). Isso é de propósito: é o formato de interação com o fundo.
- Textos na tela: palavra por palavra no ritmo da fala, até 2 linhas (3 só nas frases muito longas), fora da zona do Elvis.
- Ritmo: trocar o visual a cada 3 a 6 s, voltar ao rosto em 2 a 4 s após cada corte de referência. Heurística: calibrar pela retenção do YouTube Analytics.
- Barra de capítulos discreta no rodapé como opção (desligável).
- Formato: 1920x1080, 30 fps, overlays com canal alfa.

## Imagens: realidade antes de ilustração
- Prefira imagem VERDADEIRA e livre de direitos (domínio público ou Creative Commons): Wikimedia Commons, Internet Archive, Met Museum Open Access, NYPL, Wellcome, NASA, bibliotecas e museus.
- Ao baixar do Wikimedia Commons, use a API (action=query, prop=imageinfo, iiprop=extmetadata|url) e grave autor, licença e URL de origem em `assets/credits.json`. Se a licença não for livre, não use: marque como pendente.
- Pessoas vivas e autores recentes: crie um quadro "PEDIR AUTORIZAÇÃO" com a fonte oficial e liste no relatório. Nunca use foto sem licença como se fosse livre.
- Capas de livros: sempre a edição em português. Baixe a imagem oficial da página da editora ou loja, registre a origem e marque "uso por citação, crédito à editora". Liste no relatório para Elvis aprovar.
- Imagem gerada por IA só para conceito sem imagem real, e rotulada "recriação ilustrativa" no relatório.
- Gere um bloco "Créditos das imagens" pronto para colar na descrição do YouTube.

## Definição de pronto
1. Todos os overlays renderizados em `episodios/epNN/render/` com nome igual ao id do roteiro.
2. `credits.json` + bloco de créditos para a descrição.
3. `prompts-video.md` com os prompts de vídeo e o nome de arquivo esperado de cada um.
4. Lista de marcadores da timeline (CSV e EDL) com tempo estimado.
5. Um frame de cada overlay renderizado e conferido (legibilidade, contraste, zona segura).
6. Commit na branch `epNN` e relatório curto em português com o que ficou pendente.
