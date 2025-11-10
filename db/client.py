"""MongoDB client helpers used across Phase 0 modules."""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

import pandas as pd
from pymongo import MongoClient


def _mongo_uri() -> str:
    return os.getenv("MONGO_URI", "mongodb://localhost:27017/lenxys-trader")


@contextmanager
def mongo_client() -> Iterator[MongoClient]:
    client = MongoClient(_mongo_uri())
    try:
        yield client
    finally:
        client.close()


def get_database_name(default: str = "lenxys-trader") -> str:
    uri = _mongo_uri()
    return uri.rsplit("/", 1)[-1] if "/" in uri else default


def get_ohlcv_df(symbol: str, interval: str, limit: int | None = None) -> pd.DataFrame:
    with mongo_client() as client:
        db = client[get_database_name()]
        cursor = (
            db["ohlcv"]
            .find({"symbol": symbol, "interval": interval})
            .sort("timestamp", 1)
        )
        if limit:
            cursor = cursor.limit(limit)
        records = list(cursor)

    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)
    df.set_index("timestamp", inplace=True)
    return df


def write_features(symbol: str, interval: str, timestamp, feature_dict: dict) -> None:
    with mongo_client() as client:
        db = client[get_database_name()]
        db["features"].update_one(
            {"symbol": symbol, "interval": interval, "timestamp": timestamp},
            {"$set": {"features": feature_dict}},
            upsert=True,
        )

