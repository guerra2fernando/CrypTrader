#!/usr/bin/env bash
set -euo pipefail

# Usage: ./schedule_fetch.sh BTC/USDT 1m
SYMBOL=${1:-BTC/USDT}
INTERVAL=${2:-1m}
LIMIT=${3:-500}

echo "[schedule] Fetching ${SYMBOL} ${INTERVAL} (limit=${LIMIT})"
python -m data_ingest.fetcher --symbol "${SYMBOL}" --interval "${INTERVAL}" --limit "${LIMIT}"

