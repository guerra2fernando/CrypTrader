"""MongoDB client helpers used across Phase 0 modules."""
from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime
from typing import Iterator, List, Optional

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


def get_feature_df(symbol: str, interval: str, limit: Optional[int] = None) -> pd.DataFrame:
    with mongo_client() as client:
        db = client[get_database_name()]
        cursor = (
            db["features"]
            .find({"symbol": symbol, "interval": interval})
            .sort("timestamp", 1)
        )
        if limit:
            cursor = cursor.limit(limit)
        records: List[dict] = list(cursor)

    if not records:
        return pd.DataFrame()

    rows = []
    for rec in records:
        feature_values = rec.get("features", {})
        feature_values = feature_values if isinstance(feature_values, dict) else {}
        rows.append({"timestamp": rec["timestamp"], **feature_values})

    df = pd.DataFrame(rows)
    df.set_index("timestamp", inplace=True)
    return df


def get_feature_row(symbol: str, interval: str, timestamp: datetime) -> Optional[dict]:
    with mongo_client() as client:
        db = client[get_database_name()]
        doc = db["features"].find_one(
            {"symbol": symbol, "interval": interval, "timestamp": {"$lte": timestamp}},
            sort=[("timestamp", -1)],
        )
        if not doc:
            return None
        feature_values = doc.get("features", {})
        feature_values = feature_values if isinstance(feature_values, dict) else {}
        return {"timestamp": doc["timestamp"], **feature_values}

