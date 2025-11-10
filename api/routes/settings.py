from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator

from db.client import get_database_name, mongo_client

router = APIRouter()

COLLECTION_NAME = "settings"
DOCUMENT_ID = "models_settings"

DEFAULT_HORIZON_SETTINGS = [
    {"name": "1m", "train_window_days": 90, "retrain_cadence": "daily", "threshold_pct": 0.001},
    {"name": "1h", "train_window_days": 180, "retrain_cadence": "daily", "threshold_pct": 0.005},
    {"name": "1d", "train_window_days": 365, "retrain_cadence": "weekly", "threshold_pct": 0.02},
]

VALID_CADENCE = {"daily", "weekly", "monthly"}


class HorizonSettings(BaseModel):
    name: str = Field(..., min_length=1)
    train_window_days: int = Field(..., ge=1, le=3650)
    retrain_cadence: str = Field(..., description="Retraining cadence, e.g., daily")
    threshold_pct: float = Field(..., ge=0.0, le=1.0)

    @validator("retrain_cadence")
    def validate_cadence(cls, value: str) -> str:
        cadence = value.lower()
        if cadence not in VALID_CADENCE:
            raise ValueError(f"Unsupported cadence '{value}'. Use one of: {', '.join(sorted(VALID_CADENCE))}.")
        return cadence


class ModelSettingsPayload(BaseModel):
    horizons: List[HorizonSettings]


def _fetch_settings() -> Dict[str, Any]:
    with mongo_client() as client:
        db = client[get_database_name()]
        doc = db[COLLECTION_NAME].find_one({"_id": DOCUMENT_ID})
    if not doc:
        return {"horizons": DEFAULT_HORIZON_SETTINGS, "updated_at": None}
    horizons = doc.get("horizons", DEFAULT_HORIZON_SETTINGS)
    updated_at = doc.get("updated_at")
    if hasattr(updated_at, "isoformat"):
        updated_at = updated_at.isoformat()
    return {"horizons": horizons, "updated_at": updated_at}


@router.get("/models")
def get_model_settings() -> Dict[str, Any]:
    return _fetch_settings()


@router.put("/models")
def put_model_settings(payload: ModelSettingsPayload) -> Dict[str, Any]:
    if not payload.horizons:
        raise HTTPException(status_code=400, detail="At least one horizon must be provided.")

    written = [settings.dict() for settings in payload.horizons]

    with mongo_client() as client:
        db = client[get_database_name()]
        db[COLLECTION_NAME].update_one(
            {"_id": DOCUMENT_ID},
            {
                "$set": {
                    "horizons": written,
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

    return _fetch_settings()
