"""Batch retraining helper honoring stored model settings."""
from __future__ import annotations

import argparse
import subprocess
import sys
from typing import List

from db.client import get_database_name, mongo_client

DEFAULT_HORIZON_SETTINGS = [
    {"name": "1m", "train_window_days": 90, "retrain_cadence": "daily", "threshold_pct": 0.001},
    {"name": "1h", "train_window_days": 180, "retrain_cadence": "daily", "threshold_pct": 0.005},
    {"name": "1d", "train_window_days": 365, "retrain_cadence": "weekly", "threshold_pct": 0.02},
]

SETTINGS_COLLECTION = "settings"
DOCUMENT_ID = "models_settings"


def load_horizon_settings() -> List[dict]:
    with mongo_client() as client:
        db = client[get_database_name()]
        doc = db[SETTINGS_COLLECTION].find_one({"_id": DOCUMENT_ID})
    if doc and doc.get("horizons"):
        return list(doc["horizons"])
    return DEFAULT_HORIZON_SETTINGS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run horizon retraining jobs based on stored settings.")
    parser.add_argument("--symbols", default="BTC/USDT", help="Comma-separated list of symbols to retrain")
    parser.add_argument("--algorithm", choices=["rf", "lgbm"], default="rf", help="Algorithm to train")
    parser.add_argument("--promote", action="store_true", help="Promote trained models to production")
    parser.add_argument("--dry-run", action="store_true", help="Print the commands without executing them")
    return parser.parse_args()


def run() -> None:
    args = parse_args()
    horizons = load_horizon_settings()
    symbols = [sym.strip() for sym in args.symbols.split(",") if sym.strip()]

    if not horizons or not symbols:
        print("No horizons or symbols configured; nothing to retrain.", file=sys.stderr)
        sys.exit(1)

    for symbol in symbols:
        for horizon in horizons:
            horizon_name = horizon.get("name")
            if not horizon_name:
                continue
            train_window = horizon.get("train_window_days")
            cmd = [
                sys.executable,
                "-m",
                "models.train_horizon",
                "--symbol",
                symbol,
                "--horizon",
                horizon_name,
                "--algorithm",
                args.algorithm,
            ]
            if isinstance(train_window, int) and train_window > 0:
                cmd.extend(["--train-window", str(train_window)])
            if args.promote:
                cmd.append("--promote")

            cmd_str = " ".join(cmd)
            print(f"Running retrain job: {cmd_str}")
            if args.dry_run:
                continue
            subprocess.run(cmd, check=False)


if __name__ == "__main__":
    run()
