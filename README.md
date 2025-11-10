# CrypTrader — Phase 0 Foundations

This repository hosts the first phase of the Lenxys autonomous crypto trading platform. Phase 0 focuses on building the core data plumbing, feature engineering, simulation tooling, and a lightweight UI so future phases can iterate on real market data.

## What’s Included

- Historical OHLCV ingestion pipeline using `ccxt` into MongoDB
- Feature engineering jobs that materialize indicators and returns
- Event-driven backtester and virtual account simulator
- FastAPI service exposing simulation runs and daily reports
- Minimal Next.js dashboard for quick visibility
- Docker compose setup for MongoDB, API, and frontend

Refer to `docs/p0.md` for the full Phase 0 specification and acceptance criteria.

## Quick Start

```bash
python -m venv .venv
.\.venv\Scripts\activate         # Windows
pip install -r requirements.txt  # (to be generated)

cd web/next-app
npm install
npm run dev
```

Copy `env.example` to `.env` (or export the variables) before running the ingestion jobs.

See `docker/docker-compose.yml` for containerized workflows and `scripts/run_all.sh` for sequencing the main pipelines.

