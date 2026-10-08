# Pipeline de overlays (ep02)

Tudo roda a partir de `podpoc/`. O `CLAUDE.md` desta pasta tem as regras do canal.

| Quero... | Comando |
|---|---|
| Recalcular tempos, timeline, EDL, cue sheet, prompts-video | `python3 tools/parse_roteiro.py ep02` |
| Baixar imagens livres (precisa de rede liberada) | `python3 tools/fetch_assets.py` |
| Aprovar uma capa em português | `python3 tools/fetch_assets.py --approve capa-braden-pt` |
| Renderizar overlays (WebM com alfa + PNG) | `cd remotion && npm i && npm run render` |
| Renderizar para Premiere / DaVinci (ProRes 4444 com alfa) | `npm run render:prores` |
| Renderizar para CapCut (MP4 em fundo verde, chroma key) | `node scripts/render.mjs --chroma` (veja `episodios/ep02/COMO-USAR-NO-CAPCUT.md`) |
| Um overlay só | `node scripts/render.mjs --only braden` |
| Montar cobertura dos vídeos V01 a V11 | `bash tools/cobertura.sh ep02` |
| Atualizar créditos e quadro de autorização | `python3 tools/gen_credits.py ep02` |
| Cortar silêncios da gravação | `python3 tools/cortar_silencios.py gravacao.mp4 [--render saida.mp4]` |
| Transcrever com tempo por palavra | `python3 tools/transcrever.py gravacao.mp4 --episodio ep02` |
| Alinhar a timeline à fala real | `python3 tools/alinhar_tempos.py ep02` e depois `python3 tools/parse_roteiro.py ep02` |
| Conferir contraste e zona segura | `python3 tools/check_frames.py ep02` |
| Ver e ajustar no Studio | `cd remotion && npm run studio` |

Ordem depois de liberar a rede: `fetch_assets` → aprovar capas → `gen_credits` → `render` → `check_frames`.
Os overlays com foto ou capa se montam sozinhos quando o arquivo existe em `assets/img/`; sem ele, saem só com o lower third.
