Leia o CLAUDE.md e o arquivo episodios/ep02/roteiro-e-pacote.md. Execute tudo abaixo sem me perguntar nada; registre decisões e pendências no relatório final.

CONTEXTO
Episódio 2 do Podcast Aqui Agora PodPoc: "O DNA humano oculto no Gênesis". O roteiro, os 11 prompts de vídeo (V1 a V11), a tabela de imagens e o pacote de publicação já estão no arquivo. Preciso do material de edição pronto para soltar na timeline, com visual atual e retenção alta.

ENTREGAS
1. Projeto de overlays animados com Remotion (React), 1920x1080, 30 fps, fundo transparente. Um overlay por [TEXTO NA TELA], por lower third de autor (nome, obra, ano), por diagrama (quatro fases do Zohar, mapa elementos e letras de Braden, caminho de Zayn de Binah a Tiferet), pelos convites Toque 1 e Toque 2 e pelo CTA. Exporte cada um em MOV ProRes 4444 ou WebM com alfa (confirme na documentação do Remotion qual codec preserva alfa e use o que funcionar), mais um PNG de pôster. Nomes: o id do slide do roteiro (ex.: q-mecanismo, braden, fases).
2. Autores com livro (Gregg Braden, Éliphas Lévi): composição foto + capa em português + lower third, em um único overlay.
3. Imagens reais livres: baixe as imagens listadas na tabela "Imagens reais para o documentário" do roteiro (Códice de Leningrado, Zohar 1558, Sefer Raziel 1700, gravura de Eva por Delaune, foto NASA AS11-40-5903, Árvore da Vida de 1650, Gray's Anatomy 1918, Blavatsky da NYPL). Use as APIs oficiais (Commons, Internet Archive, Met, NASA, NYPL). Para itens marcados "conferir no Commons" (Éliphas Lévi retrato, dupla hélice, etc.), procure e verifique a licença pela API. Salve em assets/ com tratamento duotone azul/ouro, grain e movimento Ken Burns com parallax. Grave autor, licença e origem em assets/credits.json.
4. Pessoas vivas (Braden, Del Debbio, Deepak Sankara Veda, Goddard, Bailey): crie o quadro "PEDIR AUTORIZAÇÃO" com a fonte oficial e liste no relatório. Capas em português: baixe a imagem oficial da página da editora ou loja (O Código de Deus, Cultrix; Dogma e Ritual de Alta Magia), registre a origem e marque como uso por citação.
5. prompts-video.md: os 11 prompts, o tempo estimado de entrada na timeline (use 145 palavras por minuto sobre o roteiro) e o nome de arquivo esperado (assets/video/V01.mp4 a V11.mp4). Quando esses arquivos existirem, monte automaticamente o corte de cobertura de cada um.
6. Marcadores da timeline: timeline.csv (id, tempo estimado, tipo, descrição) e um EDL CMX 3600 de marcadores. Inclua uma cue sheet de sound design (onde entra impacto, whoosh, silêncio de 2 a 3 s, queda de música), conforme as quebras de padrão do roteiro.
7. Opcional se existir episodios/ep02/audio.* ou vídeo final: gerar legendas dinâmicas palavra por palavra (Whisper local) como overlay com alfa, no mesmo estilo.
8. Bloco "Créditos das imagens" pronto para colar na descrição, e a descrição final do pacote atualizada com ele.

DESIGN
Siga o CLAUDE.md à risca. Referência de linguagem: documentário contemporâneo (revelação de palavra por máscara, spring amortecido, parallax suave, grain sutil, duotone), sem estética de apresentação de PowerPoint e sem clichê espiritual.

QUALIDADE
Renderize um frame de cada overlay e confira legibilidade, contraste (texto 4,5:1) e zona segura. Corrija o que falhar. Faça commit na branch ep02 com mensagens claras. No fim, escreva RELATORIO.md em português: o que foi gerado, o que está pendente e o que preciso fazer, em no máximo 15 linhas.
