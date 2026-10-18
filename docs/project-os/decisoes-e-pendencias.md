# Project OS: decisões e pendências

> **Para qualquer IA ou pessoa que abrir este repositório:** antes de falar de preço, pacotes, créditos de IA, formulário de qualificação ou do Espelho do Perfil, leia este arquivo inteiro. Ele junta decisões espalhadas em várias conversas. Se uma pendência daqui já foi respondida em outra conversa, atualize este arquivo e cite a fonte.

Última atualização: 17/10/2026.

Fontes:
- `docs/project-os/2026-10-14-revisao-formulario-diagnostico-orcamento.md`: revisão de 14/10/2026 do formulário, do diagnóstico e do orçamento.
- O código do formulário atual fica em `elvispimentel/galifrael-project-os`, no arquivo `lib/mentorship.ts`.

---

## 1. Princípio que governa tudo

**Tem que ser bom para os dois lados.** O negócio precisa ser lucrativo e não pode escravizar o Elvis. Cada preço, pacote e franquia de uso precisa ter margem demonstrada, e não só parecer justo para o cliente.

Desde julho/2026 o Elvis investe tempo e dinheiro no Project OS. Os preços precisam permitir **recuperar esse investimento** (payback). Ainda falta fazer essa conta (ver pendência P3).

---

## 2. Decisões tomadas

| Data | Decisão | Substitui |
|---|---|---|
| 17/10/2026 | **Espelho do Perfil** como porta de entrada gratuita do Project OS, no formato Método Etevê™ (Espelho → Tensão → Virada → Escolha). O objetivo é gerar conversas de diagnóstico que virem pacote, com foco nos 50 clientes. | (nova) |
| 17/10/2026 | O desafio "100 mil seguidores ou 100 mil reais" **foi descartado**. O Elvis não tem esses números hoje, e a promessa ficaria incoerente com o próprio perfil dele. No lugar entra uma **Investigação**: 50 pessoas com o perfil do cliente de alma investigam algo junto com o Elvis. O tema da investigação ainda está aberto (P6). | ideia de 17/10 |
| 17/10/2026 | Os primeiros testadores do Espelho serão **alunos da Professora Sara Costa**, que já sabem quem é seu cliente de alma. O formulário precisa perguntar isso logo no início. | (nova) |
| 17/10/2026 | **Nenhum lead fica sem caminho.** Quem não se qualifica para pacote recebe uma oferta de entrada: o **pacote fundador dos Códices** ou o **plano básico do Project OS**. | (nova) |
| 17/10/2026 | O plano básico **não é mais vendido no mensal de R$ 97**. Passa a custar **R$ 970/ano ou R$ 570/semestre**, no cartão em até 12x, com limite de uso nas ferramentas de IA. | Piso de 14/10 (R$ 97/mês ou R$ 1.000/ano) |
| 17/10/2026 | **O Project OS não é vendido sozinho: ele vem incluído na implementação.** A oferta mínima é implementação a partir de R$ 1.500 mais a ferramenta a R$ 970/ano. **Regra: a ferramenta precisa se pagar e dar lucro sozinha**, sem depender da implementação para cobrir o custo dela. | (esclarecimento) |
| 17/10/2026 | **Três frentes de Investigação, à escolha da pessoa:** Cliente de Alma (consciência: quem você atrai), Gargalo (estrutura: o que trava o negócio) e Tempo (liberdade: onde o negócio consome sua vida). Elas correspondem à essência do cartão: consciência, estrutura, autonomia e liberdade. | Pergunta 3 de 17/10 |
| 17/10/2026 | Posicionamento em teste: **Elvis como pesquisador da consciência**, e cada frente é uma investigação da consciência humana aplicada ao negócio. Para quem chega por automação ou vendas, a tradução é: "investigo o que trava o seu negócio, nas pessoas e nos processos". | (hipótese) |
| 17/10/2026 | **O Espelho será construído dentro do Project OS (caminho A):** página pública `/espelho` no Next.js do `galifrael-project-os`, com Supabase e `lib/ai`. A camada do algoritmo lê as regras do **Radar** (`config/algoritmo.json`). A rubrica em Python do repositório `custom` é o protótipo e vira especificação. Princípio do Elvis: "tudo dentro, nada se perde". | (nova) |
| 17/10/2026 | **O Espelho é aberto para todo mundo.** Os alunos da Professora Sara Costa são uma porta de entrada, não a única. O Espelho é do Elvis, e os alunos podem contribuir e ganhar com isso (ver P11). | Ideia de piloto só com alunos da Sara |
| 17/10/2026 | **Pró-labore sai do custo total da empresa**, não do custo de uma ferramenta isolada. Valor atual: **R$ 5.000/mês** (cobre os custos pessoais). Meta futura: **R$ 25.000/mês**. | (nova) |
| 17/10/2026 | **Todo custo é registrado, nada fica de fora.** Cada execução do Espelho e do formulário grava os tokens e o custo de IA, para calcular o custo real por análise e o **CAC final** do cliente. | (nova) |
| 18/10/2026 | **MVP do Espelho aprovado:** formulário de cerca de 15 passos, com amostras grátis ao longo do caminho (o Espelho e o gargalo), **análise aprofundada por R$ 5** paga depois do formulário (opção A, como fazem as análises de mapa astral) e convite para a aula ao vivo. **Uma análise por pessoa e por @, salva para sempre.** Quem volta vê a análise salva, sem custo de IA. Especificação: `galifrael-project-os`, branch `claude/espelho-do-perfil`, arquivo `docs/superpowers/specs/2026-10-18-espelho-do-perfil-design.md`. | (nova) |
| 18/10/2026 | **Os preços têm base de mercado** (benchmark de 4 plataformas na seção 5 deste arquivo, mais a pesquisa de 14/10), não vêm da cabeça. O que ainda não tem base são as **horas de implementação**, porque nenhuma foi feita. O MVP do Espelho existe para medir isso. | (esclarecimento) |
| 18/10/2026 | **Custo fixo atual: R$ 6.044/mês** (R$ 1.044, que já incluem Claude e GPT, mais pró-labore de R$ 5.000). | Estimativa de R$ 7.144 de 17/10 |
| 18/10/2026 | **Implementação por freelancer a R$ 300 cada** (talvez R$ 250, conforme o tamanho), **sem fixo**. Possibilidade de **implementação em conjunto numa reunião semanal**: o cliente paga o pacote (serviço mais ferramenta) e não vê a implementação como item separado. | (nova) |
| 18/10/2026 | **Estrutura de venda:** 3 pacotes para quem se guia sozinho (implementação mais ferramenta), mais a **mentoria por fora** (encontros quinzenais, hot seat, melhoria contínua; **R$ 5.470/trimestre ou R$ 9.870/semestre**; o conteúdo da mentoria ainda será desenvolvido), mais os **Códices avulsos**. O formulário decide o caminho conforme quanto a pessoa já investiu e se quer fazer sozinha ou acompanhada. | (nova) |
| 18/10/2026 | **Funil em teste:** formulário → **apresentação ao vivo semanal, à noite**, no lugar de VSL, para tirar dúvidas e conhecer as pessoas. Sempre gravada, para gerar dados das dúvidas. Cerca de **15 pessoas por sala** no primeiro teste. | (hipótese) |
| 18/10/2026 | **Espelho pago simbólico em teste:** cobrar de **R$ 2 a R$ 5** pela análise, "preço de um cafezinho", para pagar a IA e o tráfego pago. Entrega um relatório básico e convida para a apresentação. Referência: o modelo de workshop pago da PerfectJus. | (hipótese) |
| 14/10/2026 | Implementação a partir de R$ 1.500; mentoria em grupo a R$ 5.000 por 3 meses, sem desconto. Seleção antes do pagamento, investimento visível antes do envio e decisão humana. Detalhes no documento de 14/10. | (vigente) |

---

## 3. Pendências (não decidir sem o Elvis)

| # | Pendência | Por que importa |
|---|---|---|
| P1 | **Estudo de limite de uso e consumo de créditos de IA** por plano: quanto cada ferramenta e agente consome por cliente por mês, e qual franquia cabe em cada preço. Como fazem outras ferramentas de IA. | Sem esse estudo, qualquer franquia é chute e pode dar prejuízo. |
| P2 | **Margem do plano básico.** Conta rápida a partir dos números de 14/10: R$ 970/ano dá R$ 80,83/mês e R$ 570/semestre dá R$ 95/mês. O custo rateado estimado em 14/10, com 30 clientes e pró-labore de R$ 2.500, foi de **R$ 118,13 por cliente por mês**, antes do consumo de IA. **Nessas premissas o plano básico fica no prejuízo.** Ele só fecha com mais clientes, com outro pró-labore ou se o mix com implementação e mentoria cobrir a diferença. | Regra do item 1: o negócio não pode escravizar. |
| P2a | **Quanto a ferramenta precisa custar para se pagar sozinha.** Conta de 17/10, com premissas a validar: taxa de cartão de 5%, margem-alvo de 30% e custo fixo de R$ 1.044/mês (documento de 14/10). Com isso, o preço líquido aproveitável é 65% do preço cheio. **Cenário A, sem pró-labore na conta da ferramenta:** com R$ 970/ano e 30 clientes, sobram cerca de **R$ 17 por cliente por mês para o consumo de IA**. Esse é o teto da franquia. **Cenário B, com pró-labore de R$ 2.500 dentro da conta:** R$ 970/ano só fecha com cerca de 68 clientes ou mais e consumo de IA zero. Com 30 clientes, a ferramenta precisaria custar cerca de R$ 2.180/ano. Decidir em qual cenário o pró-labore entra: na ferramenta ou na implementação e mentoria. | Define se R$ 970 fica de pé. |
| P2b | **R$ 1.500 de implementação é sustentável?** Depende de quantas horas uma implementação mínima leva de verdade e do custo-hora completo (fórmula no documento de 14/10, seção 7). | Ainda não sabemos quantas horas uma implementação mínima leva. |
| P2c | **Custo de IA por análise do Espelho e por formulário completo.** Medição em andamento: em **17/10/2026, por volta das 17h**, foi feita uma recarga mínima de **US$ 6 = R$ 32,93** na OpenAI (câmbio implícito de R$ 5,49/US$) para ver quanto tempo dura. Nesse câmbio, o teto de R$ 17 por cliente por mês equivale a **cerca de US$ 3,10 por cliente por mês** em créditos. O Espelho precisa registrar os tokens de entrada e saída de cada chamada, para o custo vir medido e não estimado. | Define a franquia e o CAC. |
| P2d | **Custo fixo mensal atualizado da empresa.** Valores informados até agora: R$ 659 + US$ 70 (documento de 14/10, cerca de R$ 1.044), **pró-labore R$ 5.000**, **Claude Max cerca de R$ 550/mês** (previsto) e **GPT nível máximo cerca de R$ 550/mês** (previsto). Total aproximado: **R$ 7.144/mês**, a confirmar se Claude e GPT já estavam dentro dos R$ 659 + US$ 70. | É o número que a carteira inteira precisa cobrir todo mês. |
| P3 | **Payback do investimento desde julho/2026**: quanto foi investido em horas e em dinheiro, e em quantos meses a carteira recupera esse valor. | É a recuperação do tempo investido que o Elvis citou. |
| P4 | **Escopo e preço dos pacotes 1, 2 e Master** (ou Organização, Processo prioritário, Processos conectados e Operação ampliada, conforme o documento de 14/10). Os dois esquemas precisam ser conciliados. | O formulário do Espelho direciona para esses pacotes. |
| P5 | **Preço do Master**: a ideia é algo como R$ 10 mil de implementação mais um valor anual que depende do consumo de IA (P1). | Pacote muito personalizado, com alto consumo de créditos. |
| P6 | **Tema da Investigação dos 50**: o que o grupo investiga junto com o Elvis. | Substitui o desafio descartado. |
| P7 | **Autorização da Professora Sara Costa** para usar o nome dela no Espelho ("cliente de alma, como ensina a Professora Sara Costa"). | Usar o nome de alguém precisa de autorização. |
| P8 | **Conciliar a oferta que está no código** (6 meses por R$ 10 mil, capacidade de 15) com a oferta atual (mentoria de 3 meses por R$ 5 mil, implementação variável e plataforma separada). | Item 1 dos problemas do documento de 14/10. |
| P10 | **Caso Sara Costa como referência.** Ela relata cerca de R$ 100 mil/mês sem tráfego pago ("tráfego quântico") a partir do alinhamento e do posicionamento. Pedir permissão para analisar o perfil dela com o Espelho. Se usado na comunicação, é **caso relatado por ela**, nunca promessa ("você também vai faturar"). "Tráfego quântico" entra como linguagem, não como fato científico. | Regra do cartão: sem promessa de resultado financeiro. |
| P11 | **"Alunos da Sara podem contribuir e ganhar"**: definir o modelo (indicação com comissão? parceria com a Sara?) e as regras de repasse. Já existe um modelo de comissões no Drive (`Modelo de Comissões, Atribuição e Controle Financeiro.md`, workshops do Jogo da Vida). | Hipótese de 17/10. |
| P12a | **Taxas da Cakto para um produto de R$ 5** (informadas pelo Elvis em 18/10/2026), por venda aprovada: **Pix R$ 2,49** (líquido R$ 2,51); cartão ou boleto cerca de R$ 2,74 (líquido R$ 2,26); PicPay cerca de R$ 2,84 (líquido R$ 2,16); Apple Pay ou Google Pay cerca de R$ 2,94 (líquido R$ 2,06). **Saque: R$ 4,59 por solicitação.** Conclusão: a R$ 5, metade fica com o meio de pagamento. **Sugestão: checkout só com Pix e saques acumulados.** O líquido de R$ 2,51 paga a IA, mas não paga tráfego pago. Para tráfego, simular R$ 9,90 (pedir à Cakto a taxa nesse valor). | Define o preço do Espelho. |
| P12 | **Espelho pago: R$ 2 é viável?** Conferir a **taxa fixa por venda da Cakto** (ou do gateway): numa venda de R$ 2, uma taxa fixa pode comer o valor inteiro. Avaliar de R$ 5 a R$ 9,90. Hipótese: **gratuito para quem vem orgânico (stories)** e **pago para quem vem de tráfego pago**. | Não pagar para vender. |
| P13 | **O que entra em cada pacote** (ferramentas e agentes) e o que a implementação faz em cada um. Depende do inventário real das ferramentas (P9) e das 3 ofertas piloto sugeridas: orçamento, atendimento/agendamento e cobrança. | Sem isso não se mede hora nem preço da implementação. |
| P14 | **Dream 100 do benchmark:** só 4 das 100 referências foram analisadas. | O benchmark ainda é inicial. |
| P9 | **Estado real de cada ferramenta do catálogo** (30 entradas). Só se vende como contratação o que estiver implementado, testado e pronto para entregar. | Não vender promessa como produto. |

---

## 4. Espelho do Perfil: rascunho do fluxo (em brainstorming, não aprovado)

0. **Capa:** "Será que você está atraindo o cliente que quer vender? Descubra grátis." Aviso forte: só funciona com perfil comercial ou de criador. Botão Iniciar.
1. **Apresentação:** como quer ser chamado, e-mail, WhatsApp e consentimento LGPD.
2. **Pergunta para alunos da Sara Costa:** "Você já sabe quem é o seu cliente de alma?" Se sim, a pessoa descreve, e o Espelho passa a comparar o retrato atual com esse cliente de alma declarado.
3. **Instagram:** a pessoa cola o @ ou o link e confirma o perfil. Se o perfil for pessoal, aparece uma tela explicando como convertê-lo em profissional (é grátis) e convidando a voltar.
4. **Espelho:** o retrato atual (quem o perfil atrai, com quais dores e em que tom), com miniaturas dos posts que servem de evidência.
5. **Tensão:** "É esse o cliente que você quer atrair?" Só Sim ou Não.
6. **Virada:** no Sim, acelerar. No Não, perguntar o que a pessoa quer mudar e qual é o cliente ideal ou de alma dela.
7. **Qualificação:** reaproveita o formulário proposto em 14/10, com as ramificações.
8. **Escolha:** pacote adequado, agendamento direto para quem se encaixa, ou oferta de entrada (Códices ou plano básico).

O código reaproveitável está em `inteligencia-concorrentes/`: `collect_perfil_publico`, a rubrica (camadas A e B) e o cartão do cliente de alma.

---

## 5. Benchmark inicial de mercado (trazido pelo Elvis em 18/10/2026)

Benchmark inicial de **4 plataformas** a partir das fontes oficiais. **Não é o Dream 100.**

| Referência | Evidência verificada | Implicação para o Project OS |
|---|---|---|
| RD Station CRM | Basic por R$ 65,70/usuário/mês no anual; implantação personalizada opcional de R$ 849 nos planos Basic e Pro. | Assinatura e implantação podem ser produtos separados. |
| Kommo | Diferencia os planos por automações, recursos de IA e limites de uso. Tem preços regionais; a tabela global não deve ser tratada como cotação brasileira. | Cobrar por capacidade operacional, com limites claros de canais, agentes e consumo. |
| Brevo | Oferece complementos contratados e cobrados separadamente. | O cliente contrata a solução de que precisa sem comprar todas as categorias. |
| Bitrix24 | Reúne CRM, tarefas e comunicação, com preço por empresa e usuários incluídos conforme o plano. | "Tudo em um lugar" já existe no mercado; é preciso demonstrar uma vantagem a mais. |

**Diferenciação proposta:** ajudar o empresário a identificar o gargalo atual, implementar a solução necessária e acompanhar a mudança na operação. Vender uma **operação orientada por objetivos, com contratação modular**, e não a quantidade de aplicativos.

**Exemplos de oferta:**
- orçamentos esquecidos → organizar propostas e retomadas;
- atendimentos perdidos → organizar atendimento e agendamento;
- mensalidades em atraso → organizar a cobrança;
- publicações sem direção → organizar oferta, calendário e conteúdo.

**Não prometer de 10% a 30% de crescimento** antes de conhecer a linha de base.

**Planos em hipótese (não validados):**

| Plano | Preço | Papel |
|---|---|---|
| Essencial | R$ 97/mês ou R$ 970/ano | Anfitrião, base, tarefas, propostas e calculadoras, com limites de uso |
| Crescimento | R$ 197/mês ou R$ 1.970/ano | Essencial mais uma solução padronizada para o gargalo |
| Master | R$ 497/mês ou R$ 4.970/ano | Combinação de soluções, dentro de escopo definido |

Implantação personalizada e mentoria têm orçamento próprio. Também deve ser possível contratar um módulo avulso.

**Próximas ações sugeridas:**
1. Fazer o inventário real das ferramentas.
2. Escolher 3 ofertas piloto.
3. Calcular o custo de cada entrega.
4. Testar com clientes reais, registrando por que escolheram ou recusaram.
5. Reorganizar o início e o menu do painel.
