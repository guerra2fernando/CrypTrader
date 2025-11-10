"""Ensemble manager that merges multiple model predictions per horizon."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from db.client import get_feature_row
from models import model_utils, registry

HORIZON_INTERVAL_MAP = {
    "1m": "1m",
    "5m": "1m",
    "15m": "1m",
    "1h": "1h",
    "4h": "1h",
    "1d": "1d",
}


class EnsembleError(RuntimeError):
    """Raised when the ensemble manager cannot produce a prediction."""


MODEL_CACHE: Dict[str, object] = {}


def _load_model(model_id: str):
    if model_id in MODEL_CACHE:
        return MODEL_CACHE[model_id]
    model = model_utils.load_model(model_id)
    MODEL_CACHE[model_id] = model
    return model


def _load_feature_vector(symbol: str, horizon: str, timestamp: datetime) -> pd.DataFrame:
    interval = HORIZON_INTERVAL_MAP.get(horizon)
    if not interval:
        raise EnsembleError(f"Unsupported horizon {horizon}")

    feature_row = get_feature_row(symbol, interval, timestamp)
    if not feature_row:
        raise EnsembleError(f"No features found for {symbol} {interval} at or before {timestamp}")

    frame = pd.DataFrame([feature_row])
    return frame.set_index("timestamp")


def _load_candidate_models(symbol: str, horizon: str) -> List[Dict]:
    models = registry.list_models(symbol=symbol, horizon=horizon)
    if not models:
        raise EnsembleError(f"No models registered for {symbol} {horizon}")
    return models


def _weight_from_rmse(metrics: Optional[Dict]) -> float:
    if not metrics:
        return 1.0
    rmse = metrics.get("test", {}).get("rmse")
    if rmse is None or rmse <= 0:
        return 1.0
    return 1.0 / (rmse + 1e-6)


def _confidence_from_predictions(preds: List[float]) -> float:
    if not preds:
        return 0.0
    spread = float(np.std(preds))
    return float(np.clip(1.0 / (1.0 + spread), 0.0, 1.0))


def ensemble_predict(symbol: str, horizon: str, timestamp: datetime) -> Dict[str, object]:
    feature_frame = _load_feature_vector(symbol, horizon, timestamp)
    models = _load_candidate_models(symbol, horizon)

    predictions: List[float] = []
    weights: List[float] = []
    breakdown: List[Dict[str, object]] = []

    for doc in models:
        model_id = doc.get("model_id")
        if not model_id:
            continue
        try:
            model = _load_model(model_id)
        except FileNotFoundError:
            continue

        feature_columns = doc.get("feature_columns", [])
        available_cols = [col for col in feature_columns if col in feature_frame.columns]
        if not available_cols:
            continue

        model_input = feature_frame[available_cols].fillna(0)
        raw_pred = float(model.predict(model_input)[0])
        weight = _weight_from_rmse(doc.get("metrics"))

        predictions.append(raw_pred)
        weights.append(weight)
        breakdown.append(
            {
                "model_id": model_id,
                "prediction": raw_pred,
                "weight": weight,
                "rmse": doc.get("metrics", {}).get("test", {}).get("rmse"),
            }
        )

    if not predictions:
        raise EnsembleError(f"No usable models found for {symbol} {horizon}")

    weights = np.array(weights)
    preds = np.array(predictions)
    weighted_pred = float(np.average(preds, weights=weights))
    confidence = _confidence_from_predictions(predictions)

    return {
        "symbol": symbol,
        "horizon": horizon,
        "timestamp": feature_frame.index[-1].to_pydatetime(),
        "predicted_return": weighted_pred,
        "confidence": confidence,
        "models": breakdown,
    }

