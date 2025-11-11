# Sentiment Analysis Integration Plan

## Vision & Goals
- Equip CryptoTrader with multi-source sentiment intelligence (news + social) to enrich forecasts, evaluation, and assistant decisions.
- Surface near-real-time headlines and chatter mapped to tracked symbols, with explainable scores and operator controls.
- Keep the feature fully optional, auditable, and resilient so existing trading flows continue to work when sentiment feeds degrade.
- Reuse the existing Celery + Mongo architecture to keep ingestion, storage, and analytics maintainable.

## Current System Touchpoints
- `data_ingest/` – extend ingestion alongside OHLCV to pull news and social streams.
- `features/features.py` and `features/indicators.py` – add rolling sentiment-derived columns consumed by models and backtests.
- `models/train_horizon.py` and `models/ensemble.py` – train with new predictors and optionally blend forecast + sentiment in production scoring.
- `evolution/evaluator.py`, `learning/loop.py`, `knowledge/` – adjust fitness scoring, meta-learning inputs, and knowledge entries to reflect sentiment context.
- `assistant/` (settings, retriever, llm prompts) – expose toggles, retrieve sentiment evidence, and bias reasoning.
- `web/next-app/` (Insights, Settings, NotificationCenter) – render sentiment dashboards, toggles, and alerts.

## Phased Implementation

### Phase 0 — Discovery & Guardrails
- **Objectives**
  - Select sentiment providers (RSS feeds, crypto news APIs, Reddit/Twitter scrapers) and define licensing/usage boundaries.
  - Identify symbol mapping strategy (tickers vs keywords) and fallbacks when stories cannot be matched.
- **Key Tasks**
  - Draft source shortlist and required credentials; extend `.env.example` with placeholders.
  - Document classification needs (language coverage, update cadence, latency targets).
  - Define acceptance criteria for “actionable sentiment” (score thresholds, freshness windows).
- **Critical Watchpoints**
  - Provider rate limits and terms of service (especially for social media scraping).
  - Avoid storing personally identifiable data in Mongo; strip user handles where required.
- **Opportunities**
  - Standardise feed adapters so future sources (on-chain data, forums) plug into the same pipeline.
  - Capture metadata (e.g., author reputation) for future weighting experiments.

### Phase 1 — Data Acquisition & Scheduling
- **Objectives**
  - Stand up reusable connectors and background jobs that collect sentiment inputs on a cadence comparable to price polling.
- **Key Tasks**
  - Create a new package `sentiment/` with modules:
    - `sentiment/sources/rss.py` (RSS, NewsAPI, CoinDesk feeds).
    - `sentiment/sources/social.py` (Reddit, Twitter/X, or alternative aggregator in case direct APIs are restricted).
    - `sentiment/registry.py` to register active sources and per-symbol keyword filters.
  - Add Celery tasks in `manager/tasks.py` (new queue `sentiment`) to fetch batches, persist raw payloads, and schedule via cron (e.g., 5 min cadence for social, 15 min for news).
  - Provide manual CLI entry point `scripts/pull_sentiment.py` for backfills and diagnostics.
- **Critical Watchpoints**
  - Rate limiting, retries, and exponential backoff; ensure one failing source does not block the queue.
  - Timezone normalisation for published timestamps; store everything in UTC.
- **Opportunities**
  - Cache source responses with Redis TTL to smooth spikes.
  - Parameterise symbol keywords so experimentation can happen without deploys (store in Mongo config doc).

### Phase 2 — Normalisation & Storage
- **Objectives**
  - Persist structured sentiment events in Mongo and prepare aggregated views for feature engineering.
- **Key Tasks**
  - Define Mongo collections:
    - `sentiment.events`: raw article/post with fields `{_id, symbol, source, headline, body, url, tags, language, published_at, ingested_at, raw_score, raw_confidence}`.
    - `sentiment.aggregates`: per-symbol rollups `{symbol, window, window_start, window_end, normalized_score, buzz, sample_size}`.
  - Add indexes (e.g., `{"symbol": 1, "published_at": -1}`) and note them in `db/indexes.txt`.
  - Build `sentiment/pipeline.py` to clean text, dedupe items, and map them to internal symbols using configurable keyword/alias tables.
- **Critical Watchpoints**
  - Duplicate detection (same headline via multiple feeds).
  - Storage growth; apply TTL or archive policies beyond 90 days.
- **Opportunities**
  - Store extracted entities and topics for future explainability or clustering.
  - Attach confidence scores from provider (if available) to inform weighting.

### Phase 3 — Scoring & Feature Engineering
- **Objectives**
  - Convert text into machine-usable sentiment metrics and expose them to existing feature pipelines.
- **Key Tasks**
  - Implement `sentiment/scoring.py` with layered scoring strategies:
    - Baseline: rule-based (VADER/TextBlob) for offline environments.
    - Optional: transformer-based classifier (e.g., `cardiffnlp/twitter-roberta-base`) when GPU/API budget allows.
  - Add smoothing and derivatives in `sentiment/features.py` to compute:
    - `sentiment_score_1h`, `sentiment_score_6h`, `sentiment_score_24h`.
    - `sentiment_trend` (slope between windows).
    - `buzz_index` (scaled post volume vs 30-day baseline).
    - `news_headline_count` (per window).
  - Extend `features/features.py` to join sentiment aggregates before writing to `features` collection (guard missing data with defaults).
  - Provide a backfill utility that replays historical events to fill sentiment features for training windows.
- **Critical Watchpoints**
  - Latency: ensure scoring finishes within ingestion interval.
  - Drift between scoring models; version the scorer and store in events for reproducibility.
- **Opportunities**
  - Capture feature importance snapshots for sentiment columns automatically in `reports/model_eval`.
  - Allow per-symbol weighting (e.g., emphasise social chatter for meme coins, news for majors).

### Phase 4 — Models, Evolution & Learning Integration
- **Objectives**
  - Make sentiment a first-class signal in forecasting, simulations, evolution scoring, and meta-learning.
- **Key Tasks**
  - Update datasets in `models/train_horizon.py` to include new sentiment columns (ensure `DEFAULT_CONFIG` horizons pull matching sentiment intervals).
  - Modify `models/ensemble.py` to optionally blend sentiment-adjusted forecasts (e.g., adjust `weighted_pred` with configurable `sentiment_alpha`).
  - Extend `simulator/runner.py` to pass sentiment metrics into strategy configs (e.g., `sentiment_bias`, `min_sentiment_confidence`) and log them in `sim_runs`.
  - Enhance `evolution/evaluator.py` scoring function to reward strategies aligning with sentiment (add `sentiment_alignment` metric from backtest result and include in `_score_from_metrics` when enabled).
  - Update `learning/meta_model.py` and `learning/loop.py` to track sentiment features, include them in Bayesian optimisation inputs, and record findings in knowledge entries (e.g., top sentiment features).
- **Critical Watchpoints**
  - Prevent look-ahead bias: only use sentiment items published before candle close.
  - Handle gaps: when sentiment is disabled or missing, models must revert gracefully to existing features.
- **Opportunities**
  - Allow allocator (`learning/allocator.py`) to tilt weight toward symbols with strong positive sentiment.
  - Record sentiment feature correlations in knowledge base for human review.

### Phase 5 — Assistant, Recommendations & Knowledge Surfaces
- **Objectives**
  - Feed sentiment into assistant reasoning, trade recommendations, and knowledge timelines.
- **Key Tasks**
  - Extend `assistant/schemas.py` with new settings fields (`sentiment_enabled`, `sentiment_weight`, `sentiment_sources`, `headline_limit`).
  - Update `assistant/repository.py` and `/api/settings/assistant` routes to persist and expose sentiment settings.
  - Add new evidence retrieval in `assistant/retriever.py` to query `sentiment.events` and `sentiment.aggregates`, producing `EvidenceItem` entries of kind `sentiment`.
  - Adjust `assistant/explainer.py` prompts to mention sentiment context and cite latest headlines.
  - Modify trade recommendation generation to include sentiment score in rationale and approval thresholds.
  - Hook knowledge entries (`knowledge/base.py`) to summarise sentiment trends that preceded winning strategies.
- **Critical Watchpoints**
  - Avoid exceeding token budgets when injecting multiple headlines; enforce `headline_limit`.
  - Respect redaction rules: strip URLs or metadata if configured.
- **Opportunities**
  - Offer automatic alerts when sentiment diverges sharply from model forecasts (feed into `NotificationCenter` and assistant actions).
  - Enable summarised daily sentiment digest stored in knowledge base.

### Phase 6 — UX, Settings & Visualization
- **Objectives**
  - Provide clear controls and visualisations for sentiment, accessible in both Easy and Advanced modes.
- **Key Tasks**
  - Add a “Sentiment Intelligence” card to `web/next-app/pages/settings/GeneralTab.tsx` (or dedicate a `SentimentTab`) with toggles for enabling, weighting, and selecting sources.
  - Reuse `SettingsTradingForm` patterns to capture numeric weights and thresholds; wire to `/api/settings/assistant` and any new `/api/settings/sentiment` endpoint.
  - Build `components/SentimentPulsePanel.tsx` to display per-symbol sentiment gauges, top headlines, and last-updated timestamps; mount in `pages/insights/index.tsx` and provide an expanded table in Advanced Analytics.
  - Update `NotificationCenter.tsx` to show high-severity sentiment shifts (using thresholds from settings).
- **Critical Watchpoints**
  - Ensure UI respects disabled state (hide scores when backend toggle off, surface fallback copy).
  - Loading states for asynchronous sentiment endpoints; avoid blocking existing forecast panels.
- **Opportunities**
  - Add hover tooltips explaining how sentiment affects model decisions for transparency.
  - Provide CSV export of recent sentiment events for manual review.

### Phase 7 — Observability, QA & Rollout
- **Objectives**
  - Instrument the pipeline, validate behaviour, and roll out safely with feature flags.
- **Key Tasks**
  - Emit Prometheus metrics in `monitor/metrics.py` (e.g., `sentiment_ingest_latency`, `sentiment_event_count`, `sentiment_pipeline_errors`).
  - Write unit tests for connectors, scoring, and feature generation (use `mongomock` fixtures) plus API contract tests for new endpoints.
  - Extend integration tests/backtests to ensure strategies still execute with sentiment disabled.
  - Update documentation (`README.md`, `.env.example`) and provide an operational runbook covering source configuration, troubleshooting, and cost estimates.
  - Introduce a feature flag (`SENTIMENT_ENABLED_BY_DEFAULT=false`) so production can dark-launch ingestion before wiring models/UI.
- **Critical Watchpoints**
  - Monitor compute and API costs, especially if transformer models are added.
  - Validate model retraining drift when sentiment features arrive; compare ROI/Sharpe deltas before promoting.
- **Opportunities**
  - Schedule a staged rollout: ingest-only → feature backfill → shadow evaluations → production toggle.
  - Capture user feedback via assistant prompts referencing sentiment to refine UX.

## Data Model & Config Changes
- New Mongo collections: `sentiment.events`, `sentiment.aggregates`; update `db/indexes.txt` with symbol/timestamp indexes and optional TTL.
- Extend `settings` collection documents (`assistant_settings`, new `sentiment_settings`) with enable/weight/source fields.
- Add environment variables: `NEWSAPI_KEY`, `TWITTER_BEARER_TOKEN`, `REDDIT_CLIENT_ID`, `SENTIMENT_DEFAULT_SOURCES`, `SENTIMENT_SCORE_MODEL`.
- Update `requirements.txt` for parsing/scoring libraries (`feedparser`, `httpx`, `vaderSentiment`, optional `transformers`, `torch` when GPU available).

## API & UI Surface Additions
- Add `api/routes/sentiment.py` with endpoints:
  - `GET /api/sentiment/summary` (per-symbol aggregates for dashboards).
  - `GET /api/sentiment/events` (paginated headlines).
  - `PUT /api/sentiment/settings` (if separating from assistant).
- Update `api/main.py` to include the new router and secure via existing auth middleware (if applicable).
- Frontend data hooks (SWR) under `web/next-app/lib/api.ts` for the new endpoints.
- Update `AssistantTab.tsx` & `GeneralTab.tsx` to persist sentiment settings, plus new components under `web/next-app/components/SentimentPulsePanel.tsx`.

## Testing & Rollout Checklist
- ✅ Ingestion unit tests with mocked feeds and dedupe logic.
- ✅ Scoring regression tests to ensure sentiment scores stay within [-1, 1] and trends compute correctly.
- ✅ Feature frame snapshot tests confirming new columns exist and are nullable-safe.
- ✅ Backtest comparisons (with/without sentiment) to quantify impact before enabling auto-promote.
- ✅ API contract & UI integration tests covering toggle states and evidence display.
- ✅ Monitoring dashboards updated; alerts configured for ingestion failures and stale aggregates.
- ✅ Documentation & runbooks reviewed; operations sign-off before flipping the feature flag.

## Open Questions & Next Decisions
- Which premium data providers (if any) justify the cost for higher-quality sentiment vs open RSS feeds?
- Should sentiment-driven adjustments influence position sizing directly, or remain an overlay on forecast confidence?
- What is the minimum viable social coverage (Twitter + Reddit vs adding Telegram/Discord)?
- How do we handle multilingual news? Do we need translation before scoring?
- Do we expose sentiment history via the public API, and if so, what retention window is acceptable?

