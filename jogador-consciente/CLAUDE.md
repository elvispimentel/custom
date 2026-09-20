# CLAUDE.md — como trabalhar neste repositório

Leia isto inteiro antes de tocar em qualquer arquivo. As regras abaixo não são
preferências de estilo: cada uma nasceu de um defeito que custou tempo real.

---

## 1. O que é este projeto

**RPG — O Jogador Consciente**: um app de página única que gera o *Autorretrato
do Jogador* — um retrato calculado a partir da data, hora e cidade de nascimento
da pessoa, mais um inventário que ela responde.

Não é um curso. Não é um relatório. É a **porta de entrada** de um jogo, e ela
termina em pergunta, nunca em conclusão.

A frase oficial, usada nos materiais:

> O jogo da sua vida profissional. Um retrato de quem você é agora — calculado a
> partir do seu nascimento e das suas respostas.

E a que abre o próprio documento:

> Um documento só, não seis ferramentas separadas. E é uma fotografia de agora —
> não uma sentença. Tudo aqui muda quando você muda; é disso que o jogo trata.

**A regra comercial que sustenta o produto: entrega o QUE, cobra o COMO.**
O Autorretrato diz quem a pessoa é e para aí. No minuto em que ele começar a
dizer o que fazer, a aula seguinte perde função e a venda morre.

---

## 2. A REGRA DE PRESERVAÇÃO (a mais importante)

**Estes arquivos não se tocam:**

```
src/motor.browser.js     ← gerado; não editar à mão
engine/src/*.mjs         ← o motor de verdade
vendor/astronomy.*.js    ← efemérides (astronomy-engine, MIT)
src/cidades.json         ← 5.570 municípios + fusos IANA
```

O motor foi validado contra o Swiss Ephemeris com erro de **0,29 minutos de
arco**. Ele calcula Desenho Humano, Gene Keys, Kin maia, numerologia, Tarô
Mitológico e o mapa astronômico. Se ele quebrar, o produto inteiro vira ficção.

**Depois de QUALQUER alteração, rode a regressão:**

```bash
node testes/testdatas.mjs | md5sum
# tem que dar:  5a0cb5f73a0637f40633981ba9b7805b
```

São 12 datas de nascimento com resultado conhecido. Se o md5 mudar, você quebrou
o motor — reverta antes de seguir. Nunca "conserte o teste".

Se precisar mesmo mexer no motor: altere `engine/src/`, rode
`python3 build_bundle.py` para regerar `src/motor.browser.js`, e aceite que a
linha-base vai mudar — mas só depois de conferir cada uma das 12 datas contra
uma fonte externa.

---

## 3. Como construir e publicar

```bash
python3 build_bundle.py   # engine/src/*.mjs  ->  src/motor.browser.js
python3 build.py          # tudo              ->  out/*.html
```

O `build.py` gera quatro arquivos; os dois que vão para o ar são:

| Arquivo | Onde vai |
|---|---|
| `out/2-LOVABLE-index.html` | Lovable → `rpg.ojogadorconsciente.com.br` (endereço oficial) |
| `out/1-SITE-autorretrato.html` | qualquer host estático, sem manifest |

O app é **um único HTML**, com tudo embutido: motor, cidades, narrativa, CSS.
Nada de bundler, nada de npm no navegador. Isso é deliberado — ele precisa abrir
rápido no 4G e funcionar mesmo com metade da rede fora.

Sempre suba a versão em `VERSAO` e escreva no `CHANGELOG.md` **o que quebrou e
por quê**, não só o que mudou.

---

## 4. A gramática visual — a lei que rege a interface

> **Preto = o jogo falando. Branco = você falando.**

Essa frase é do Elvis e governa tudo:

- **Telas escuras** (`data-cena="escuro"`, Modo de Instrução): o sistema narra.
  Texto aparece letra a letra, a pessoa toca para seguir. Sem pressa.
- **Telas claras**: a pessoa responde, digita, escolhe.
- **A Ficha** é um documento — recupera o mundo claro inteiro, mesmo por cima da
  cena escura. Nunca herda cor do fundo.

Fontes: Fraunces (serifa), Archivo (interface), IBM Plex Mono (sistema/dados).

---

## 5. Vocabulário travado

| Use | Nunca |
|---|---|
| **RPG — O Jogador Consciente** (marca do produto) | usar "O Jogo da Vida" como marca |
| **O Jogo da Vida** (universo narrativo) | confundir com a marca |
| **Autorretrato do Jogador** | "relatório", "diagnóstico", "laudo" |
| **Instruções Iniciais** (a aula de ~18 min, Etapa 7) | chamar de "Entre o Mapa e a Jogada" |
| **Entre o Mapa e a Jogada** (só a Imersão paga) | usar para qualquer outra coisa |
| **Antessala** (conceito interno) | fazer aparecer na interface |
| **Inventário do Jogador** | revelar antes da hora |

**Afirmação onde o motor calcula; hipótese onde o sistema interpreta.**
A posição astronômica é factual dentro do modelo. O significado dela é leitura.
Escreva "no modelo, tende a…" e nunca "você é…".

O texto é inclusivo: `G(masculino, feminino, neutro)` e `flex()` em `app4.js`
flexionam conforme o avatar escolhido. Nunca escreva só no masculino.

---

## 6. Como testar — e por que isso é levado a sério aqui

Os testes ficam em `testes/`, rodam com Playwright + Chromium
(`executablePath: '/opt/pw-browsers/chromium'`).

```bash
node testes/testdatas.mjs  # regressão do motor — obrigatório, sempre
node testes/tfix.mjs        # jornada completa: cartas, PDF, etapas 6B e 7
node testes/tck.mjs         # etapa 7 travada, oferta e tela de checkout
node testes/tadmin.mjs      # Sala de Comando (com fetch simulado)
```

**Três lições pagas com defeito em produção — não repita nenhuma:**

1. **Teste que tem atalho não testa nada.** Um teste daqui clicava em "Pular"
   quando não achava "Continuar" — ou seja, pulava a história inteira e depois
   declarava sucesso. Escondeu por dias um defeito que sumia com as cartas.
   *Atravesse o caminho como uma pessoa atravessaria.*

2. **Contar elemento não é ver elemento.** A jornada mantém poucos blocos na
   tela; contar `.i-bl` dá número certo e conclusão errada. *Olhe a captura.*

3. **Olhe as imagens que o teste gera.** Dois defeitos sérios (a tela de login
   aparecendo por baixo do painel, e o PDF saindo com 8 páginas em branco)
   passaram por todas as asserções e só apareceram na captura de tela.

---

## 7. Regras de comportamento do produto

**Nenhuma mensagem da interface pode mentir sobre o estado do sistema.**
Quando algo falha, a mensagem diz que o problema é nosso:

> "O envio está fora do ar neste momento — é problema meu, não seu."

E nunca "Não consegui enviar", que soa como culpa de quem está lendo.

**A telemetria nunca interrompe a experiência.** Todo `trackEvent` vive dentro de
`try/catch` que engole falha em silêncio. Se o servidor cair, o jogo continua.

**localStorage é fila temporária, não persistência.** Nunca escreva, em código ou
em texto para o jogador, que "nada se perde".

**Esconder não é proteger.** `hidden` com `display:block` no CSS deixa o conteúdo
invisível mas presente — foi assim que a oferta inteira ficou legível no código
antes da hora, ocupando 4.554px de rolagem. Conteúdo que a pessoa ainda não pode
ver não deve estar na página.

---

## 8. O backend

Supabase (projeto `ncvispbuglalzubilvma`, "RPG - OJC").

```
supabase/migracoes/   001 base · 002 painel · 003 cidades · 004 planilha · 005 GODMODE
supabase/functions/   ingestao · enviar-ficha · cidades · planilha
```

- **RLS em tudo.** Leitura de jogadores e eventos só para quem está em
  `admin_users` (a chave é o **e-mail**, não uuid).
- **Edge Functions com `verify_jwt: false`** são chamadas pelo app anônimo —
  por isso elas nunca confiam no corpo da requisição. `enviar-ficha` pega o
  e-mail de destino **da tabela**, nunca do que chegou, senão vira máquina de
  mandar mensagem para terceiros.
- **Segredos:** `RESEND_API_KEY`, `REMETENTE_FICHA`, `RESPOSTA_FICHA`.
- **GODMODE** (`005`) ainda não foi aplicado. Leia o cabeçalho do arquivo antes.

Depois de mexer no banco, rode os *advisors* de segurança do Supabase. O alvo é
**zero**.

---

## 9. O que está aberto

- O **PDF** ainda é uma fotografia da página web — texto não selecionável, pesado.
  A decisão foi: modelo de impressão primeiro (branding), implementação vetorial
  no servidor depois. Ver `docs/BRIEFING-PDF.md`.
- Os **16 tipos** ainda usam nomenclatura MBTI/16Personalities. **Risco de marca
  registrada num produto que é vendido.** Precisa virar mitologia própria.
- **GODMODE** especificado, não aplicado.
- O **webhook da Cakto** não existe ainda: a liberação de acesso após o pagamento
  é manual.

---

## 10. Como o Elvis trabalha

- Ele testa no celular dele, de verdade, e volta com listas numeradas de defeitos.
  Responda item por item, na ordem dele.
- Ele quer **a causa**, não o conserto sozinho. "Achei e consertei" vale menos que
  "era isto, por isto, e a prova é esta".
- Quando algo for limitação sua ou do ambiente, diga. Ele prefere um "não consigo
  verificar isso daqui" a uma garantia que não se sustenta.
- Entregue **arquivo pronto para publicar**, não instruções para ele montar.
