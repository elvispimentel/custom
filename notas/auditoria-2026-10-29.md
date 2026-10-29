# Auditoria de qualidade: conversa do Radar à Jornada de Conteúdo (12/10 a 29/10)

Escopo: tudo o que foi decidido, construído e prometido nesta conversa.
Verificado em 29/10:
- `main` do Project OS na v0.32.1: 324 testes passam e o `tsc` está limpo;
- execuções e avisos do radar no GitHub;
- banco do Supabase;
- histórico dos PRs.

## 1. Combinado × entregue

| Pedido de Elvis | Situação real |
|---|---|
| Acompanhar o algoritmo do Instagram (depois TikTok e YouTube) pelas fontes oficiais | **Entregue.** O radar roda toda segunda, com 20 fontes. |
| Ferramentas do Project OS gerando conteúdo alinhado ao algoritmo | **Entregue** no calendário e nas legendas das 3 redes. Carrossel (Forja) e roteiro ainda não usam as regras. |
| Aprovação de Elvis antes de qualquer regra mudar | **Entregue**, via PR no GitHub. Foi a escolha "A" em 12/10. |
| **Aviso semanal aos usuários** | **NÃO entregue.** O usuário só vê algo em "Atualizações" quando uma regra muda e Elvis mescla. As semanas sem mudança não geram aviso nenhum no Project OS. |
| Jornada de Conteúdo (Idioma → Cliente → Diagnóstico → Planejamento), 3 redes, no painel | **Entregue** (0.12.0). Diagnóstico de Perfil e Raiz estão "em preparação". |
| Idioma da Marca aceitando documento | **Entregue** (0.12.1): .txt/.md com até 60 mil caracteres. **Ainda não testado com IA real.** |
| Estilos de Reels de utilidade e comunicação qualificada | **Entregue** no calendário e nas legendas. |

## 2. Falhas encontradas (por gravidade)

**Alta**
1. **O aviso semanal aos usuários não existe.** O objetivo original de 12/10 ficou pela metade. A tela de aprovação dentro do Project OS foi deixada "fora da v1" na spec e não voltou ao plano.
2. **O radar lê página de bloqueio como se fosse mudança.** Em 29/10, 5 páginas de ajuda do YouTube devolveram o CAPTCHA "unusual traffic" do Google ao robô do GitHub. O radar tratou isso como "mudou" (suspeita), e não como "falhou". Hoje as travas seguram. O risco: se uma regra do YouTube mudar por outra fonte na mesma semana, o texto do CAPTCHA é gravado como cópia oficial e envenena as próximas comparações.
3. **O radar ficou 2 semanas sem IA** (19/10 e 26/10), porque faltava o `OPENAI_API_KEY` no GitHub. A pendência estava anotada desde 15/10, mas eu não a acompanhei. Foi resolvida em 29/10: a IA respondeu e trouxe pistas.

**Média**
4. **Ruído nos avisos:**
   - a versão em inglês britânico da página do YouTube aparece como mudança;
   - o menu do rodapé do TikTok também aparece como mudança.

   Nenhuma regra é afetada, mas o aviso fica longo e confuso.
5. **A Fala do Idioma não tem limite diário de uso.** Está protegida só por login, membro do projeto e tamanho do material. Isso é risco de custo na OpenAI.
6. **A publicação em produção não foi conferida por mim.** A Vercel negou meu acesso (403). A conferência ficou com Elvis.
7. **As pistas da comunidade vêm de blogs de marketing,** com qualidade variável (ex.: "2026-2026"). Elas estão rotuladas como "não alteram regras", então o risco é baixo.

**Processo**
8. **Muitas frentes numa conversa só:**
   - radar;
   - calendário;
   - Supabase;
   - 5-3;
   - Voz Única;
   - pesquisa;
   - jornada.

   Elvis se perdeu, e a diretoria (15/10) corrigiu o rumo.
9. **Eu informei "banco inalterado"** depois dos timeouts da migration. Uma das tentativas tinha aplicado. Não houve dano (o SQL era idempotente na prática e transacional), mas a informação estava errada.
10. **O PR #41 foi mesclado antes de o CI terminar.** O CI passou em seguida. A lição: mesclar só com o verde.

## 3. O que está certo e deve continuar
- **Travas sem IA:**
  - fonte da mesma rede;
  - citação literal;
  - sem promessa;
  - página "suspeita" travada.

  Em 3 semanas de ruído, nenhuma regra errada chegou às ferramentas.
- **Fala do Idioma:** só aceita trecho que aparece literalmente no material, e nada é salvo sem a pessoa.
- **Versões e notas registradas em toda mudança.** Não há versão duplicada (55 de 55 únicas).
- **Voz Única:** não foi publicada nem usada fora do projeto de Elvis.

## 4. Correções propostas (em ordem)
1. **Aviso semanal no Project OS:** a decisão é de Elvis (seção 5).
2. **Página de bloqueio = "falhou":** detectar CAPTCHA, "unusual traffic" e página curta demais; nunca gravar como cópia oficial. É pequena e eu faço.
3. **Remover o ruído:**
   - YouTube com `hl=en&gl=US`;
   - ignorar linhas de menu do rodapé.

   É pequena e eu faço.
4. **Limite diário da Fala:** precisa de uma tabela pequena (migration) e da aprovação de Elvis.
5. **Testar o Idioma com o dossiê:** é com Elvis.

## 5. Decisão pendente de Elvis
Onde o radar vive daqui para frente:
- **A)** No Project OS: Elvis vê e aprova no painel administrativo, e os usuários recebem um "Radar da semana" na página Atualizações (ou no painel).
- **B)** Aprovação continua no GitHub, mas o aviso da semana aparece para os usuários no Project OS.
