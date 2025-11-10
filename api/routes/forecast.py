from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from models.ensemble import EnsembleError, ensemble_predict

router = APIRouter()


class ForecastRequest(BaseModel):
    symbol: str
    horizon: str
    timestamp: Optional[datetime] = None


def _serialize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "symbol": result["symbol"],
        "horizon": result["horizon"],
        "timestamp": result["timestamp"].isoformat(),
        "pred_return": result["predicted_return"],
        "confidence": result["confidence"],
        "models": result["models"],
    }


@router.post("/")
def forecast(payload: ForecastRequest) -> Dict[str, Any]:
    ts = payload.timestamp or datetime.utcnow()
    try:
        result = ensemble_predict(payload.symbol, payload.horizon, ts)
    except EnsembleError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _serialize_result(result)


@router.get("/batch")
def forecast_batch(
    symbols: str = Query(..., description="Comma-separated symbol list"),
    horizon: str = Query(..., description="Horizon key, e.g., 1h"),
    timestamp: Optional[datetime] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    ts = timestamp or datetime.utcnow()
    outputs: List[Dict[str, Any]] = []
    for raw_symbol in symbols.split(","):
        symbol = raw_symbol.strip()
        if not symbol:
            continue
        try:
            result = ensemble_predict(symbol, horizon, ts)
            outputs.append(_serialize_result(result))
        except EnsembleError as exc:
            outputs.append(
                {
                    "symbol": symbol,
                    "horizon": horizon,
                    "timestamp": ts.isoformat(),
                    "error": str(exc),
                }
            )
    return {"forecasts": outputs}


@router.get("/export")
def forecast_export(
    symbols: str = Query(..., description="Comma-separated symbol list"),
    horizon: str = Query(..., description="Horizon key, e.g., 1h"),
    timestamp: Optional[datetime] = None,
) -> StreamingResponse:
    ts = timestamp or datetime.utcnow()
    rows: List[Dict[str, Any]] = []
    for raw_symbol in symbols.split(","):
        symbol = raw_symbol.strip()
        if not symbol:
            continue
        try:
            result = ensemble_predict(symbol, horizon, ts)
            serialized = _serialize_result(result)
        except EnsembleError as exc:
            serialized = {
                "symbol": symbol,
                "horizon": horizon,
                "timestamp": ts.isoformat(),
                "pred_return": None,
                "confidence": None,
                "models": [],
                "error": str(exc),
            }
        rows.append(serialized)

    if not rows:
        raise HTTPException(status_code=400, detail="No symbols provided for export.")

    buffer = io.StringIO()
    fieldnames = ["symbol", "horizon", "timestamp", "pred_return", "confidence", "error"]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                "symbol": row["symbol"],
                "horizon": row["horizon"],
                "timestamp": row["timestamp"],
                "pred_return": row.get("pred_return"),
                "confidence": row.get("confidence"),
                "error": row.get("error"),
            }
        )

    buffer.seek(0)
    filename = f"forecast_{horizon}_{ts.strftime('%Y%m%d%H%M%S')}.csv"
    headers = {"Content-Disposition": f"attachment; filename=\"{filename}\""}
    return StreamingResponse(buffer, media_type="text/csv", headers=headers)

