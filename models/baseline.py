"""Baseline persistence model using moving average crossover."""
from __future__ import annotations

import numpy as np
import pandas as pd


class MovingAverageBaseline:
    def __init__(self, fast: int = 9, slow: int = 21) -> None:
        self.fast = fast
        self.slow = slow

    def fit(self, _: pd.DataFrame, __: pd.Series) -> "MovingAverageBaseline":
        # No training needed for rule-based baseline.
        return self

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        fast_ma = df["close"].rolling(self.fast).mean()
        slow_ma = df["close"].rolling(self.slow).mean()
        signal = np.where(fast_ma > slow_ma, 1, -1)
        return signal[-len(df) :]

