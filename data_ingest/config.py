"""Configuration helpers for data ingestion jobs."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List

from dotenv import load_dotenv


# Load environment variables from the project root `.env` file once this module is imported.
# `find_dotenv` falls back to the current working directory if the file is elsewhere.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env", override=False)


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
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/cryptotrader")
        db_name = mongo_uri.rsplit("/", 1)[-1] if "/" in mongo_uri else "cryptotrader"
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

