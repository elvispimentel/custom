---
name: edicao-video-automatizada
description: Use quando o Elvis for editar, cortar, alinhar ou legendar um vídeo gravado (tela verde ou não), montar overlays com alfa, ou preparar arquivos para o CapCut. Cobre cortar silêncios, alinhar tempos à fala real, legendas palavra por palavra, reformatar, e as regras e limites de usar IA em edição de vídeo.
---

# Edição de vídeo automatizada (PodPoc)

Base: `referencias/analise-manual-edicao-video-2026.md` (análise verificada do manual do Gemini) e o piloto do ep02.

## Modelo de três eixos (como dividimos o trabalho)
| Eixo | Quem faz | O quê |
|---|---|---|
| Cérebro | Claude (nas sessões) / API da OpenAI (no painel) | roteiro, escolhas editoriais, olhar quadros extraídos, decidir pendências |
| Motor de imagem e áudio | FFmpeg + Whisper + CapCut (o editor do Elvis) | cortes por forma de onda, transcrição, montagem final |
| Motor de gráficos | Remotion (`remotion/`) | overlays com alfa e em fundo verde, a partir de `overlays.json` |

## Regras que não se quebram
1. **Conta de tempo só em código.** Nunca peça ao modelo para somar ou estimar duração; use `tools/` e `ffprobe`.
2. **Corte pela forma de onda, não só pelo texto.** Timestamps de transcrição erram na casa de ~100 ms; sempre `--pad` de respiro e ajuste à grade de quadros.
3. **O modelo não vê vídeo, só quadros.** Para conferir resultado, extraia quadros (`ffmpeg -ss T -i v -frames:v 1`) e olhe as imagens.
4. **Edição dentro do CapCut não é possível por IA** (sem API). Entregue arquivos: overlays (`render/`, `render/capcut/`), `timeline-capcut.srt`, cortes `.cortes.srt`.
5. **Ordem:** o Elvis termina a edição e exporta; só então se alinha (cortes e tempos mudam depois de cada edição).
6. **Licença antes de tudo** (imagens: ver `CLAUDE.md`; Remotion: grátis até 3 funcionários, app para clientes exige plano Automators).
7. **Código de terceiros (MCPs, skills)**: ler antes de instalar.

## Receitas
- **Cortar silêncios:** `python3 tools/cortar_silencios.py gravacao.mp4 [--noise -30] [--min 0.6] [--pad 0.10] [--merge 0.25] [--render saida.mp4]`. Grava `.cortes.json` e `.cortes.srt`. `--noise` é o limite em dB: mais perto de 0 (ex.: -25) trata mais som como silêncio; mais negativo (ex.: -40) só trata o muito baixo. Fala baixa ou ruído de fundo: testar em 1 minuto antes de aplicar no vídeo todo.
- **Transcrição com tempo por palavra:** Whisper local (`faster-whisper`), com `word_timestamps`; modelo vem do Hugging Face (testar o download). Sem isso, o Elvis manda a transcrição.
- **Alinhar overlays:** achar no texto transcrito a frase de cada `[TEXTO NA TELA]` e usar o tempo da primeira palavra; reescrever `timeline*.csv/.srt` com esses tempos.
- **Vertical 9:16:** `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2` (barras) ou recomposição com o Elvis ampliado (a fazer).
- **Juntar sem reencodar:** `ffmpeg -f concat -safe 0 -i lista.txt -c copy saida.mp4` (só para arquivos com mesmo codec).
- **Overlays:** `cd remotion && node scripts/render.mjs` (WebM com alfa), `--chroma` (MP4 verde para CapCut).

## Limites a avisar ao Elvis
O modelo não assiste vídeo; o CapCut não é automatizável; textos e imagens feitos pelo Claude carregam marca d'água/credencial C2PA (política da Anthropic, ago/2026); a edição final e o olho crítico continuam humanos.
