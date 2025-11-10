"""Utility helpers for model persistence and metadata logging."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import joblib

MODEL_DIR = Path("models/artifacts")
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def save_model(model: Any, name: str, metadata: Dict[str, Any] | None = None) -> Path:
    path = MODEL_DIR / f"{name}.joblib"
    joblib.dump(model, path)
    if metadata:
        meta_path = MODEL_DIR / f"{name}.meta.json"
        meta_path.write_text(json.dumps(metadata, indent=2))
    return path


def load_model(name: str) -> Any:
    path = MODEL_DIR / f"{name}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"Model {name} not found at {path}")
    return joblib.load(path)

