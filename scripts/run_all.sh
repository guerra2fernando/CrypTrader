#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Seeding symbols"
python scripts/seed_symbols.py

echo "[2/4] Fetching OHLCV"
python -m data_ingest.fetcher

echo "[3/4] Generating features"
python -m features.features

echo "[4/4] Running baseline simulation"
python -m simulator.runner

