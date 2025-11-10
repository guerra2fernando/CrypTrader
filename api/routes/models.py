from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter

from models import model_utils

router = APIRouter()


@router.get("/")
def list_models() -> Dict[str, List[str]]:
    artifacts = sorted(p.name for p in Path(model_utils.MODEL_DIR).glob("*.joblib"))
    return {"models": artifacts}

