from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from db.client import get_database_name, mongo_client
from simulator.runner import run_simulation

router = APIRouter()


@router.post("/sim")
def start_simulation(payload: Dict[str, Any]) -> Dict[str, str]:
    symbol = payload.get("symbol")
    interval = payload.get("interval", "1m")
    strategy = payload.get("strategy", "baseline")
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")

    run_id = run_simulation(symbol, interval, strategy)
    if not run_id:
        raise HTTPException(status_code=500, detail="Failed to run simulation")
    return {"run_id": run_id}


@router.get("/sim/{run_id}")
def get_run(run_id: str) -> Dict[str, Any]:
    with mongo_client() as client:
        db = client[get_database_name()]
        record = db["sim_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    return record


@router.get("/sim")
def list_runs(limit: int = 10) -> Dict[str, Any]:
    with mongo_client() as client:
        db = client[get_database_name()]
        cursor = (
            db["sim_runs"]
            .find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        runs = list(cursor)
    return {"runs": runs}

