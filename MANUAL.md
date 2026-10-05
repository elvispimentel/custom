# Manual — Biblioteca Pessoal → NotebookLM (execução 100% pelo GitHub Actions)

Tudo roda na nuvem: você só usa a interface do GitHub. Nada é instalado no seu computador.
A conexão com o Google Drive passa pelo **Composio**. Os PDFs são **juntados dentro do próprio runner do GitHub** (motor local, `pypdf`) — sem o site do iLovePDF, sem limite de arquivos por chamada e sem créditos. O iLovePDF via Composio continua disponível como motor opcional (seção 7). Nenhum segredo fica no repositório.

> **Não faz** (de propósito): envio automático ao NotebookLM, exclusão definitiva, envio à lixeira.
> Duplicados **são movidos** para uma pasta de revisão e a origem de cada um fica registrada, então tudo pode ser restaurado.

---

## 1. Como funciona, em uma frase por etapa

| Etapa (nome da ação no GitHub) | O que faz | Mexe nos arquivos? |
|---|---|---|
| **Localizar Biblioteca Pessoal** | Acha a pasta e mostra o ID. Se houver mais de uma com o nome, **lista as opções** e para. | Não |
| **Verificar conexões** | Confere Composio, Drive, ferramentas e (se `ilovepdf`) a conta do iLovePDF. | Não |
| **Simular organização** | Inventário completo + grupos de duplicados, o exemplar mantido e os que seriam movidos. | Não |
| **Mover duplicados para revisão** | Move os duplicados para `Biblioteca Pessoal — Duplicados para Revisão` (fora da biblioteca). | Sim (mover) |
| **Simular temas e autores** | Gera o plano `Tema / Autor / arquivo` para você revisar. | Não |
| **Aplicar temas e autores** | Move os arquivos para `Biblioteca Pessoal/Tema/Autor/`. | Sim (mover) |
| **Testar um lote** | Processa **um único lote real** (para você conferir o resultado). | Cria 1 PDF na pasta de saída |
| **Processar lotes** | Processa N lotes (ou todos). | Cria PDFs na pasta de saída |
| **Retomar** | Continua de onde parou, sem refazer o que já foi feito. | Cria PDFs |
| **Restaurar duplicados / Restaurar temas e autores** | Devolve os arquivos aos locais originais. | Sim (mover de volta) |

**Ordem recomendada** (a ordem importa — veja a seção 6):
`Conectar Google Drive → Verificar → Localizar → Simular organização → Mover duplicados → Simular temas e autores → Aplicar temas e autores → Testar um lote → Processar lotes`.

Os PDFs finais ficam em `Biblioteca Pessoal — PDFs para NotebookLM`, espelhando as subpastas.
Os originais nunca são alterados nem renomeados.

---

## 2. Configuração única (uma vez só)

### 2.1 Composio
1. Entre em https://dashboard.composio.dev e use o produto **Platform** (para desenvolvedores). **Este agente usa a chave de projeto do Platform, que começa com `ak_`** — e não a chave `ck_...` do produto "For You", que é para clientes de IA pessoais e não serve aqui. Segundo a skill oficial do Composio: no Platform, abra o seu projeto → **Getting Started** → passo 1 e copie a chave `ak_...`. (Se o painel mostrar só o "For You", crie um projeto Platform.)
2. Defina um **User ID**: um texto fixo, por exemplo `elvis`. No Platform ele é um identificador seu; as conexões ficam atreladas a ele. Use **o mesmo User ID** em todas as conexões abaixo e no Secret `COMPOSIO_USER_ID`.
3. **Conecte o Google Drive a esse User ID pelo próprio GitHub** (depois de criar os Secrets da seção 2.2): aba **Actions → Biblioteca Pessoal → Run workflow → "Conectar Google Drive"**. O resumo da execução mostra um **link**. Abra o link, autorize com a conta dona da Biblioteca Pessoal e **marque todas as permissões do Drive** (se alguma ficar desmarcada, dá erro 403). Em seguida rode **Verificar conexões**, que mostra o e-mail da conta autorizada — confira que é o seu.
   - *(só se for usar `pdf.motor: ilovepdf`)* **iLovePDF** — o Composio pedirá as chaves de um projeto da API do iLovePDF, direto no painel. **Com o motor padrão (`local`) isto não é necessário.**
   - O link vale poucos minutos. Se o repositório for **público**, o log da execução também é público: abra o link logo e confira o e-mail na verificação. Em repositório privado não há esse risco.
4. Anote: `COMPOSIO_API_KEY` e `COMPOSIO_USER_ID`.

> Se você tiver mais de uma conta conectada para o mesmo toolkit, preencha também `composio.contas` em `config.exemplo.yaml` com o `connected_account_id` desejado (não é segredo).

### 2.2 Secrets no GitHub (credenciais)
No repositório: **Settings → Secrets and variables → Actions → aba *Secrets* → New repository secret**.

| Nome (exato) | Valor | Obrigatório |
|---|---|---|
| `COMPOSIO_API_KEY` | sua API key do Composio | Sim |
| `COMPOSIO_USER_ID` | o User ID das conexões | Sim |
| `OPENAI_API_KEY` | chave da API OpenAI — classifica temas/autores com IA (classificador `openai`, padrão) | Não |
| `ANTHROPIC_API_KEY` | chave da API Claude — só para classificar temas/autores com IA | Não |

### 2.3 Variables no GitHub (IDs de pastas — não são segredos)
Na mesma tela, aba ***Variables* → New repository variable**:

| Nome | Valor |
|---|---|
| `BIBLIOTECA_ID` | ID da pasta “Biblioteca Pessoal” (veja 2.4) |
| `PASTA_PDFS_ID`, `PASTA_DUPLICADOS_ID`, `PASTA_CONTROLE_ID` | *(opcional)* IDs das pastas de saída, depois que forem criadas — evita ambiguidade se você criar pastas de mesmo nome |
| `PASTA_PAI_ID` | *(opcional)* onde criar as pastas de saída; vazio = ao lado da biblioteca |

### 2.4 Confirmar o ID da biblioteca
1. Aba **Actions** → workflow **Biblioteca Pessoal** → botão **Run workflow**.
2. Em **O que executar** escolha **Localizar Biblioteca Pessoal** → **Run workflow**.
3. Abra a execução; o resumo mostra o(s) ID(s). **Se houver mais de uma pasta com esse nome, o programa não escolhe: ele lista as opções e termina.** Escolha uma e grave o ID em `BIBLIOTECA_ID`.

> Na consulta que fiz agora, na sua conta, apareceu **uma única** pasta “Biblioteca Pessoal”, ID `1dufZd2GwNClsx-jab30-HXdBOznzBoJm`. Confirme pela ação acima antes de gravar — o agente não usa esse valor sozinho.

---

## 3. Iniciar uma execução pela interface do GitHub

> **Pré-requisito: o workflow precisa estar na branch principal (`master`).** O GitHub só lista workflows de acionamento manual (`workflow_dispatch`) quando o arquivo `.github/workflows/biblioteca.yml` existe na branch padrão. Antes de tudo, faça o merge da branch `claude/cool-babbage-3d109z` no `master` (aba **Pull requests → New pull request → base `master`, compare `claude/cool-babbage-3d109z` → Create → Merge**). Depois disso o workflow **Biblioteca Pessoal** aparece na aba **Actions**.
1. Repositório → aba **Actions**.
2. No menu da esquerda, **Biblioteca Pessoal**.
3. **Run workflow** (botão à direita) → escolha a **branch** onde o código está.
4. Preencha os campos e clique no botão verde **Run workflow**:
   - **O que executar**: a ação (tabela da seção 1);
   - **max_lotes**: só para *Processar lotes* (`0` = todos);
   - **incluir_lotes**: só para *Simular organização* — também baixa e analisa os PDFs para estimar lotes e uso das APIs;
   - **confirmar**: digite `CONFIRMAR` nas ações que **movem** arquivos (se esquecer, a execução para antes de mexer em qualquer coisa);
   - **biblioteca_id**: opcional (substitui a variável).
5. Clique na execução em andamento para ver o progresso ao vivo. O **resumo** da execução traz os grupos de duplicados, a estimativa de uso e o resultado.

### Execuções simultâneas
O workflow usa `concurrency` por biblioteca: **uma execução por vez**. Se você disparar outra enquanto uma roda, ela **fica na fila** (o GitHub guarda uma pendente; disparos extras substituem a pendente). Além disso, existe uma **trava no próprio Drive** (`TRAVA.json` na pasta de controle), válida por 6 h — protege mesmo contra execuções de outro lugar.

---

## 4. Onde ficam o progresso e os relatórios
Tudo na pasta **`Biblioteca Pessoal — Controle do Agente`** (no Drive, ao lado da biblioteca), porque o ambiente do GitHub é descartado ao fim de cada execução:

| Arquivo | Conteúdo |
|---|---|
| `estado.db` | Progresso (banco SQLite): permite **retomar** sem refazer movimentos nem gerar PDFs repetidos |
| `inventario.csv` | ID, nome, caminho, formato, tamanho, checksum, situação de cada arquivo |
| `relatorio_duplicados.csv` / `simulacao_duplicados.md` | Grupos, exemplar mantido, **motivo da escolha**, duplicados e se já foram movidos |
| `historico_movimentacoes.csv` | Cada movimento: ID, origem (id e caminho), destino, status, erro — base da restauração |
| `indice_pdfs.csv` | Arquivo original, ID do Drive, PDF final, ID do PDF final, **página inicial e final**, status |
| `pendencias.csv` | Erros e pendências (veja seção 7) |
| `plano_temas.csv` | Plano de temas/autores (simulação) |
| `classificacao_manual.csv` | **Você cria** (opcional): corrige temas/autores. Colunas: `id_drive,tema,autor` |
| `TRAVA.json` | Trava de execução |

Não apague `estado.db`: sem ele o agente esquece o que já fez (ainda é seguro — confere o Drive antes de mover/gravar — mas refaz análises).

---

## 5. Regras de duplicidade (exatas)
- Candidatos: mesmo **checksum do Drive**. Confirmação: **SHA-256 dos arquivos baixados**. Só o SHA-256 igual vale como duplicado.
- **Nome igual, tamanho igual ou título parecido não provam nada.** Edições diferentes, versões anotadas e digitalizações diferentes têm conteúdo diferente → **são preservadas**.
- **Exemplar mantido** (regra fixa): 1º um arquivo **fora** de pastas de cópias (nomes de pasta contendo `cópia`, `copias`, `backup`, `duplicad`, `old` — ajustável em `arquivos.pastas_de_copias`); no empate, o de **data mais antiga** — a menor entre criação e modificação, porque a criação no Drive é a data do upload (igual para um lote inteiro) e a modificação preserva a data original do arquivo; depois caminho e ID. O motivo fica registrado.
- Duplicados vão para subpastas `conteudo-<hash>` dentro de `Biblioteca Pessoal — Duplicados para Revisão`.
- Sem permissão para mover algum arquivo → vira **pendência** e o resto continua.
- Atalhos do Drive **não** são tratados como cópias e **não** são seguidos. Arquivos nativos do Google (Docs/Sheets) não entram na duplicidade.
- As pastas de resultados, de revisão e de controle são **excluídas de toda varredura**.

---

## 6. Temas e autores

1. Rode **Simular temas e autores**. Nada é movido; sai o `plano_temas.csv` com tema, autor, fonte, confiança e destino de cada arquivo.
2. Revise. Para corrigir, crie `classificacao_manual.csv` na pasta de controle (`id_drive,tema,autor`) — o manual **vence** qualquer regra. Para ajustar os temas e palavras-chave, edite `organizacao.temas` em `config.exemplo.yaml` (no GitHub: arquivo → ícone de lápis → *Commit changes*).
3. Rode **Aplicar temas e autores** (digite `CONFIRMAR`). Estrutura: `Biblioteca Pessoal/<Tema>/<Autor>/arquivo`.

Como classifica: por padrão, **regras** sobre o nome do arquivo e as pastas atuais (`Autor - Título`, `Título (Autor)`). Com `organizacao.classificador: openai` (ou `claude`) e o Secret `OPENAI_API_KEY` (ou `ANTHROPIC_API_KEY`), a IA sugere o tema (sempre escolhido **dentro da sua lista**) e o autor (sem inventar). Só o **nome do arquivo e a pasta atual** são enviados — o conteúdo dos livros não é lido.

Só **livros** entram no plano (`organizacao.formatos_livro`: pdf, epub, mobi, azw3, doc, docx, txt, rtf, odt). Imagens, HTML, `.psd` e `.icloud` aparecem como `fora_do_escopo_nao_livro` e não são movidos. Os temas padrão agora são 10 (inclui Filosofia, História, Religião, Saúde); edite as palavras-chave no config.

Garantias: quem não for classificado com confiança (`confianca_minima`) **fica onde está** e aparece no plano como `manter_nao_classificado`. Autores com grafias diferentes só em maiúsculas/acentos viram **uma** pasta. Arquivos ainda subindo e duplicados não são movidos.

> **Como os lotes são agrupados (`lotes.agrupar_por`).** Com `tema` (padrão do config de exemplo), todos os autores de um mesmo tema entram juntos, em ordem de autor e título, e os lotes saem cheios (até 25 livros). Tudo que está **fora das pastas de tema** (os livros sem tema) vai para o grupo **Sem tema** (`lotes.grupo_sem_tema`). Com `pasta`, cada pasta forma seu próprio grupo. Os originais **nunca saem do lugar**: os PDFs agrupados vão para a pasta "Biblioteca Pessoal — PDFs para NotebookLM", em uma subpasta por tema, e o índice diz de qual original e de quais páginas cada livro veio.
>
> **Por que antes dos lotes?** Os lotes são formados por pasta/tema. Se você reorganizar depois de gerar PDFs, os lotes mudam de composição; os PDFs antigos ficam **marcados como `obsoleto`** no índice (nunca apagados) e novos são gerados. Reorganize primeiro e processe depois.

---

## 7. Lotes de PDF para o NotebookLM
- Apenas **PDFs únicos** (sem os duplicados), por pasta, em **ordem natural** (`cap 2` antes de `cap 10`). Um lote nunca mistura pastas.
- **Sem limite de quantidade** de documentos por lote (`lotes.max_documentos: 0`; o limite de 25 era só do iLovePDF — com o motor local não existe, e se você usar o iLovePDF, ponha `25`). O lote fecha quando bate nas metas `lotes.meta_mb` (180) ou `lotes.meta_palavras` (450 000 estimadas). Os **tetos do NotebookLM por fonte** (200 MB ou 500 mil palavras — informados por você) ficam em `lotes.limite_mb` e `lotes.limite_palavras`: as metas são a margem de segurança (a contagem de palavras é uma estimativa por amostragem) e podem subir, ex.: `meta_mb: 180`; um PDF final acima do teto **nunca é gravado**. O lote é **reduzido** quando necessário. Para manter margem, a meta de palavras fica 10% abaixo do teto de 500 mil, porque a contagem é estimada por amostragem.
- **Motor de merge (`pdf.motor` em `config.exemplo.yaml`):**
  - `local` *(padrão)*: junta no próprio runner com `pypdf`. **Não há limite de arquivos por chamada** — dá para botar `lotes.max_documentos: 50` (ou mais) e juntar tudo numa só passada, sem depender do plano do iLovePDF. Cada documento original vira um **marcador** (bookmark) com o nome dele dentro do PDF final. Os limites que continuam valendo são as metas `meta_mb` e `meta_palavras`.
  - `ilovepdf`: usa o iLovePDF via Composio. **Limite real da integração: 20 arquivos por chamada** (`maxItems` do esquema de `I_LOVE_PDF_MERGE_PDFS`), e cada merge consome crédito. Com 25 documentos: junta os 20 primeiros, junta os 5 restantes e une os dois resultados, mantendo a ordem. Atenção: o plano premium do site (50 arquivos) **não muda** o limite de 20 desta integração, que vem do esquema da ferramenta.
- Com o motor `ilovepdf`, os arquivos seguem o formato do Composio: os bytes são baixados do Drive, enviados ao armazenamento do Composio por URL pré-assinada e passados como `{name, mimetype, s3key}`; link do Drive não é usado como arquivo. Com o motor `local` nada disso é necessário para o merge (só o Drive passa pelo Composio).
- Antes de rodar com `ilovepdf`, o agente consulta a conta (créditos/arquivos restantes) e **bloqueia** se estiver zerada; se o saldo for menor que o estimado, avisa e o trabalho pode ser retomado depois. Com o motor `local` não há essa limitação.
- Cada PDF final é validado: abre, **número de páginas = soma das páginas dos originais** (divergência = erro, nada some em silêncio), tamanho e texto extraível.

**Itens que aparecem em `indice_pdfs.csv` / `pendencias.csv` em vez de entrar em um lote:**

| Status | Significado | O que fazer |
|---|---|---|
| `ocr` | Provável digitalização (sem texto extraível). **Entra no lote** (as páginas não são descartadas), mas fica sinalizado. | Aplicar OCR depois, se quiser texto pesquisável |
| `protegido` | PDF protegido por senha. **Não é mesclado.** | Remover a senha e rodar *Retomar* |
| `invalido` | Não abre / corrompido. **Não é mesclado.** | Substituir o arquivo |
| `enviar_separadamente` | Sozinho já passa da meta de tamanho ou de palavras: **não cabe num resultado único.** O original fica intacto no lugar. Motivo no índice. Se o motivo disser **EXCEDE o teto do NotebookLM**, nem sozinho ele é aceito (acima de 200 MB ou 500 mil palavras). | Subir **individualmente** no NotebookLM, pelo ID/caminho do índice; se excede o teto, dividir o arquivo antes |
| `instavel` / `vazio` | Modificado há menos de `estabilidade_minutos` (30) ou com 0 bytes: **provavelmente ainda subindo.** | Esperar o upload e rodar de novo |
| `obsoleto` | PDF de lote cuja composição mudou (livros novos chegaram). Mantido, não apagado. | Pode descartar manualmente |

### Biblioteca ainda recebendo livros
Basta **rodar de novo mais tarde**: cada execução refaz o inventário (paginado) e processa só o que é novo. Arquivos ainda subindo ficam de fora até estabilizar.

### Tempo e disco
- Um job do GitHub Actions em runner hospedado pode durar **até 6 horas** (limite consultado na documentação do GitHub). O workflow usa `timeout-minutes: 345` e o programa **para sozinho aos 300 min** (`execucao.tempo_max_minutos`), salvando o estado. É só rodar **Retomar**.
- Armazenamento temporário: o programa trabalha **lote a lote** na memória (meta de 90 MB por lote) e não acumula arquivos em disco, então não depende do tamanho do disco do runner.
- Use **Processar lotes** com `max_lotes` pequeno (ex.: 5) até se sentir seguro; depois `0`.

---

## 8. Estimativa de uso das APIs
Cada execução imprime as **chamadas ao Composio por ferramenta** e o estado acumula o total (`status`). *Simular organização* com `incluir_lotes` mostra a estimativa antes de gastar créditos: lotes pendentes, arquivos a juntar, **chamadas de merge e, no motor `ilovepdf`, créditos consumidos (cada merge consome um)**, downloads e uploads no Drive.

---

## 9. Se algo der errado
| Sintoma | Causa provável | Ação |
|---|---|---|
| `COMPOSIO_API_KEY` / `COMPOSIO_USER_ID` ausentes | Secret com nome diferente | Conferir nomes exatos (seção 2.2) |
| *Verificar* mostra “SEM CONEXÃO ATIVA” ou erro 404 `ConnectedAccountNotFound` | O projeto Platform não tem conta do Drive para esse User ID | Rodar **Conectar Google Drive**, abrir o link e depois **Verificar conexões** |
| *Verificar* avisa “N contas ativas” | Mais de uma conta do Drive para o mesmo User ID | Fixar a correta em `composio.contas.googledrive` ou remover as outras no painel |
| *Verificar* mostra ferramenta INDISPONÍVEL / HTTP 4xx na versão | `versao_ferramentas: latest` recusada | Trocar pela versão que o painel indicar em `config.exemplo.yaml` |
| “Há N pastas chamadas…” | Nome ambíguo | Escolher um ID e gravar na variável indicada |
| “BIBLIOTECA OCUPADA” | Outra execução em andamento ou queda recente | Aguardar; a trava expira sozinha em 6 h |
| Execução parou por tempo | Biblioteca grande | Rodar **Retomar** |
| Movimento errado | — | Rodar **Restaurar …** (precisa de `CONFIRMAR`) |

Restaurar usa o `historico_movimentacoes.csv`/estado: devolve cada arquivo à pasta de origem registrada.

---

## 10. Segurança
- Credenciais **só** em GitHub Secrets. O repositório ignora `.env`, `config.yaml` e `*.db`. Nenhum log imprime chaves.
- IDs de pasta ficam em Variables (não são credenciais, mas são pessoais).
- As permissões do workflow são só `contents: read`.
- O Composio opera com as permissões da conta Google conectada: use a conta dona da biblioteca.

---

## 11. Testes (já incluídos)
O workflow **Testes** roda a cada alteração de código; local não é necessário. Cobrem, com Drive e iLovePDF simulados e PDFs reais gerados:
- mesmo conteúdo com nomes diferentes (detectado) × mesmo nome/tamanho com conteúdos diferentes (preservados);
- escolha determinística do exemplar, movimento sem exclusão, registro de origem e restauração;
- interrupção no meio e retomada **sem repetir** movimentos nem gerar PDFs repetidos;
- exclusão das pastas de saída/revisão/controle e dos atalhos da varredura;
- motor `ilovepdf`: 25 documentos → 20 + 5 + união; motor `local`: 50 documentos em **um** único PDF, com marcadores; ordem natural, páginas somadas e intervalos no índice;
- metas de documentos/palavras, OCR, protegido, inválido e arquivo grande demais;
- formato real das chamadas ao Composio (endpoint, `user_id`, `s3key`, `Content-Type`, paginação, upload resumível).

### Limites desta versão (sem rodeios)
- **Não foi validado contra suas contas reais.** O ambiente onde escrevi o código não tinha Drive/iLovePDF conectados no Composio. Por isso existem **Verificar conexões** e **Testar um lote**: eles são o seu teste real, antes de processar tudo.
- Os esquemas das ferramentas foram lidos das definições reais do Composio (`GOOGLEDRIVE_*`, `I_LOVE_PDF_*`); a documentação web do Composio estava bloqueada na minha rede, então formato de resposta de `CREATE_FOLDER`, `UPLOAD_FILE` e `RESUMABLE_UPLOAD` (campo `id`) é verificado em tempo de execução e falha com mensagem clara se diferir.
- Os tetos do **NotebookLM** (200 MB / 500 mil palavras por fonte) vieram de você, não de uma consulta minha à documentação; no motor `ilovepdf`, o limite de tamanho por tarefa também não foi confirmado. O merge local mantém o texto e o número de páginas (validados), mas não otimiza nem comprime o tamanho do arquivo.
- Autor/tema por **nome do arquivo**; metadados internos do PDF não são lidos (exigiria baixar todos os livros).
- Não há OCR nesta versão (apenas sinalização).
