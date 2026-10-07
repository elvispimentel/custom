# Módulo Carrosséis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clientes membros de um projeto transformam um texto colado em carrossel de Instagram (slides revisados, imagens por IA, ZIP em PNG) dentro de `/projects/[projectId]/carrosseis`.

**Architecture:** Módulo novo dentro do app Next.js 15 existente. Supabase guarda dados, arquivos e RLS. Toda chamada de IA passa por `lib/ai` e roda só no servidor; handlers são funções puras com dependências injetadas, o que permite testá-los sem rede. A composição final dos slides (imagem + texto) e o ZIP rodam no navegador.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase (`@supabase/ssr`), zod, JSZip, Vitest, Playwright, CSS próprio (sem Tailwind).

**Spec:** `docs/superpowers/specs/2026-10-07-carrosseis-design.md`

## Global Constraints

- Rota do módulo: `/projects/[projectId]/carrosseis`; `[projectId]` é o código do projeto em minúsculas (`prj-001`), resolvido por `projects.code = upper(param)` sob RLS.
- Proporções `1:1 | 4:5 | 9:16`, padrão `4:5`. Slides de 3 a 15, padrão 7. Texto colado: 1 a 20000 caracteres.
- Estilos (ids): `documental-cru`, `noir-suspense`, `futurista-tech`, `luxo-editorial`, `cinematic-horror`, `vibrante-pop`, `minimalista-zen`.
- Visual: tokens e `AppShell` existentes (roxo + dourado), CSS em `app/globals.css`. Sem Tailwind.
- IA só no servidor. `OPENAI_API_KEY` nunca vai ao navegador. Nenhuma imagem é gerada antes de "Aprovar".
- Bucket privado `carousel-assets`, caminho `{project_id}/{carousel_id}/…`. Helpers de acesso: `private.can_access_project` (migration 004).
- Migration `005_carousels.sql` só é aplicada em um Supabase real com autorização explícita do dono.
- Branch própria e PR para `main`. Textos de UI em pt-BR.

**Decisões do plano (a spec não fixava):** limite diário padrão 30 imagens/projeto (`CAROUSEL_DAILY_IMAGE_LIMIT`); imagem da IA em 1024×1024 (1:1) ou 1024×1536 (4:5 e 9:16) e recorte no navegador; slide final em PNG = imagem de fundo + título + copy + @autor, composto em canvas (1080×1080, 1080×1350, 1080×1920); IA fake (`AI_GATEWAY=fake`) para testes e ponta a ponta.

## Review Focus

1. Texto colado vazio ou com mais de 20000 caracteres: mensagem de validação e nenhuma chamada à IA. (Tasks 1 e 5)
2. Requisição sem sessão: página redireciona para `/login`, API devolve 401; `next=//evil.com` é ignorado; código de projeto inexistente ou sem acesso dá 404. (Tasks 3 e 5)
3. IA devolve JSON quebrado ou número de slides diferente do pedido: uma nova tentativa, depois erro, com o texto do cliente preservado. (Tasks 4 e 5)
4. Duplo clique em "refazer" ou duas abas: uma única geração e cota debitada uma vez; falha devolve a cota. (Task 6)
5. Foto do autor que não é imagem ou passa de 5 MB; título ou copy gigante estourando o slide: rejeitar a foto, quebrar linha até em palavra sem espaços. (Tasks 5 e 9)

---

### Task 1: Constantes, schemas e Vitest

**Files:**
- Create: `lib/carousels/constants.ts`, `lib/carousels/schema.ts`, `lib/carousels/schema.test.ts`, `vitest.config.ts`
- Modify: `package.json` (dev: `vitest`; script `"test": "vitest run"`)

**Interfaces:**
- Produces (`constants.ts`): `ASPECTS = ["1:1","4:5","9:16"] as const`, `type Aspect`; `ASPECT_PIXELS: Record<Aspect,{width:number;height:number}>`; `STYLE_IDS` (os 7 ids), `type StyleId`; `STYLES: Record<StyleId,{label:string;description:string;promptFragment:string}>`; `SLIDE_MIN=3`, `SLIDE_MAX=15`, `SLIDE_DEFAULT=7`, `SOURCE_TEXT_MAX=20000`.
- Produces (`schema.ts`): `slideDraftSchema` e `type SlideDraft = {title:string;body:string;imagePrompt:string}` (title ≤120, body ≤600, imagePrompt ≤500, todos não vazios); `structureSchema(slideCount:number)` → objeto `{slides: SlideDraft[]}` com exatamente `slideCount` itens; `createCarouselInput` com `name`, `sourceText`, `authorName`, `authorHandle`, `aspect`, `slideCount`, `style`.

- [ ] **Step 1: Escrever `schema.test.ts` (falhando)**: `structureSchema(7)` aceita 7 slides válidos, rejeita 6 e rejeita título vazio; `createCarouselInput` rejeita `sourceText` `""` e de 20001 caracteres, rejeita `slideCount` 2 e 16, aceita 3 e 15, rejeita `aspect` `"3:2"`; `STYLE_IDS.length === 7` e todo `STYLES[id].promptFragment` não vazio; `ASPECT_PIXELS["4:5"]` igual a `{width:1080,height:1350}`.
- [ ] **Step 2: Rodar `npx vitest run lib/carousels`.** Esperado: FAIL (módulos não existem).
- [ ] **Step 3: Implementar `constants.ts` e `schema.ts`** conforme Interfaces. As descrições dos estilos vêm do print da Forja (ex.: Noir & Suspense: "Sombras profundas, alto contraste, atmosfera de mistério"); cada `promptFragment` é uma frase em inglês descrevendo o estilo.
- [ ] **Step 4: Rodar `npx vitest run lib/carousels`.** Esperado: PASS.
- [ ] **Step 5: Commit** `git add package.json package-lock.json vitest.config.ts lib/carousels && git commit -m "feat: constantes e schemas do módulo de carrosséis"`

### Task 2: Migration 005 e testes de RLS

**Files:**
- Create: `supabase/migrations/005_carousels.sql`, `supabase/tests/005_carousels_rls.test.sql` (pgTAP, `supabase test db`)
- Modify: `docs/DEPLOYMENT.md` (ordem das migrations passa a listar 004, 005 e 006)

**Interfaces:**
- Produces: enums `carousel_aspect`, `carousel_style` (os 7 ids), `carousel_status` (`rascunho | gerando_imagens | pronto`), `slide_image_status` (`pendente | gerando | pronta | erro`); tabelas `carousels`, `carousel_slides` (colunas da spec, `slide_count` com check 3–15, unique `(carousel_id, position)` deferrable initially deferred), `image_usage(project_id, day date, count int, primary key(project_id, day))`; bucket privado `carousel-assets` com políticas em `storage.objects`; `public.consume_image_quota(p_project uuid, p_limit int) returns boolean` e `public.refund_image_quota(p_project uuid) returns void`, ambas `security definer`, ambas verificando `private.can_access_project(p_project)`.

- [ ] **Step 1: Escrever o teste pgTAP (falhando)** com dois usuários: A (membro do projeto P1) e B (membro de P2). Asserções: A vê o próprio carrossel (1 linha) e B vê 0; B não consegue inserir carrossel em P1 (erro `42501`); B vê 0 slides de A; B não lê objeto em `carousel-assets/{P1}/…`; `slide_count` 2 e 16 violam o check; trocar `position` de dois slides numa só transação funciona; `consume_image_quota(P1, 2)` devolve `true, true, false`; B chamando `consume_image_quota(P1, 2)` falha.
- [ ] **Step 2: Rodar `supabase test db`.** Esperado: FAIL. Sem Docker, aplicar as migrations 001–005 num branch de desenvolvimento do Supabase e rodar o mesmo SQL por `execute_sql`.
- [ ] **Step 3: Escrever `005_carousels.sql`** conforme Interfaces. Políticas das tabelas e do bucket usam `private.can_access_project` (nos slides, derivando o projeto por `exists` no carrossel; no storage, por `(storage.foldername(name))[1]::uuid`); tudo `to authenticated`. Seguir o estilo da 004.
- [ ] **Step 4: Rodar o teste de novo.** Esperado: PASS.
- [ ] **Step 5: Commit** `git add supabase docs/DEPLOYMENT.md && git commit -m "feat: tabelas, storage e cota de imagens dos carrosséis"`

### Task 3: Login mínimo e guarda de sessão

**Files:**
- Create: `supabase/migrations/006_profile_on_signup.sql`, `app/login/page.tsx`, `app/login/actions.ts`, `middleware.ts`, `lib/auth/safe-next.ts`, `lib/auth/safe-next.test.ts`
- Create: `supabase/tests/006_profile_trigger.test.sql`

**Interfaces:**
- Produces: `safeNext(next: string | null): string` devolve `next` só se começar com `/` e não com `//` nem `/\`; senão `"/"`. `signIn(formData: FormData): Promise<void>` (server action, redireciona para `safeNext(next)`). Trigger em `auth.users` que cria `public.profiles` com `global_role = 'client'`. `middleware.ts` com matcher `/projects/:projectId/carrosseis/:path*` e `/api/carrosseis/:path*`: sem sessão, páginas redirecionam a `/login?next=…` e a API responde 401 JSON `{error:"unauthenticated"}`.

- [ ] **Step 1: Escrever `safe-next.test.ts` (falhando)**: `"/projects/prj-001/carrosseis"` passa; `"//evil.com"`, `"https://evil.com"`, `"/\\evil.com"`, `null` e `""` viram `"/"`. Escrever também o teste pgTAP: inserir em `auth.users` cria perfil `client`.
- [ ] **Step 2: Rodar `npx vitest run lib/auth` e `supabase test db`.** Esperado: FAIL.
- [ ] **Step 3: Implementar** `safe-next.ts`, a migration 006, `signIn` (e-mail + senha com `supabase.auth.signInWithPassword`, erro mostrado em pt-BR), a página de login no padrão visual do `AppShell` e o middleware com `@supabase/ssr`.
- [ ] **Step 4: Rodar os testes.** Esperado: PASS. Verificação manual: `npm run dev` e abrir `/projects/prj-001/carrosseis` sem sessão redireciona a `/login?next=%2Fprojects%2Fprj-001%2Fcarrosseis`.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: login mínimo e guarda de sessão do módulo de carrosséis"`

### Task 4: Gateway de IA

**Files:**
- Create: `lib/ai/gateway.ts`, `lib/ai/fake.ts`, `lib/ai/openai.ts`, `lib/ai/structure.ts`, `lib/ai/structure.test.ts`

**Interfaces:**
- Consumes: `SlideDraft`, `structureSchema`, `StyleId`, `Aspect` (Task 1).
- Produces (`gateway.ts`): `interface AiGateway { generateStructure(i:{sourceText:string;slideCount:number;style:StyleId}): Promise<unknown>; rewriteSlide(i:{sourceText:string;slide:SlideDraft;instruction?:string}): Promise<unknown>; generateImage(i:{prompt:string;style:StyleId;aspect:Aspect}): Promise<{bytes:Uint8Array;contentType:"image/png"}> }`; `getGateway(): AiGateway` escolhe por `AI_GATEWAY` (`fake` ou `openai`, padrão `openai`). (`structure.ts`): `class AiStructureError extends Error`; `generateSlides(gw: AiGateway, i:{sourceText:string;slideCount:number;style:StyleId}): Promise<SlideDraft[]>`; `rewriteOne(gw, i): Promise<SlideDraft>`.

- [ ] **Step 1: Escrever `structure.test.ts` com gateway roteirizado (falhando)**: resposta válida de primeira devolve os slides com 1 chamada; inválida e depois válida devolve os slides com 2 chamadas; inválida duas vezes lança `AiStructureError` com 2 chamadas; resposta com 6 slides quando se pediu 7 conta como inválida.
- [ ] **Step 2: Rodar `npx vitest run lib/ai`.** Esperado: FAIL.
- [ ] **Step 3: Implementar `structure.ts`** (valida com `structureSchema(slideCount)`, no máximo 2 tentativas) e `gateway.ts`.
- [ ] **Step 4: Implementar `fake.ts` e `openai.ts`.** Fake: slides determinísticos "Slide N" e um PNG fixo pequeno. OpenAI por `fetch`, sem SDK novo: texto com saída JSON estruturada (`OPENAI_TEXT_MODEL`) e imagem (`OPENAI_IMAGE_MODEL`), prompt = `STYLES[style].promptFragment` + prompt do slide, tamanhos da seção Decisões. Ler as chaves só de `process.env`.
- [ ] **Step 5: Rodar `npx vitest run lib/ai`.** Esperado: PASS. Commit `git add lib/ai && git commit -m "feat: gateway de IA com saída validada e tentativa única de reparo"`

### Task 5: Criar carrossel e rota de estrutura

**Files:**
- Create: `lib/projects/resolve.ts`, `lib/carousels/photo.ts`, `lib/carousels/photo.test.ts`, `lib/carousels/estrutura-handler.ts`, `lib/carousels/estrutura-handler.test.ts`, `app/api/carrosseis/[id]/estrutura/route.ts`, `app/projects/[projectId]/carrosseis/actions.ts`

**Interfaces:**
- Consumes: `createCarouselInput` (Task 1), `generateSlides`, `getGateway` (Task 4), cliente de `lib/supabase/server.ts`.
- Produces: `resolveProject(supabase, routeParam: string): Promise<{id:string;code:string}|null>`; `validatePhoto(file:{type:string;size:number}): {ok:true}|{ok:false;error:string}` (png/jpeg/webp, até 5 MB); `handleEstrutura(deps:{getUser:()=>Promise<{id:string}|null>; getCarousel:(id:string)=>Promise<{id:string;sourceText:string;slideCount:number;style:StyleId}|null>; replaceSlides:(id:string,s:SlideDraft[])=>Promise<void>; gateway:AiGateway}, carouselId:string): Promise<{status:200|401|404|502; body:unknown}>`; server action `createCarousel(projectParam: string, formData: FormData)` que valida com zod, resolve o projeto (404 se nulo), grava o carrossel com status `rascunho`, envia a foto ao bucket e redireciona à revisão.

- [ ] **Step 1: Escrever os testes (falhando)**: `photo.test.ts` rejeita `text/plain` e 5 MB + 1 byte, aceita png/jpeg/webp de 5 MB; `estrutura-handler.test.ts`: sem usuário → 401; carrossel invisível por RLS (`getCarousel` nulo) → 404; sucesso → `replaceSlides` recebe N slides e devolve 200; IA falhando duas vezes → 502 e `replaceSlides` nunca chamado.
- [ ] **Step 2: Rodar `npx vitest run lib/carousels`.** Esperado: FAIL.
- [ ] **Step 3: Implementar `photo.ts` e `estrutura-handler.ts`.**
- [ ] **Step 4: Implementar `resolve.ts`, a route (liga o handler ao Supabase e ao `getGateway()`) e `actions.ts`.** Código de projeto inexistente ou sem acesso chama `notFound()`.
- [ ] **Step 5: Rodar `npx vitest run` e `npx tsc --noEmit`.** Esperado: PASS e sem erros. Commit `git add -A && git commit -m "feat: criar carrossel e gerar estrutura de slides"`

### Task 6: Rota de imagem e cota

**Files:**
- Create: `lib/carousels/imagem-handler.ts`, `lib/carousels/imagem-handler.test.ts`, `app/api/carrosseis/[id]/slides/[slideId]/imagem/route.ts`

**Interfaces:**
- Consumes: `AiGateway.generateImage` (Task 4), `consume_image_quota` e `refund_image_quota` (Task 2).
- Produces: `handleImagem(deps:{getUser; getSlide:(id:string)=>Promise<{id:string;carouselId:string;projectId:string;imagePrompt:string;style:StyleId;aspect:Aspect;carouselStatus:string}|null>; claimSlide:(id:string)=>Promise<boolean>; consumeQuota:()=>Promise<boolean>; refundQuota:()=>Promise<void>; upload:(path:string,bytes:Uint8Array)=>Promise<void>; markSlide:(id:string,s:"pronta"|"erro",path?:string)=>Promise<void>; gateway:AiGateway}, slideId:string): Promise<{status:200|401|404|409|429|502; body:unknown}>`. `claimSlide` faz `update … set image_status='gerando' where id=$1 and image_status<>'gerando'` e devolve se alguma linha mudou.

- [ ] **Step 1: Escrever os testes (falhando)**: carrossel com status `rascunho` → 409 sem tocar na IA; `claimSlide` falso → 409 sem consumir cota; cota esgotada → 429 com `{code:"quota"}` sem chamar o gateway; gateway lança → slide `erro`, `refundQuota` chamado uma vez, 502; sucesso → upload em `{projectId}/{carouselId}/{slideId}.png`, slide `pronta`, 200.
- [ ] **Step 2: Rodar `npx vitest run lib/carousels/imagem`.** Esperado: FAIL.
- [ ] **Step 3: Implementar `handleImagem`** na ordem: usuário, slide, status do carrossel, claim, cota, IA, upload, marcação.
- [ ] **Step 4: Implementar a route** ligando o handler ao Supabase, ao `getGateway()` e ao limite `CAROUSEL_DAILY_IMAGE_LIMIT` (padrão 30).
- [ ] **Step 5: Rodar `npx vitest run`.** Esperado: PASS. Commit `git add -A && git commit -m "feat: geração de imagem por slide com cota diária"`

### Task 7: Lista e formulário de novo carrossel

**Files:**
- Create: `app/projects/[projectId]/carrosseis/page.tsx`, `app/projects/[projectId]/carrosseis/nova/page.tsx`, `components/carousels/CarouselForm.tsx`, `components/carousels/StylePicker.tsx`, `components/carousels/AspectPicker.tsx`
- Modify: `app/globals.css` (classes `.carousel-*` usando as variáveis existentes), `components/ProjectTabs.tsx` (aba `{ href: `${base}/carrosseis`, label: "Carrosséis" }`)

**Interfaces:**
- Consumes: `createCarousel` (Task 5), `STYLES`, `ASPECTS`, `SLIDE_*` (Task 1), `resolveProject` (Task 5).
- Produces: a lista (status por carrossel, link para a revisão) e o formulário com os campos da spec; autor e @ pré-preenchidos com o último carrossel do projeto.

- [ ] **Step 1: Montar a lista** como Server Component: `resolveProject` (nulo → `notFound()`), `select` dos carrosséis do projeto, estado vazio com botão "Novo carrossel".
- [ ] **Step 2: Montar o formulário** com nome, texto, autor, @, foto, proporção (padrão `4:5`), slides (3–15, padrão 7), estilo (7 cartões) e botão "Gerar estrutura", chamando `createCarousel`. Erros de validação aparecem junto ao campo, em pt-BR.
- [ ] **Step 3: Estilizar** com os tokens roxo e dourado.
- [ ] **Step 4: Verificar** `npx tsc --noEmit && npx next build`. Esperado: sem erros.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: lista e formulário de carrosséis"`

### Task 8: Revisão dos slides

**Files:**
- Create: `lib/carousels/reorder.ts`, `lib/carousels/reorder.test.ts`, `app/projects/[projectId]/carrosseis/[carouselId]/page.tsx`, `components/carousels/SlideReview.tsx`
- Modify: `app/projects/[projectId]/carrosseis/actions.ts`

**Interfaces:**
- Consumes: `rewriteOne`, `getGateway` (Task 4).
- Produces: `moveSlide<T extends {position:number}>(slides:T[], from:number, to:number): T[]` e `removeSlide<T extends {position:number}>(slides:T[], position:number): T[]`, ambas devolvendo posições contíguas de 1 a N; `canRemove(count:number): boolean` (falso com 1 slide); server actions `updateSlide`, `reorderSlides`, `deleteSlide`, `rewriteSlide(slideId, instruction?)` e `approveCarousel(carouselId)` (move `rascunho` para `gerando_imagens`).

- [ ] **Step 1: Escrever `reorder.test.ts` (falhando)**: mover 1→3 mantém posições 1..N sem repetição; remover o slide 2 de 7 deixa 6 posições contíguas; `canRemove(1)` é falso e `canRemove(2)` é verdadeiro.
- [ ] **Step 2: Rodar `npx vitest run lib/carousels/reorder`.** Esperado: FAIL.
- [ ] **Step 3: Implementar `reorder.ts`.**
- [ ] **Step 4: Implementar as actions e a tela**: título e copy editáveis, reordenar, apagar (bloqueado no último slide), "reescrever este slide" e "Aprovar". Reordenar grava todas as posições numa só transação (a unicidade é deferrable).
- [ ] **Step 5: Rodar `npx vitest run && npx tsc --noEmit`.** Esperado: PASS. Commit `git add -A && git commit -m "feat: revisão e aprovação dos slides"`

### Task 9: Imagens, composição e ZIP

**Files:**
- Create: `lib/carousels/render-slide.ts`, `lib/carousels/text-wrap.ts`, `lib/carousels/text-wrap.test.ts`, `lib/carousels/zip.ts`, `lib/carousels/zip.test.ts`, `components/carousels/ImageProgress.tsx`
- Modify: `package.json` (`jszip`)

**Interfaces:**
- Consumes: `ASPECT_PIXELS` (Task 1), a rota de imagem (Task 6).
- Produces: `wrapText(measure:(s:string)=>number, text:string, maxWidth:number): string[]` (quebra por palavras e, se uma palavra sozinha excede a largura, por caracteres); `slideFileName(position:number): string` (`slide-01.png`); `renderSlide(i:{image:ImageBitmap;title:string;body:string;authorName:string;authorHandle:string;aspect:Aspect}): Promise<Blob>`; `buildZip(files:{name:string;blob:Blob}[]): Promise<Blob>`.

- [ ] **Step 1: Escrever os testes (falhando)**: `wrapText` com medida de 10 px por caractere e largura 100 nunca devolve linha com mais de 10 caracteres, inclusive para uma palavra de 35 letras sem espaços; `slideFileName(3) === "slide-03.png"` e `slideFileName(12) === "slide-12.png"`; `buildZip` com 2 arquivos devolve um zip legível pelo JSZip com os 2 nomes.
- [ ] **Step 2: Rodar `npx vitest run lib/carousels`.** Esperado: FAIL.
- [ ] **Step 3: Implementar `text-wrap.ts`, `zip.ts` e `render-slide.ts`** (canvas: imagem em cobertura total, véu escuro, título, copy, @autor no rodapé; fonte da página).
- [ ] **Step 4: Implementar `ImageProgress.tsx`**: gera uma imagem por vez em ordem (concorrência 1), mostra progresso e "refazer" por slide, trata 429 com a mensagem de cota, marca o carrossel `pronto` ao fim e oferece "Baixar ZIP".
- [ ] **Step 5: Rodar `npx vitest run && npx tsc --noEmit`.** Esperado: PASS. Commit `git add -A && git commit -m "feat: imagens por slide, composição em canvas e exportação em ZIP"`

### Task 10: Ponta a ponta, variáveis e build

**Files:**
- Create: `playwright.config.ts`, `e2e/carrosseis.spec.ts`
- Modify: `.env.example` (`AI_GATEWAY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`, `CAROUSEL_DAILY_IMAGE_LIMIT`), `docs/DEPLOYMENT.md` (variáveis novas na Vercel; desligar cadastro público no Supabase Auth)

- [ ] **Step 1: Escrever `e2e/carrosseis.spec.ts` (falhando)** com `AI_GATEWAY=fake` e um usuário membro do projeto semeado: login; colar texto; escolher estilo; "Gerar estrutura"; ver 7 slides; editar um título; "Aprovar"; esperar as 7 imagens; "Baixar ZIP" e o download ter 7 PNGs.
- [ ] **Step 2: Rodar `npx playwright test`.** Esperado: FAIL até as peças se encontrarem; corrigir o que aparecer.
- [ ] **Step 3: Atualizar `.env.example` e `docs/DEPLOYMENT.md`.**
- [ ] **Step 4: Rodar `npx vitest run && npx playwright test && npx next build`.** Esperado: tudo verde.
- [ ] **Step 5: Commit** `git add -A && git commit -m "test: fluxo ponta a ponta de carrosséis e variáveis de ambiente"`. Depois, branch já em `origin`, abrir PR para `main` somente se o dono pedir.
