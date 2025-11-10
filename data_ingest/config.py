"""Configuration helpers for data ingestion jobs."""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List


def _parse_csv(value: str | None) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class IngestConfig:
    mongo_uri: str
    database: str
    symbols: List[str]
    intervals: List[str]
    source: str = "binance"
    lookback_days: int = 30
    batch_size: int = 1000

    @classmethod
    def from_env(cls) -> "IngestConfig":
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/lenxys-trader")
        db_name = mongo_uri.rsplit("/", 1)[-1] if "/" in mongo_uri else "lenxys-trader"
        lookback_days = int(os.getenv("DEFAULT_LOOKBACK_DAYS", "30"))
        batch_size = int(os.getenv("INGEST_BATCH_SIZE", "1000"))
        return cls(
            mongo_uri=mongo_uri,
            database=db_name,
            symbols=_parse_csv(os.getenv("DEFAULT_SYMBOLS")),
            intervals=_parse_csv(os.getenv("FEATURE_INTERVALS")) or ["1m"],
            lookback_days=lookback_days,
            batch_size=batch_size,
        )

