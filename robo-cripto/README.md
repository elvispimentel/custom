# Robô cripto (MVP pessoal) — Freqtrade em modo simulação

**Dinheiro real: NÃO.** `dry_run: true` com carteira fictícia de 1000 USDT. Não precisa de chave de API nem conta na Binance para simular.

> Status: arquivos escritos mas **ainda não executados** (não consegui instalar o Freqtrade nesta sessão). Primeiro passo é rodar o backtest abaixo e corrigir o que aparecer.

## Instalar (no seu computador, Linux/Mac/WSL) — via Docker é o mais fácil
```bash
cd robo-cripto
docker run --rm -v "$PWD/user_data:/freqtrade/user_data" -v "$PWD/config.json:/freqtrade/config.json" \
  freqtradeorg/freqtrade:stable download-data --config config.json --timerange 20240101- -t 15m 1h
docker run --rm -v "$PWD/user_data:/freqtrade/user_data" -v "$PWD/config.json:/freqtrade/config.json" \
  freqtradeorg/freqtrade:stable backtesting --config config.json --strategy TendenciaSimples --timerange 20240101-
```

## Critério para passar de fase
1. Backtest 2024→hoje com lucro **depois das taxas**, drawdown < 15%, 100+ operações.
2. Mesmo resultado num período que não foi usado para ajustar (ex.: ajustar em 2024, testar em 2025–2026).
3. 3 meses de `dry_run` ao vivo (comando `trade`) parecido com o backtest.
4. Só então: chave de API **sem permissão de saque**, valor pequeno.

## Próxima evolução (depois, não agora)
- FreqAI (modelo de ML que se re-treina sozinho).
- Telegram para receber avisos e ter botão de parar.
