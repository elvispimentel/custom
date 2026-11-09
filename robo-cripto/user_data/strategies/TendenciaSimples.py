"""
Estratégia inicial: seguir tendência com proteção de risco.
Regras (em português):
- Só compra se a média de 200 períodos (1h aprox. via 15m*200) estiver subindo e o preço acima dela.
- Entra quando a EMA rápida (9) cruza acima da EMA lenta (21) e o RSI não está esticado (< 70).
- Sai no cruzamento contrário, no stop de 3% ou no trailing stop.
- Proteções: pausa após sequência de perdas e após drawdown diário.
Objetivo: ser um ponto de partida TESTÁVEL, não uma estratégia lucrativa garantida.
"""
from pandas import DataFrame
import talib.abstract as ta
from freqtrade.strategy import IStrategy, IntParameter
from freqtrade.strategy import qtpylib


class TendenciaSimples(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = "15m"
    can_short = False

    minimal_roi = {"0": 0.06, "120": 0.03, "360": 0.01}
    stoploss = -0.03
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02
    trailing_only_offset_is_reached = True

    startup_candle_count = 220
    ema_rapida = IntParameter(5, 15, default=9, space="buy")
    ema_lenta = IntParameter(18, 40, default=21, space="buy")

    @property
    def protections(self):
        return [
            {"method": "CooldownPeriod", "stop_duration_candles": 4},
            {"method": "StoplossGuard", "lookback_period_candles": 96,
             "trade_limit": 3, "stop_duration_candles": 96, "only_per_pair": False},
            {"method": "MaxDrawdown", "lookback_period_candles": 96,
             "trade_limit": 5, "stop_duration_candles": 96, "max_allowed_drawdown": 0.05},
        ]

    def populate_indicators(self, df: DataFrame, metadata: dict) -> DataFrame:
        for n in range(5, 41):
            df[f"ema_{n}"] = ta.EMA(df, timeperiod=n)
        df["ema_200"] = ta.EMA(df, timeperiod=200)
        df["rsi"] = ta.RSI(df, timeperiod=14)
        return df

    def populate_entry_trend(self, df: DataFrame, metadata: dict) -> DataFrame:
        r, l = df[f"ema_{self.ema_rapida.value}"], df[f"ema_{self.ema_lenta.value}"]
        df.loc[
            qtpylib.crossed_above(r, l)
            & (df["close"] > df["ema_200"])
            & (df["ema_200"] > df["ema_200"].shift(8))
            & (df["rsi"] < 70)
            & (df["volume"] > 0),
            "enter_long",
        ] = 1
        return df

    def populate_exit_trend(self, df: DataFrame, metadata: dict) -> DataFrame:
        r, l = df[f"ema_{self.ema_rapida.value}"], df[f"ema_{self.ema_lenta.value}"]
        df.loc[qtpylib.crossed_below(r, l) & (df["volume"] > 0), "exit_long"] = 1
        return df
