# Prompt de teste: edição de vídeo curto para redes sociais

Use no Claude Code (app desktop, aba Code) aberto numa pasta com o vídeo. Num chat comum, sem execução de código, a IA provavelmente não consegue processar vídeo. O modelo importa menos que o ambiente: ele precisa de acesso ao arquivo e ao FFmpeg.

```
Você é meu editor de vídeo assistente. Vamos TESTAR um fluxo de edição de um vídeo
curto para redes sociais. Siga as regras e a ordem abaixo. Não pule o ponto de aprovação.

CONTEXTO (preencha antes de enviar)
- Vídeo: [anexado / está em ./video.mp4], cerca de 3min30s, português do Brasil.
- Objetivo: 1 versão limpa (sem silêncios) + 2 a 3 cortes curtos para Reels/Shorts/TikTok.
- Cortes curtos: vertical 9:16 (1080x1920), 30 fps.
- Tom: [ex.: direto, próximo, sem enrolação].
- Nomes próprios ditos no vídeo (grafia certa): [lista].

REGRAS (não negociar)
1. Você não assiste vídeo. Trabalhe com: transcrição com tempo por palavra, silêncios
   detectados pelo FFmpeg e quadros que você extrair e olhar como imagem.
2. TODA conta de tempo ou duração é feita por script, nunca de cabeça. Mostre a duração
   calculada e a verificada com ffprobe.
3. Corte pela forma de onda, nunca no meio de uma palavra: deixe 0,10 s de respiro de cada
   lado e ajuste à grade de quadros.
4. Não invente falas, dados nem textos. Legenda = o que foi dito (corrija só a grafia dos
   nomes da lista).
5. Não instale nada sem me dizer o que é. Nenhuma chave de API dentro de arquivos de código.
6. Se algo não funcionar no seu ambiente (sem FFmpeg, sem acesso ao arquivo), diga e pare.
   Não simule o resultado.

ETAPAS
1. Inspecione o arquivo (ffprobe): duração, resolução, fps, áudio. Relate.
2. Transcreva com tempo por palavra (Whisper local, faster-whisper, modelo small, idioma pt).
   Salve JSON e texto.
3. Detecte silêncios (ffmpeg silencedetect, -30 dB, mínimo 0,6 s). Calcule em código quanto
   sobra sem eles.
4. PROPOSTA — PARE AQUI e espere meu OK:
   a) versão limpa: lista de cortes (início–fim) e duração final calculada;
   b) 2 a 3 cortes curtos de 30 a 60 s, cada um com: gancho nos 3 primeiros segundos,
      começo e fim em pausas naturais, o trecho exato da fala (citação) e por que funciona.
5. Depois do OK, renderize com FFmpeg: a versão limpa (formato original) e os cortes
   verticais 9:16 centralizados no rosto, com legendas palavra por palavra grandes,
   2 linhas, fora das margens (10% laterais, 15% embaixo). Gere também o .srt.
6. Confira: extraia 3 quadros de cada corte (início, meio, fim), olhe e diga se legenda e
   enquadramento estão legíveis. Verifique a duração real com ffprobe.
7. Entregue: arquivos, tabela (nome | duração | o que é) e relatório curto com o que ficou
   pendente ou duvidoso. O acabamento final eu faço no CapCut.
```

## O que observar no teste
- Algum corte caiu no meio de uma palavra?
- A duração que a IA diz bate com a do `ffprobe`?
- A legenda está sincronizada e legível no celular?
- Os ganchos escolhidos são bons de verdade? Esse julgamento continua sendo humano.

Se o repositório `custom` estiver disponível na conversa, ela pode usar `podpoc/tools/cortar_silencios.py` e `podpoc/tools/transcrever.py`.
