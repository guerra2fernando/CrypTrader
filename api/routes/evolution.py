from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from evolution.engine import EvolutionEngine, EvolutionSchedulerState, save_scheduler_config, toggle_scheduler
from evolution.promoter import apply_decision, decide_promotion
from evolution.repository import append_note, get_scheduler_states, list_experiments, load_experiment, update_experiment
from evolution.schemas import PromotionPolicy
from knowledge.base import KnowledgeBaseService
from strategy_genome.repository import archive_strategy, promote_strategy

router = APIRouter()

knowledge_service = KnowledgeBaseService()
engine = EvolutionEngine(knowledge_service=knowledge_service)


class ExperimentUpdatePayload(BaseModel):
    status: Optional[str] = Field(
        default=None, pattern="^(pending|running|completed|promoted|archived|rejected|failed)$"
    )
    note: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PromotePayload(BaseModel):
    experiment_id: str
    min_roi: Optional[float] = None
    min_sharpe: Optional[float] = None
    max_drawdown: Optional[float] = None
    min_score_gain: Optional[float] = None


class RollbackPayload(BaseModel):
    strategy_id: str
    target_strategy_id: Optional[str] = None


class SchedulerTogglePayload(BaseModel):
    enabled: bool


class SchedulerConfigPayload(BaseModel):
    scheduler_id: str = "daily_evolution"
    enabled: bool = True
    cron: str = "0 3 * * *"
    notes: Optional[list[str]] = None


class ManualCyclePayload(BaseModel):
    variants_per_parent: Optional[int] = Field(default=None, ge=1, le=20)
    symbol: Optional[str] = None
    horizon: Optional[str] = None


def _decision_to_dict(decision) -> Dict[str, Any]:
    return {
        "strategy_id": decision.strategy_id,
        "parent_id": decision.parent_id,
        "approved": decision.approved,
        "reason": decision.reason,
        "effective_at": decision.effective_at.isoformat(),
        "metadata": decision.metadata,
    }


@router.get("/experiments")
def get_experiments(
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
) -> Dict[str, Any]:
    experiments = list_experiments(status=status, limit=limit)
    return {"experiments": experiments}


@router.patch("/experiments/{experiment_id}")
def patch_experiment(experiment_id: str, payload: ExperimentUpdatePayload) -> Dict[str, Any]:
    experiment = load_experiment(experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    updates: Dict[str, Any] = {}
    if payload.status:
        updates["status"] = payload.status
    if payload.metadata:
        for key, value in payload.metadata.items():
            updates[f"metadata.{key}"] = value
    updated = update_experiment(experiment_id, updates) if updates else experiment
    if payload.note:
        updated = append_note(experiment_id, payload.note) or updated
    return {"experiment": updated}


@router.post("/promote")
def post_promote(payload: PromotePayload) -> Dict[str, Any]:
    experiment = load_experiment(payload.experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    policy = PromotionPolicy(
        min_roi=payload.min_roi or engine.promotion_policy.min_roi,
        min_sharpe=payload.min_sharpe or engine.promotion_policy.min_sharpe,
        max_drawdown=payload.max_drawdown or engine.promotion_policy.max_drawdown,
        min_score_gain=payload.min_score_gain or engine.promotion_policy.min_score_gain,
    )
    decision = decide_promotion(payload.experiment_id, policy)
    if not decision:
        raise HTTPException(status_code=500, detail="Unable to evaluate promotion decision")
    updates = apply_decision(decision)
    return {
        "decision": _decision_to_dict(decision),
        "updates": updates,
    }


@router.post("/rollback")
def post_rollback(payload: RollbackPayload) -> Dict[str, Any]:
    archive_strategy(payload.strategy_id)
    promoted = None
    if payload.target_strategy_id:
        promoted = promote_strategy(payload.target_strategy_id)
    return {
        "status": "ok",
        "archived": payload.strategy_id,
        "promoted": promoted,
    }


@router.get("/schedulers")
def get_schedulers() -> Dict[str, Any]:
    states = get_scheduler_states()
    return {"schedulers": states}


@router.post("/schedulers/toggle")
def post_scheduler_toggle(payload: SchedulerTogglePayload) -> Dict[str, Any]:
    state = toggle_scheduler(payload.enabled)
    return {"scheduler": state}


@router.put("/schedulers/config")
def put_scheduler_config(payload: SchedulerConfigPayload) -> Dict[str, Any]:
    state = EvolutionSchedulerState(
        scheduler_id=payload.scheduler_id,
        enabled=payload.enabled,
        cron=payload.cron,
        notes=payload.notes or [],
    )
    stored = save_scheduler_config(state)
    return {"scheduler": stored}


@router.post("/run")
def post_run_cycle(payload: ManualCyclePayload) -> Dict[str, Any]:
    original_variants = engine.mutation_config.variants_per_parent
    original_symbol = engine.evaluation_config.symbol
    original_horizon = engine.evaluation_config.horizon
    try:
        if payload.variants_per_parent:
            engine.mutation_config.variants_per_parent = payload.variants_per_parent
        if payload.symbol:
            engine.evaluation_config.symbol = payload.symbol
        if payload.horizon:
            engine.evaluation_config.horizon = payload.horizon
        summary = engine.run_cycle()
    finally:
        engine.mutation_config.variants_per_parent = original_variants
        engine.evaluation_config.symbol = original_symbol
        engine.evaluation_config.horizon = original_horizon
    return {"summary": summary}


# WebSocket connection manager for evolution updates
class EvolutionConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: Dict[str, Any]):
        """Broadcast data to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)


evolution_manager = EvolutionConnectionManager()


async def websocket_evolution(websocket: WebSocket):
    """WebSocket endpoint for real-time evolution experiment updates."""
    await evolution_manager.connect(websocket)
    try:
        last_data_hash = None
        limit = 20  # Default limit

        # Send initial data
        experiments = list_experiments(status=None, limit=limit)
        schedulers = get_scheduler_states()
        initial_data = {
            "type": "evolution_update",
            "experiments": experiments,
            "schedulers": schedulers,
        }
        await websocket.send_json(initial_data)

        while True:
            # Fetch current data
            experiments = list_experiments(status=None, limit=limit)
            schedulers = get_scheduler_states()

            # Create data payload
            data = {
                "type": "evolution_update",
                "experiments": experiments,
                "schedulers": schedulers,
            }

            # Only send if data changed (simple hash check)
            data_str = json.dumps(data, sort_keys=True, default=str)
            current_hash = hash(data_str)
            if current_hash != last_data_hash:
                await websocket.send_json(data)
                last_data_hash = current_hash

            # Wait before next update (polling interval)
            await asyncio.sleep(5.0)  # Update every 5 seconds (experiments change less frequently)

    except WebSocketDisconnect:
        evolution_manager.disconnect(websocket)
    except Exception as exc:
        evolution_manager.disconnect(websocket)
        # Log error but don't crash
        print(f"WebSocket error: {exc}")
