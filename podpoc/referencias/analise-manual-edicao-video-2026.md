# Análise do "Manual Definitivo de Edição e Automação de Vídeo com o Claude AI (2026)"

Origem: pesquisa feita pelo Elvis no Gemini. As 8 referências do texto são blogs e páginas de terceiros (MindStudio, davinciclaude.com, implicator.ai, YouTube), não documentação oficial; só a nº 3 (Anthropic) e a nº 8 (Remotion) são primárias. O texto colado perdeu as listas das seções 3.1, 3.2, 4.1 e 5: os passos de instalação e as listas de operações suportadas do DaVinci **não estão no texto**.

Verificação feita em 08/10/2026, por busca na web e leitura da página da Anthropic. "Não verificado" significa que eu não achei fonte primária, e não que seja falso.

## 1. Afirmação por afirmação

| Afirmação do manual | Veredito | Observação |
|---|---|---|
| Claude "não consegue assistir vídeo nem analisar frames" | **Parcialmente certo** | A API aceita imagens, não vídeo. Frames extraídos como imagem funcionam: foi assim que conferimos todos os overlays do ep02. O correto é "não ingere vídeo; olha quadros que você extrair". |
| Timestamps de transcrição têm ~120 ms de erro (ElevenLabs Scribe v2) | Plausível, não verificado | A consequência é válida: cortar pela **forma de onda** (silêncio), não só pelo texto. |
| Teste da entrevista: pediu 300 s, entregou 578 s e reportou 299 s | Não verificado (blog) | A lição é consistente com o que vimos: **conta de duração se faz em código**. No nosso pipeline todo tempo é calculado por script. |
| "Modelo de Três Eixos" (cérebro / motor de imagem real / motor de gráficos) | Boa organização | É o que já fazemos, com CapCut no lugar do DaVinci e OpenAI/Claude como cérebro. |
| Configurar MCP em `claude_desktop_config.json`; `.cursor/mcp.json` no Linux | **Confuso** | Esse arquivo é do Claude Desktop (macOS/Windows). O Claude Code usa `claude mcp add` ou `.mcp.json`. `.cursor/mcp.json` é do Cursor, não do Linux. |
| DaVinci Resolve Studio 21.1 com "servidor MCP nativo" | **Não confirmado** | Existem MCPs da comunidade. O scripting externo é exclusivo do Studio (~US$ 295 segundo uma fonte). Um README relata que no 21.1 o Python passou a ser só do Studio e a ponte gratuita pode não funcionar. A API devolve `False`/`None` sem mensagem de erro (relato de terceiros). **Não se aplica a você: o editor é o CapCut, que não tem API nem MCP oficial.** |
| Remotion + Claude Code, frames em vez de segundos, `inputProps`, `spring`/`interpolate` | **Confirmado** | É o que usamos. `npm run dev` abre em localhost:3000 no template padrão; no nosso projeto é `npm run studio`. |
| (omissão) licença do Remotion | **Lacuna grave** | Grátis para empresa com fins lucrativos de até 3 funcionários. App que renderiza vídeo **para clientes** cai no plano "Automators": US$ 0,01 por render, mínimo US$ 100/mês, segundo a página de preços. Confirmar em remotion.dev/docs/license/pricing antes de vender. |
| Hyperframes "orquestra APIs na nuvem" | **Incorreto no detalhe** | É um framework open source da HeyGen (Apache 2.0) que transforma HTML em MP4 **localmente** (Chrome + FFmpeg, Node 22+). Não é nuvem. Pode ser alternativa ao Remotion se a licença pesar; as fontes que achei são secundárias. |
| "Kling e Veo da suite Anthropic Video Generator" | **Incorreto** | A Anthropic não tem gerador de vídeo. Kling é da Kuaishou e Veo é do Google. O Claude orquestra; quem gera é o serviço externo. |
| `HEYGEN_API_KEY` para "motores vocais e musicais" | Duvidoso | HeyGen é avatar e vídeo. Voz seria ElevenLabs. |
| FFmpeg: `silencedetect`, `scale+pad` 9:16, `hstack`, `setpts`/`atempo`, `concat -c copy` | **Confirmado** | Comandos corretos; `silencedetect` escreve no stderr. Testado com `tools/cortar_silencios.py`. |
| `npx skills add calesthio/openmontage/video-edit` | Não verificado | Código de terceiros roda na sua máquina: ler antes de instalar. |
| Marca d'água nos textos do Claude (SynthID-Text) | **Confirmado, com ressalvas** | Fonte primária: anúncio da Anthropic de 14/08/2026. Texto é marcado de forma estatística; arquivos .png/.jpg/.svg ganham credencial C2PA nos metadados; código e respostas exatas são pouco ou nada marcados; reescrever o texto remove a marca; não dá para desativar; o detector está em prévia privada. O manual exagera ao dizer que ela persiste em scripts Remotion. |
| Conclusão: o humano vira "decisor arquiteto" | Opinião | A prosa do manual é inflada; o conteúdo técnico útil é cerca de um terço. |

## 2. O que serve para nós
Já aplicável:
- **Cortar silêncios** da gravação em tela verde: feito em `tools/cortar_silencios.py` (testado com arquivo sintético, 0 ms de diferença; gera JSON e SRT de marcadores; opcionalmente renderiza o vídeo cortado).
- **Alinhar overlays à fala real** e **legendas palavra por palavra**: dependem do áudio final do ep02.
- **Lote parametrizado** com `inputProps`: o `overlays.json` já cumpre esse papel.

Futuro: versão vertical 9:16 para Shorts/Reels, voz com ElevenLabs, vídeos de IA com Veo/Kling/Runway (todos com chave e custo próprios).

Não se aplica agora: DaVinci Resolve (você usa CapCut); Hyperframes (só se a licença do Remotion virar problema).

## 3. Limitações que você precisa saber
1. Nenhum modelo (Claude ou OpenAI) "vê" o vídeo inteiro: só quadros extraídos e texto. Decisões de corte vêm da forma de onda e do código.
2. O CapCut não tem API: o painel **entrega arquivos** (overlays, SRT, marcadores) e você monta no CapCut. Edição automática dentro do CapCut não é possível.
3. Qualquer conta de duração, soma ou tempo deve ser feita em script, não pedida ao modelo.
4. Marca d'água e credencial C2PA: textos e imagens/SVG feitos pelo Claude carregam sinais de IA. Combine com os clientes o que será dito sobre isso.
5. Ferramentas de terceiros (MCPs, skills) executam código com acesso à sua máquina: revisar antes.

## 4. Riscos para vender (Project OS e clientes)
- **Remotion:** licença Automators ou empresa. Decidir antes de cobrar clientes.
- **Imagens:** licença é checada por regra (já vimos três tabelas erradas); fotos de pessoas vivas exigem autorização do cliente.
- **Chaves de API** ficam no servidor, nunca na tela; custo por render e por chamada do cérebro.
- **Promessas:** não prometer "edição automática no CapCut" nem "vídeo pronto sem revisão": o fluxo tem paradas humanas.

## 5. Próximos passos sugeridos
1. Quando chegar o vídeo do ep02: `cortar_silencios.py` → transcrever → alinhar overlays → legendas.
2. Decidir o caminho de licença (Remotion Automators vs. alternativa) antes de abrir para clientes.
3. Definir como o painel entra no Project OS.
