# Plano — Overlays e pacote de edição EP02 (PodPoc)

## Goal
Executar PROMPT.md: overlays Remotion com alfa, composições de autor, timeline (CSV/EDL/cue sheet), prompts-video.md, créditos, quadro PEDIR AUTORIZAÇÃO, RELATORIO.md.

## Decisões
- Kit vive em `podpoc/` (o CLAUDE.md da raiz do repo é outro e não foi tocado).
- Branch: `claude/keen-einstein-gzprbm` (obrigatória na sessão), no lugar de `ep02`.
- Rede: archive.org, commons, nasa, met, upload.wikimedia bloqueados (403 do proxy). Downloader fica escrito e não executado.
- Fontes via npm (@fontsource), sem Google Fonts.
- Alfa: WebM VP9 (yuva420p) como entrega leve; ProRes 4444 sob demanda (arquivos grandes, fora do git).

## Fases
### Phase 1 — Parser do roteiro → overlays.json, timeline, EDL, cue sheet, prompts-video
**Status:** complete
### Phase 2 — Projeto Remotion (composições + render alfa)
**Status:** complete
### Phase 3 — Render + checagem de frames (contraste, zona segura)
**Status:** in_progress
### Phase 4 — Downloader de imagens, credits.json, PEDIR AUTORIZAÇÃO, créditos na descrição
**Status:** complete (download não executado: rede)
### Phase 5 — RELATORIO.md, commit, push
**Status:** pending

## Next Step
Phase 3: esperar render completo, rodar tools/check_frames.py, testar ProRes 4444, rerender das falhas

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 403 CONNECT archive.org/commons/nasa/met | 1 | Política de rede; seguir sem download, pendência no relatório |
