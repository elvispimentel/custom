# Módulo Carrosséis — Design

Data: 2026-10-07 · Status: aguardando revisão

## Objetivo

Dar aos clientes do Instituto Galifrael uma ferramenta para transformar um texto em carrossel de Instagram com IA (slides, imagens e ZIP), dentro do painel do projeto deles. Referência de fluxo e layout: a "Forja Igoriana" (tela pública de entrada observada pelo dono do projeto).

## Fora de escopo

- Webhook da Eduzz/Cakto: o acesso vem do papel do cliente no projeto.
- Modo "só o tema" (a IA escrever a copy do zero). A entrada é sempre texto colado.
- Publicação direta no Instagram.
- Tema novo: reaproveita os tokens e o `AppShell` existentes (roxo + dourado).

## Acesso

Rota: `/projects/[projectId]/carrosseis`. O módulo aparece para quem satisfaz `private.can_access_project(projectId)` (helpers no schema `private`, migration 004). Nenhuma tabela de acesso nova.

Correções verificadas no código em 2026-10-07:
- O segmento `[projectId]` da URL é o código do projeto em minúsculas (`prj-001`), resolvido no banco por `projects.code = upper(...)` sob RLS. O UUID não aparece na URL.
- O repo ainda não tem login, middleware nem criação automática de `profiles`. O módulo exige uma sessão Supabase, então o plano inclui login mínimo (e-mail e senha), guarda de sessão só para este módulo e trigger de perfil no cadastro. O restante do painel continua como está.

## Fluxo

1. **Lista** dos carrosséis do projeto, com status (`rascunho`, `gerando_imagens`, `pronto`).
2. **Entrada** (igual à Forja): nome; texto/copy; dados do autor (nome, @usuário, foto); proporção `1:1 | 4:5 | 9:16` (padrão 4:5); slides de 3 a 15 (padrão 7); estilo visual; botão "Gerar estrutura".
3. **Revisão** (confirmação humana): título e copy editáveis por slide; reordenar, apagar, "reescrever este slide". Nenhuma imagem é gerada antes de "Aprovar".
4. **Imagens**: uma por slide, geradas uma a uma, com progresso e "refazer".
5. **Exportar**: ZIP com os slides em PNG na proporção escolhida, montado no navegador (JSZip).

Estilos visuais: Documental Cru, Noir & Suspense, Futurista Tech, Luxo Editorial, Cinematic Horror, Vibrante & Pop, Minimalista Zen. Cada um é uma constante com nome, descrição e fragmento de prompt, em um arquivo único.

## Dados (migration `005_carousels.sql`)

- `carousels`: `id`, `project_id`, `created_by`, `name`, `source_text`, `author_name`, `author_handle`, `author_photo_path`, `aspect` (enum), `slide_count` (3–15), `style` (enum), `status` (enum), timestamps.
- `carousel_slides`: `id`, `carousel_id`, `position`, `title`, `body`, `image_prompt`, `image_path`, `image_status` (`pendente | gerando | pronta | erro`), timestamps. Único `(carousel_id, position)`.
- RLS em ambas as tabelas via `private.can_access_project`, derivando o projeto pelo carrossel nas slides. A unicidade `(carousel_id, position)` é `deferrable initially deferred`, para reordenar vários slides numa só transação. Cliente lê e escreve só nos projetos em que é membro.
- Storage: bucket privado `carousel-assets`, caminho `{project_id}/{carousel_id}/…`, com política equivalente. A foto do autor fica no mesmo bucket.
- Cota: tabela de contagem diária de imagens por projeto, limite configurável por variável de ambiente.

## IA (somente servidor)

- Módulo `lib/ai` (a "AI Gateway" prevista em `docs/ARCHITECTURE.md`): único ponto que fala com o provedor.
- `POST /api/carrosseis/[id]/estrutura`: texto → slides em saída estruturada, validada por zod.
- `POST /api/carrosseis/[id]/slides/[slideId]/imagem`: gera uma imagem por chamada, com o estilo embutido no prompt. Respeita o limite de duração das funções da Vercel.
- Toda rota valida a sessão e o acesso ao projeto antes de chamar a IA.
- "A IA sugere; ações críticas exigem confirmação humana" (princípio do repo): a etapa de revisão é obrigatória.

## Erros

- Falha ou formato inválido da IA: uma nova tentativa; depois "tentar de novo", com o texto do cliente preservado.
- Falha de imagem: só aquele slide vai para `erro`, com "refazer".
- Cota diária atingida: mensagem clara, sem nova chamada.
- Chaves só em variáveis de ambiente; nada de `OPENAI_API_KEY` no navegador.

## Testes

- RLS no banco: cliente de um projeto não lê nem escreve carrossel, slides ou arquivos de outro projeto.
- Validação zod da estrutura, com entradas válidas e quebradas.
- Ponta a ponta no navegador com a IA simulada: colar texto → estrutura → aprovar → imagens → ZIP.
- `next build` limpo antes de qualquer merge.

## Deploy

Branch própria e PR para `main`; produção só depois da revisão do dono. A migration 005 é aplicada no Supabase com autorização explícita. Variáveis novas na Vercel: modelo de imagem e limite diário (`OPENAI_API_KEY` já existe).

## Pontos em aberto

- Qual modelo de imagem usar (decidido no plano, atrás de uma variável de ambiente).
- Valor padrão do limite diário de imagens por projeto.
