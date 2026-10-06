# Kit PodPoc para o Claude Code (10 minutos, uma vez só)

## O que isso resolve
Você solta o roteiro do episódio, cola um prompt e recebe os overlays animados, as imagens livres com crédito, os marcadores da timeline e o relatório do que falta. Nos próximos episódios, você repete só o passo 5.

## Passo a passo
1. **Instale o Claude Code.** O jeito mais simples é o app Claude para desktop, aba **Code**. Se preferir o terminal, a documentação oficial indica, no Mac, Linux e WSL: `curl -fsSL https://claude.ai/install.sh | bash`; no Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`. Confira com `claude --version`. Fonte: https://code.claude.com/docs/en/overview
2. **Crie o repositório no GitHub** (privado), por exemplo `podpoc-episodios`, e clone na sua máquina.
3. **Copie este kit para dentro do repositório** mantendo as pastas:
   - `CLAUDE.md` na raiz (as regras do canal; o Claude Code lê isso em toda sessão)
   - `.claude/skills/youtube-podcast-para-video-galifrael/SKILL.md` (a sua skill)
   - `episodios/ep02/roteiro-e-pacote.md` (o roteiro e o pacote do episódio 2)
   - `PROMPT.md` (o pedido pronto)
4. **Abra o Claude Code dentro da pasta do repositório** e cole o conteúdo de `PROMPT.md`.
5. **Próximos episódios:** crie `episodios/ep03/`, solte a transcrição, e peça: "Rode a skill youtube-podcast-para-video-galifrael para ep03 e depois execute o PROMPT.md trocando ep02 por ep03".

## O que ainda depende de você
- Autorizar as fotos de pessoas vivas (Braden, Del Debbio, Deepak, Goddard, Bailey). O relatório lista a fonte oficial de cada uma.
- Gerar os 11 vídeos na sua ferramenta e salvar como `assets/video/V01.mp4` a `V11.mp4`.
- Aprovar as capas em português (uso por citação).
- Me dizer qual editor você usa (CapCut, Premiere, DaVinci ou outro), para eu ajustar o formato dos marcadores.

## Honestidade técnica
- Eu não consegui testar o pipeline do Remotion neste ambiente. O prompt manda o Claude Code conferir na documentação qual codec preserva o canal alfa e validar um frame de cada overlay. Se um passo falhar, ele registra no relatório.
- O Claude Code na sua máquina costuma ter acesso ao Wikimedia Commons, que a ferramenta aqui não alcançou. Por isso as imagens "conferir no Commons" ficam a cargo dele.
