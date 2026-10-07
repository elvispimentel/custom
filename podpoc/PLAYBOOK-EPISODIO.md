# Playbook de episódio (padrão criado no piloto ep02)

Este arquivo é o "programa" em texto: o que perguntar, o que fazer, em que ordem, e o que já deu errado. Num episódio novo, a sessão lê este arquivo e o `CLAUDE.md` e segue daqui, sem o Elvis precisar lembrar nada.

## 1. Perguntas iniciais (só as que a sessão não consegue resolver sozinha)
Uma por vez, na ordem. Se a resposta já está nos arquivos, não pergunte.
1. **Material:** número e tema do episódio; roteiro pronto ou transcrição (arquivo em `episodios/epNN/`).
2. **Oferta:** qual aula/produto no CTA e o link que vai na descrição.
3. **Autores citados:** grafia correta de cada nome; quais fotos o Elvis tem e se pode usar; qual livro (capa em português, senão inglês).
4. **Vídeos de IA (V01...):** qual serviço e se há chave de API; senão o Elvis gera à mão a partir de `prompts-video.md`.
5. **Rede:** os domínios de imagem estão liberados? (ver §5)
Padrões já decididos, não perguntar de novo: editor **CapCut**; Elvis grava em **fundo verde, de frente, no canto inferior direito, por cima de tudo**; diagramas e cortes de arquivo ficam completos e centralizados por baixo; textos, lower thirds, fotos e capas ficam à esquerda do canto dele.

## 2. Passo a passo
1. Criar `episodios/epNN/roteiro-e-pacote.md` (skill `youtube-podcast-para-video-galifrael` gera roteiro, título, descrição, capítulos, thumbnail e prompts de vídeo).
2. `python3 tools/parse_roteiro.py epNN`: gera `overlays.json`, `timeline.csv`, `timeline.edl`, `timeline-capcut.srt`, `cue-sheet.md`, `prompts-video.md`. Antes, conferir no script: `QUOTE_IDS` (um id por [TEXTO NA TELA]), `AUTHORS`, `VIDEO_ANCHORS`, `ARCHIVE_TAGS`, `DIAGRAM_TAGS` (hoje têm os valores do ep02).
3. Imagens: `python3 tools/fetch_assets.py` → **olhar cada imagem baixada** (ver §4) → aprovar capas (`--approve`).
4. `python3 tools/gen_credits.py epNN` (créditos + quadro PEDIR AUTORIZAÇÃO).
5. `cd remotion && npm i && node scripts/render.mjs` (WebM com alfa + PNG) e `node scripts/render.mjs --chroma` (MP4 em fundo verde para o CapCut).
6. `python3 tools/check_frames.py epNN` (contraste ≥ 4,5:1, zona do Elvis, alfa).
7. V01 a V11 em `assets/video/` → `bash tools/cobertura.sh epNN`.
8. `RELATORIO.md` (máx. 15 linhas), commit, push.

## 3. O que o episódio entrega
Overlays com alfa (`render/`) e em fundo verde (`render/capcut/`); `timeline.csv`, `.edl` e `-capcut.srt`; `cue-sheet.md`; `prompts-video.md`; `assets/credits.json`; bloco "Créditos das imagens" na descrição; `PEDIR-AUTORIZACAO.md`; `RELATORIO.md`.

## 4. Armadilhas aprendidas no piloto (não repetir)
- **Nunca confiar na licença de uma tabela de pesquisa.** Conferir pela API: o Met marcou o Delaune 1569 como *não* domínio público (`isPublicDomain: false`); as fotos do Códice de Leningrado têm "© Bruce E. Zuckerman" impresso apesar do Public Domain Mark do Internet Archive.
- **Olhar cada imagem baixada.** O downloader trouxe: miniatura no lugar da página, logo da loja no lugar da capa, capa de outro livro no lugar do retrato, página de aviso do Google no lugar da capa. Usar `page/nN_w2000.jpg` do IA para páginas e conferir.
- **Commons devolve 429:** esperar e tentar de novo (o script já faz); preferir `commons_file` com título escolhido à mão.
- **Fotos de pessoas vivas:** só com fonte/autorização; fotos que o Elvis envia entram como "fornecida" no quadro de autorização e **não** no bloco de créditos. Nunca cortar crédito impresso na foto.
- **Capas:** português primeiro, inglês se não achar; capa de loja/editora = "uso por citação" e precisa de aprovação.
- **Nome duvidoso (ex.: Deepak Sankara Veda):** o Elvis confirma; texto de IA colado por ele não é fonte.
- **CapCut:** não lê ProRes com alfa; WebM com alfa é inconsistente; por isso há o MP4 em fundo verde (chroma key). Marcadores via `.srt` (não importa EDL).
- **Tempo:** estimado só por palavras faladas (145 wpm) + 8 s de cold open; sempre ajustar na gravação real. Não bate com a duração "de cabeça" do pacote.
- **Render é lento** (~1 min por overlay de 5 s por formato): rodar em segundo plano, esperar pelo PID (`kill -0 PID`), e só commitar vídeo depois que o lote terminar e `ffprobe` validar cada arquivo.
- **`status` do script de espera:** `pgrep -f` casa com a própria linha de comando; esperar por PID.

## 5. Rede (ambiente na nuvem)
Liberar em Network access: `archive.org`, `commons.wikimedia.org`, `upload.wikimedia.org`, `images-api.nasa.gov`, `collectionapi.metmuseum.org`, `colenda.library.upenn.edu` (e os hosts de loja/editora das capas).

## 6. Pedido para iniciar um episódio novo
> Leia `CLAUDE.md` e `PLAYBOOK-EPISODIO.md`. Episódio NN, tema "…", roteiro em `episodios/epNN/`. Siga o playbook, faça só as perguntas iniciais que faltarem, uma por vez, e registre decisões e pendências no relatório.
