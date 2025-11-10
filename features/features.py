"""Feature generation routines."""
from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

from db.client import get_ohlcv_df, write_features
from features.indicators import add_basic_indicators, clean_feature_frame

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def generate_for_symbol(symbol: str, interval: str, limit: Optional[int] = None) -> int:
    df = get_ohlcv_df(symbol, interval, limit=limit)
    if df.empty:
        logger.warning("No OHLCV data for %s %s. Skipping.", symbol, interval)
        return 0

    df = add_basic_indicators(df)
    clean_df = clean_feature_frame(df)
    count = 0
    for ts, row in clean_df.iterrows():
        write_features(symbol, interval, ts, row.to_dict())
        count += 1
    logger.info("Wrote %s feature rows for %s %s", count, symbol, interval)
    return count


def generate_bulk(symbols: list[str], intervals: list[str]) -> int:
    total = 0
    for symbol in symbols:
        for interval in intervals:
            total += generate_for_symbol(symbol, interval)
    return total


if __name__ == "__main__":
    import os

    symbols = os.getenv("DEFAULT_SYMBOLS", "BTC/USDT").split(",")
    intervals = os.getenv("FEATURE_INTERVALS", "1m").split(",")
    count = generate_bulk([s.strip() for s in symbols if s.strip()], [i.strip() for i in intervals if i.strip()])
    logger.info("Generated %s feature rows total", count)

