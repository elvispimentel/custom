# Day trade com IA — pesquisa (nov/2026)

> Uso pessoal, não é recomendação de investimento. Fontes no fim. Onde está escrito **[verificar]**, a informação não foi confirmada em fonte primária.

## Síntese executiva

1. **Evidência sobre IA operando sozinha: majoritariamente negativa.** Em competições ao vivo de 2026 reportadas pela Bloomberg, os modelos (LLMs) terminaram no lucro só 6 de 32 vezes, e as carteiras perderam ~1/3 do capital. Nenhum robô de IA acompanhado por especialistas mostrou vantagem duradoura. LLM é melhor como **analista/assistente** do que como **executor**.
2. **No Brasil, day trade manual já é brutal:** no estudo FGV/USP (Chague, De-Losso, Giovannetti) sobre mini índice, 97% de quem persistiu 300+ pregões perdeu dinheiro. Um robô não muda isso sozinho; ele só executa a regra que você der, sem emoção — inclusive uma regra ruim.
3. **Caminho técnico mais simples no Brasil:** **MetaTrader 5 + biblioteca Python oficial `MetaTrader5`** numa corretora que ofereça MT5 para B3 (XP, Rico, Clear, Genial, entre outras — confirmar disponibilidade atual). Funciona para WIN (mini índice) e WDO (mini dólar). Só roda em Windows (ou Wine/VPS Windows).
4. **Cripto é o ambiente mais aberto para robô:** API pública, 24/7, contas demo/testnet, e o melhor ecossistema open source (Freqtrade, Hummingbot, CCXT). Também é o mais volátil.
5. **Exterior (micros da CME):** acessível via Interactive Brokers (API madura), mas abertura de conta é burocrática, margem alta (~US$2.000+ por Micro E-mini S&P na IBKR) e o imposto é declarado por você.
6. **Recomendação prática (MVP):** não começar com dinheiro real. Escolher **um** mercado, montar **uma** estratégia simples com regras explícitas, fazer backtest, depois **3 meses em conta demo**. Só então considerar valor pequeno.

---

## 1. O que "IA que faz day trade" realmente significa

| Tipo | O que é | Realidade |
|---|---|---|
| Robô por regras (EA, bot) | "Se média cruza, compra; stop em X" | 99% dos robôs reais. Sem IA. Previsível e testável. |
| ML clássico | Modelo treinado em dados (ex.: FreqAI, XGBoost) | Fácil de "decorar o passado" (overfitting). Funciona bem no backtest, mal ao vivo. |
| Aprendizado por reforço | Agente aprende por tentativa (FinRL) | Mais acadêmico que lucrativo. |
| LLM (ChatGPT, Claude…) decidindo | Lê notícias/gráfico e manda ordem | Resultados de 2026 ruins: opera demais, perde. Backtest pouco confiável (o modelo já "viu" o passado). |
| LLM como assistente | Escreve código, resume notícias, revisa estratégia | **Uso com melhor custo-benefício hoje.** |

Fato vs hipótese: é **fato** que existem robôs operando sozinhos em todos esses mercados. **Não há evidência pública confiável** de IA de varejo lucrando de forma consistente em day trade. Páginas que prometem "87% ao mês" são marketing.

## 2. Mercados avaliados

| Mercado | Contrato | Horário | Acesso por robô | Prós | Contras |
|---|---|---|---|---|---|
| B3 — mini índice | **WIN** (R$0,20/ponto) | ~9h–18h | MT5 / Profit (NTSL) | Muita liquidez, margem baixa de day trade | Mais disputado, 97% perdem |
| B3 — mini dólar | **WDO** (US$10 mil, R$10/ponto) | ~9h–18h | MT5 / Profit | Reage a juros/fiscal (momento atual do Brasil) | Saltos com notícia, slippage |
| B3 — micro S&P | **WSP** | ~9h–18h | MT5 | S&P em reais, sem conta lá fora | Liquidez menor |
| EUA — CME micros | MES, MNQ, M6E, MBT | quase 24h | IBKR API, NinjaTrader | Mercado mais profundo do mundo | Conta no exterior, margem em dólar, câmbio |
| Cripto | BTC, ETH, SOL etc. (spot ou perpétuos) | 24/7 | API REST/WebSocket aberta | Melhor ecossistema open source, testnet grátis | Volatilidade extrema, risco de corretora, alavancagem perigosa |

Sobre "o momento do Brasil": dólar e índice ficam mais voláteis com juros altos e incerteza fiscal/eleitoral. Volatilidade aumenta oportunidade **e** perda — para robô, aumenta também o risco de stops não executados no preço (gaps).

## 3. Onde operar (corretora/banco)

Ninguém é "garantido". Critérios: segurança (instituição regulada pela CVM/BC, ou exchange grande), **suporte a automação**, custo, estabilidade.

**B3 (WIN/WDO):**
- Corretoras com MT5 para B3 citadas nas fontes: **XP, Rico, Clear, Genial** (todas reguladas; Rico/Clear são do grupo XP). Outras como BTG, Modal/XP, Nova Futura também já ofereceram — **[verificar]** disponibilidade e custo atual (algumas cobram MT5).
- **Profit (Nelogica)**: plataforma mais usada no Brasil; tem linguagem NTSL para robôs e versões com automação (Profit Pro/Ultra). **Profit One não aceita automação** (CM Capital). DLL/API de ordens via Python existe para desenvolvedores, mas documentação é restrita **[verificar com a Nelogica]**.
- Proteção: B3 tem o MRP (Mecanismo de Ressarcimento de Prejuízos) para falhas da corretora — não cobre prejuízo de operação.

**Exterior:** **Interactive Brokers** (API oficial `ibapi`/`ib_async`, conta para brasileiros possível, burocrática). Notícia de jun/2026: CVM abriu acesso a derivativos dos EUA via "introducing broker" — podem surgir opções locais mais simples **[acompanhar]**.

**Cripto:** **Binance** (API mais completa, testnet), **Mercado Bitcoin** (brasileira, API, regulação BC em andamento), **Bybit/OKX** para derivativos. Começar em spot, sem alavancagem.

## 4. Regulação e impostos (resumo)

- Robô que **você mesmo parametriza** para uso próprio não é atividade regulada pela CVM (vender sinais/robô para terceiros é outra história). Seu caso — uso pessoal — está no lado tranquilo.
- B3 identifica operações e tem regras anti-autoexecução (STP); a corretora pode exigir cadastro para algoritmos.
- **IR day trade B3:** 20% sobre lucro líquido mensal, DARF código 6015, 1% retido na fonte ("dedo-duro"). Prejuízo compensa lucro futuro de day trade.
- **Cripto e exterior:** regras mudaram recentemente (Lei 14.754/2023 e propostas de 2025) **[verificar com contador as alíquotas atuais]**.

## 5. Open source no GitHub — o que dá para usar

### B3 / MetaTrader 5
| Projeto | Para quê |
|---|---|
| `MetaTrader5` (pip, oficial MetaQuotes) | Python lê cotações e envia ordens pelo MT5. **Base recomendada.** |
| `paulo-al-castro/mt5b3` | Wrapper brasileiro do MT5 focado na B3, com backtest. Verificar se ainda é mantido. |
| MQL5 (linguagem nativa do MT5) + Strategy Tester | Backtest com dados tick da B3 dentro do próprio MT5. |

### Backtest e pesquisa (qualquer mercado)
| Projeto | Para quê |
|---|---|
| `vectorbt` | Backtest muito rápido em pandas — ótimo para testar ideias. |
| `backtrader` / `backtesting.py` | Simples, didáticos. |
| `nautilus_trader` | Profissional (Rust+Python), mesmo código no backtest e ao vivo; conecta IBKR, Binance, Bybit. Curva de aprendizado alta. |
| `FinRL` | Aprendizado por reforço em finanças (acadêmico). |

### Cripto
| Projeto | Para quê |
|---|---|
| `freqtrade/freqtrade` | O mais popular (~50 mil estrelas). Estratégias em Python, backtest, otimização, **modo dry-run**, Telegram, e **FreqAI** (machine learning). **Melhor ponto de partida.** |
| `hummingbot/hummingbot` | Market making e arbitragem. Mais avançado. |
| `ccxt/ccxt` | Biblioteca que fala com 100+ exchanges. Base de quase tudo. |
| `Drakkar-Software/OctoBot` | Interface web, mais amigável. |
| `jesse-ai/jesse` | Backtest e bots em Python, sintaxe limpa. |

### Exterior (IBKR)
| Projeto | Para quê |
|---|---|
| `ib_async` (sucessor do `ib_insync`) | Python assíncrono para API da Interactive Brokers. |

## 6. Arquitetura sugerida para um programa pessoal

```
[dados] → [estratégia com regras] → [gestão de risco] → [executor] → [log/diário]
                    ↑
         [LLM opcional: resumo de notícias / filtro "não operar hoje"]
```

Regras de risco obrigatórias no código (não negociáveis):
- Perda máxima diária (ex.: 2% da conta) → robô desliga sozinho.
- Stop em toda ordem, enviado junto.
- Número máximo de operações por dia.
- Não operar em horário de notícia forte (Copom, payroll, abertura).
- Botão de emergência (kill switch).

## 7. Plano MVP (distinguindo o que é preciso agora)

| Etapa | Critério de conclusão |
|---|---|
| 1. Escolher **um** mercado | Decisão registrada (sugestão: cripto spot com Freqtrade **ou** WIN com MT5 demo) |
| 2. Estratégia simples escrita em português | Regras de entrada, saída, stop e tamanho em 1 página |
| 3. Backtest | 2+ anos de dados, incluindo custos; resultado fora da amostra |
| 4. Dry-run / conta demo | 3 meses, com diário |
| 5. Real com valor que aceita perder | Só se 3 e 4 forem positivos |

**Para depois (não agora):** LLM tomando decisão, múltiplos mercados, machine learning, VPS 24/7.

## 8. Riscos e limitações honestas

- Backtest bonito é o erro mais comum (overfitting, custos esquecidos, slippage).
- Alavancagem em mini contratos: uma notícia pode levar mais que a margem.
- Robô quebra: internet, plataforma travada, ordem duplicada.
- Fontes desta pesquisa: muitas são blogs e vendedores; números de estrelas e margens mudam. Confirme na fonte oficial antes de agir.

## Fontes

- Bloomberg via Business Standard — bots de IA perdendo dinheiro (2026): https://www.business-standard.com/markets/news/ai-bots-auditioning-for-wall-street-trading-are-mostly-losing-money-126050701793_1.html
- Bloomberg Línea — maioria dos modelos perde em competições: https://www.bloomberglinea.com.br/2026/05/09/ia-vai-substituir-gestores-de-acoes-maioria-dos-modelos-perde-dinheiro-em-competicoes/
- ThinkAdvisor — por que bots de IA não substituem gestores: https://www.thinkadvisor.com/amp/2026/05/06/why-ai-bots-arent-ready-to-replace-your-fund-manager/
- Elm Wealth — AI trading: https://elmwealth.com/ai-trading/
- arXiv — avaliação de LLMs em investimento: https://arxiv.org/pdf/2505.07078v4
- Chague, De-Losso, Giovannetti — day trade mini índice (SSRN 3423101): https://www.scribd.com/document/428540384/SSRN-id3423101
- Monitor Mercantil — pesquisa Axia: https://monitormercantil.com.br/perfil-profissional-muda-e-day-trade-passa-a-gerar-renda-para-quase-60-dos-operadores/
- TabNews — variáveis do mini dólar e API Nelogica: https://www.tabnews.com.br/EdilsonMaia/as-67-variaveis-do-mini-dolar-por-que-seu-robo-vai-falhar-e-o-freela-que-prova-isso
- Fórum MQL5 — MT5 na B3 (Rico, Clear): https://www.mql5.com/pt/forum/stock-exchange
- CM Capital — Profit One sem automação: https://ajuda.cmcapital.com.br/hc/pt-br/articles/30033785510039-PROFIT-ONE-Principais-funcionalidades
- Artigo sobre robôs e CVM: https://revista2.grupointegrado.br/revista/index.php/perspectivascontemporaneas/article/download/3624/1376/18320
- B3 — regras RLP para WIN e WDO: https://www.b3.com.br/data/files/17/B4/88/14/AEA99910F5D34899AC094EA8/OC%20038-2025-VNC%20NOVAS%20REGRAS%20DE%20FUNCIONAMENTO%20DE%20OFERTA%20RLP%20NO%20MERCADO%20DE%20ACOES%20E%20PARA%20OS%20MINICONTRATOS%20FUTUROS%20WIN%20E%20WDO_PT.pdf
- B3 — InvestorID/STP: https://www.b3.com.br/data/files/87/40/BC/3B/1E7BE910ADC36BE9AC094EA8/CE%20030-2026-VNC%20IMPLEMENTACAO%20DA%20FUNCIONALIDADE%20DE%20GERACAO%20DE%20CODIGO%20DE%20INVESTIDOR%20INVESTORID%20PELA%20B3_PT.pdf
- CME — futuros de índice para brasileiros: https://www.cmegroup.com/pt/articles/2023/use-us-equity-index-futures-versus-exchange-traded-funds-for-brazilian-investors.html
- Capital Aberto — CVM abre derivativos dos EUA via introducing broker (jun/2026): https://capitalaberto.com.br/regulacao/2026/06/cvm-abre-bolsas-de-derivativos-dos-eua-ao-introducing-broker
- Awake Trader — IBKR para brasileiros 2026: https://www.awaketrader.com/pt/educacao/interactive-brokers-brasil-2026-como-abrir-conta
- BrokerChooser — corretoras de futuros Brasil: https://brokerchooser.com/best-brokers/best-futures-brokers-for-beginners/brazil
- Gainium — bots open source (fonte comercial): https://gainium.io/best/open-source
- DEV — bots open source cripto: https://dev.to/ctm8/7-best-open-source-crypto-trading-bots-2025-ranked-reviewed-fgi
