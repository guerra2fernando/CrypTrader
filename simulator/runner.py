"""Simulation runner that stitches together features and backtesting."""
from __future__ import annotations

import logging
from datetime import datetime
from uuid import uuid4

import pandas as pd
from pymongo import MongoClient

from backtester.engine import Backtester
from db.client import get_database_name, mongo_client
from features.features import generate_for_symbol

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _load_feature_frame(symbol: str, interval: str) -> pd.DataFrame:
    with mongo_client() as client:
        db = client[get_database_name()]
        cursor = (
            db["features"]
            .find({"symbol": symbol, "interval": interval})
            .sort("timestamp", 1)
        )
        records = list(cursor)
    if not records:
        return pd.DataFrame()
    df = pd.DataFrame(records)
    features = pd.json_normalize(df.pop("features"))
    df = pd.concat([df, features], axis=1)
    df.set_index("timestamp", inplace=True)
    return df


def run_simulation(symbol: str, interval: str, strategy_name: str) -> str:
    feature_count = generate_for_symbol(symbol, interval)
    if feature_count == 0:
        logger.warning("No features generated. Aborting simulation.")
        return ""

    features = _load_feature_frame(symbol, interval)
    if features.empty:
        logger.warning("No features available for %s %s", symbol, interval)
        return ""

    backtester = Backtester()
    signals = (features["return_1"] > 0).map(lambda x: "buy" if x else "sell")

    for ts, row in features.iterrows():
        price = row["ema_9"] if not pd.isna(row["ema_9"]) else row["return_1"]
        backtester.on_signal(ts, float(price), signals.loc[ts])

    result = backtester.finalize()
    run_id = f"run-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:6]}"
    with mongo_client() as client:
        db = client[get_database_name()]
        db["sim_runs"].insert_one(
            {
                "run_id": run_id,
                "strategy": strategy_name,
                "symbol": symbol,
                "interval": interval,
                "results": result.metrics,
                "trades": [trade.__dict__ for trade in result.trades],
                "equity_curve": result.equity_curve,
                "created_at": datetime.utcnow(),
            }
        )
    logger.info("Completed simulation %s", run_id)
    return run_id


def main() -> None:
    symbol = "BTC/USDT"
    interval = "1m"
    strategy = "baseline"
    run_simulation(symbol, interval, strategy)


if __name__ == "__main__":
    main()

