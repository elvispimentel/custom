# Como usar os overlays no CapCut

Não consegui testar o CapCut daqui. O que segue vem de pesquisa na web: o CapCut não lê ProRes 4444 com alfa, e o WebM com alfa funciona só em algumas versões. Por isso há uma versão em fundo verde.

1. **Teste primeiro com um arquivo.** Importe `render/capcut/q-mecanismo.mp4` (fundo verde #00FF00) e, se quiser, `render/q-mecanismo.webm` (alfa). Se o WebM vier transparente na sua versão, use os WebM. Se vier com fundo preto, use os MP4.
2. **Chroma key (MP4):** coloque o overlay na trilha acima do vídeo > Efeitos de vídeo > Remover fundo > Chroma key > conta-gotas no verde. Aumente a intensidade até o verde sumir; se sobrar uma linha fina de borda, aumente "Bordas" ou "Sombra" um pouco.
3. **Marcadores:** o CapCut não importa o `timeline.edl`. Importe `timeline-capcut.srt` em Texto > Legendas > Importar legendas. Cada marcador vira uma legenda na trilha de texto, com o tempo e o nome (V02, q-codigo, QUEBRA...). Depois de conferir, apague essa trilha ou deixe oculta antes de exportar.
4. **Tempos:** são estimados (145 palavras por minuto + pausas + 8 s de cold open). Ajuste todos pela fala real; se mover o roteiro, rode `python3 tools/parse_roteiro.py ep02` e refaça o SRT.
5. **Cue sheet:** `cue-sheet.md` lista onde entram impacto, whoosh, silêncio e queda de música.
