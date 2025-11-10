"""Fetch historical OHLCV data and store it in MongoDB."""
from __future__ import annotations

import logging
from argparse import ArgumentParser
from datetime import datetime, timedelta
from typing import Iterable, Optional

import ccxt  # type: ignore
from pymongo import MongoClient, UpdateOne

from data_ingest.config import IngestConfig

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _exchange(name: str) -> ccxt.Exchange:
    exchange_class = getattr(ccxt, name)
    return exchange_class({"enableRateLimit": True})


def _build_ops(symbol: str, timeframe: str, rows: Iterable[list], source: str) -> list[UpdateOne]:
    operations: list[UpdateOne] = []
    for open_time, open_, high, low, close, volume in rows:
        ts = datetime.utcfromtimestamp(open_time / 1000)
        doc = {
            "symbol": symbol,
            "interval": timeframe,
            "timestamp": ts,
            "open": float(open_),
            "high": float(high),
            "low": float(low),
            "close": float(close),
            "volume": float(volume),
            "source": source,
        }
        operations.append(
            UpdateOne(
                {"symbol": symbol, "interval": timeframe, "timestamp": ts},
                {"$set": doc},
                upsert=True,
            )
        )
    return operations


def fetch_symbol_interval(
    symbol: str,
    timeframe: str,
    since: Optional[int] = None,
    limit: int = 1000,
    config: Optional[IngestConfig] = None,
    lookback_days: Optional[int] = None,
) -> int:
    """Fetch data for a single symbol/timeframe combination."""
    config = config or IngestConfig.from_env()
    limit = limit or config.batch_size
    lookback_days = lookback_days if lookback_days is not None else config.lookback_days
    exchange = _exchange(config.source)
    timeframe_ms = int(exchange.parse_timeframe(timeframe) * 1000)

    start_since = since
    if start_since is None and lookback_days and lookback_days > 0:
        start_since = int((datetime.utcnow() - timedelta(days=lookback_days)).timestamp() * 1000)

    total = 0
    now_ms = exchange.milliseconds()

    logger.info(
        "Fetching %s %s candles (batch=%s, lookback_days=%s)",
        symbol,
        timeframe,
        limit,
        lookback_days,
    )

    with MongoClient(config.mongo_uri) as client:
        db = client.get_database(config.database)
        collection = db["ohlcv"]

        if start_since is not None:
            next_since = start_since
            while True:
                candles = exchange.fetch_ohlcv(symbol, timeframe=timeframe, since=next_since, limit=limit)
                if not candles:
                    logger.info("No more candles returned for %s %s at since=%s", symbol, timeframe, next_since)
                    break

                ops = _build_ops(symbol, timeframe, candles, config.source)
                if ops:
                    collection.bulk_write(ops, ordered=False)
                    total += len(ops)

                last_open = candles[-1][0]
                next_since = last_open + timeframe_ms
                if len(candles) < limit or next_since >= now_ms:
                    break
        else:
            candles = exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            if not candles:
                logger.warning("No candles returned for %s %s", symbol, timeframe)
                return 0
            ops = _build_ops(symbol, timeframe, candles, config.source)
            if ops:
                collection.bulk_write(ops, ordered=False)
                total += len(ops)

    logger.info("Stored %s candles for %s %s", total, symbol, timeframe)
    return total


def _parse_args() -> tuple[Optional[str], Optional[str], Optional[int], int, Optional[int]]:
    parser = ArgumentParser(description="Fetch OHLCV data into MongoDB.")
    parser.add_argument("--symbol", help="Trading pair symbol, e.g., BTC/USDT")
    parser.add_argument("--interval", help="Timeframe, e.g., 1m, 1h, 1d")
    parser.add_argument("--since", type=int, help="UNIX ms timestamp to start from")
    parser.add_argument("--limit", type=int, default=1000, help="Max candles per call")
    parser.add_argument("--lookback-days", type=int, help="Number of days to backfill if --since not provided")
    args = parser.parse_args()
    return args.symbol, args.interval, args.since, args.limit, args.lookback_days


def main() -> None:
    config = IngestConfig.from_env()
    symbol, interval, since, limit, lookback_days = _parse_args()
    total = 0

    symbols = [symbol] if symbol else config.symbols
    intervals = [interval] if interval else config.intervals

    if not symbols:
        raise ValueError("No symbols defined. Set DEFAULT_SYMBOLS or pass --symbol.")
    if not intervals:
        raise ValueError("No intervals defined. Set FEATURE_INTERVALS or pass --interval.")

    for sym in symbols:
        for intv in intervals:
            total += fetch_symbol_interval(
                sym,
                intv,
                since=since,
                limit=limit,
                config=config,
                lookback_days=lookback_days,
            )

    logger.info("Completed ingestion: %s total candles upserted", total)


if __name__ == "__main__":
    main()

