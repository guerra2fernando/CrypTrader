# CrypTrader — Phase 0 Foundations → Phase 1 Forecasts

This repository now carries the foundations from **Phase 0** and the first slice of **Phase 1** of the Lenxys autonomous crypto trading platform. Phase 0 established the data plumbing, feature engineering, simulation tooling, and a lightweight UI. Phase 1 layers on multi-horizon model training, an ensemble forecast API, and a Forecast Studio experience.

## What’s Included

**Phase 0**
- Historical OHLCV ingestion pipeline using `ccxt` into MongoDB
- Feature engineering jobs that materialize indicators and returns
- Event-driven backtester and virtual account simulator
- FastAPI service exposing simulation runs and daily reports
- Minimal Next.js dashboard for quick visibility
- Docker compose setup for MongoDB, API, and frontend

**Phase 1 additions**
- Horizon-aware training CLI (`python -m models.train_horizon`) with LightGBM / RandomForest support and model metadata stored in MongoDB (`models.registry` collection).
- Ensemble inference manager (`models/ensemble.py`) powering new FastAPI endpoints: `POST /api/forecast`, `GET /api/forecast/batch`, the CSV export route `/api/forecast/export`, and model registry routes under `/api/models`.
- Backtester + simulator consuming predicted returns + confidence, logging forecast-aware trades.
- Next.js Forecast Studio (`/forecasts`) and Model Registry (`/models/registry`) pages using shadcn/ui tables, confidence indicators, filters, retrain actions, CSV download, per-symbol sparkline trends, and model detail panels with SHAP progress bars + dashboard links.
- Model settings API (`/api/settings/models`) plus `scripts/run_retraining.py` and `/api/models/retrain/bulk` to replay retraining jobs per horizon; settings UI now includes one-click bootstrap, dry-run/full retraining triggers, and job monitoring.
- Evaluation dashboards rendered to HTML on every training run (`reports/evaluation_dashboard.py`), uplift analysis CLI (`reports/uplift_analyzer.py`), and GitHub Actions CI (`.github/workflows/ci.yml`) running pytest + Playwright smoke tests.

Refer to `docs/p0.md` and `docs/p1.md` for a complete breakdown.

Training generates artifacts under `models/artifacts/`, writes evaluation CSVs + HTML dashboards to `reports/model_eval/`, and records metadata in `models.registry`.

### Replay scheduled retraining jobs

```bash
python scripts/run_retraining.py --symbols BTC/USDT,ETH/USDT --algorithm rf --promote
```

The script reads the saved preferences from `/api/settings/models` (stored in MongoDB) and launches `models.train_horizon` for each configured horizon. Combine it with cron/Prefect to satisfy the target cadences.