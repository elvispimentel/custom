# Verificação: qual mercado dá para uma IA operar sozinha? (nov/2026)

## Resposta curta
**Sim, existe IA/robô operando 100% sozinho** — em todos os mercados (B3, CME, cripto). Isso é fato. O que **não** existe é evidência pública de que isso dê lucro consistente para pessoa física. "Funciona sozinho" ≠ "ganha dinheiro sozinho".

**Mercado escolhido para começarmos: cripto spot (BTC/ETH/SOL) com Freqtrade.** Motivos:
| Critério | Cripto (Freqtrade) | B3 (MT5) | CME (IBKR) |
|---|---|---|---|
| Simular grátis sem conta | ✅ dry-run | ⚠️ conta demo da corretora | ⚠️ paper trading após abrir conta |
| Roda em Linux/nuvem | ✅ | ❌ MT5 é Windows | ✅ |
| Funciona 24/7 sem você | ✅ | só pregão | quase 24h |
| Código pronto e maduro | ✅ ~50k estrelas | ❌ repos pequenos | ⚠️ |
| Capital mínimo | ~US$100 | R$ 7–15 mil para ser sensato | US$ 2–10 mil |
| Risco extra | exchange offshore | baixo (regulado) | burocracia, câmbio |

Já deixei montado: `robo-cripto/` (config em simulação + estratégia inicial + roteiro de teste). **Ainda não foi executado** — o primeiro passo é rodar o backtest.

B3 (WIN/WDO) continua como segunda fase: mesma lógica, porta para MT5 depois que a estratégia provar algo.

## Checagem do relatório que você colou

| Afirmação | Veredito |
|---|---|
| Tick WIN = 5 pts = R$1,00; WDO = 0,5 pt = R$5,00 | ✅ Correto |
| MT5 + biblioteca Python (`copy_rates_range`, `order_send`) | ✅ Correto, é o caminho padrão |
| Varejo não acessa FIX direto na B3 | ✅ Correto na prática |
| BTG Data Services API | ✅ Existe (pacote `btgsolutions-dataservices-python-client`), mas é **dados**, não envio de ordens |
| "BTG Trader AI" | ❌ Não encontrei produto com esse nome. O BTG lançou o **BTG Trader Desk** (jan/2026). Um site "btgcapital-click.pages.dev" vende "AI Trading Bots" — **parece golpe usando o nome do BTG, não use** |
| SmarttBot integrado ao BTG | ⚠️ Não confirmado. SmarttBot existe e opera WIN/WDO, mas não achei parceria atual com BTG |
| Freqtrade ~56k estrelas, FreqAI | ✅ Plausível (fontes dizem 50k+) |
| FinRL para DRL | ✅ Existe, mas é ferramenta de **pesquisa**, não robô pronto lucrativo |
| `viniciusbarbosapaiva/bot-mini-indice` | ⚠️ Existe, mas tem **1 estrela**, backtest só de jan–jun/2021, usa Prophet. É exemplo de estudo, não base confiável |
| Margem MES "US$40" | ⚠️ É margem de day trade de algumas corretoras; na IBKR é bem maior |
| **Meta R$150–500/dia = 0,5% a 1% ao dia** | ❌ **Esse é o ponto mais perigoso.** 0,6%/dia em ~250 pregões = **mais de 300% ao ano composto**. Nenhum fundo profissional sustenta isso. O relatório trata como "estatisticamente sustentável" sem nenhuma evidência |
| "Perfeitamente viável para uso pessoal" | ⚠️ Viável **tecnicamente**, sim. Financeiramente, não demonstrado |

Uma observação: esse texto parece gerado por outra IA — tem marcas de citação quebradas (`[span_9]`, fórmula sumida) e as fontes [1][2][3] se repetem para tudo. As fontes reais citadas são sobre FinRL/Freqtrade em geral, não comprovam as tabelas de capital e retorno.

## Meta realista para um robô pessoal
- Um robô bom de varejo, se existir, mira algo como **1–3% ao mês** com drawdown controlado. Com R$ 15 mil isso é R$ 150–450 **por mês**, não por dia.
- Primeiro objetivo não é lucro: é provar que a estratégia **não perde** em backtest fora da amostra + 3 meses de simulação.

## Fontes
- BTG Data Services (PyPI): https://pypi.org/project/btgsolutions-dataservices-python-client/3.2.10/
- BTG Trader Desk (Money Times): https://www.moneytimes.com.br/btg-pactual-lanca-btg-trader-desk-plataforma-para-traders-iniciantes-lils/
- SmarttBot e-books (WIN%/WDO%, custos): https://smarttbot.com/wp-content/uploads/2020/08/E-book-Operando-em-Conta-Real-na-SmarttBot.pdf
- Robôs de investimento 2026 (Renova Invest): https://renovainvest.com.br/blog/robos-de-investimento/
- bot-mini-indice: https://github.com/viniciusbarbosapaiva/bot-mini-indice
- FreqAI: https://www.freqtrade.io/en/stable/freqai/
- FinRL (arXiv): https://arxiv.org/pdf/2011.09607
- Pesquisa anterior com as demais fontes: `pesquisas/day-trade-ia-2026.md`
