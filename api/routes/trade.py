from __future__ import annotations

import asyncio
import json
from functools import lru_cache
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from exec.order_manager import CancelRequest, OrderManager, OrderRequest, OrderResponse
from exec.risk_manager import RiskManager, RiskViolation
from exec.settlement import SettlementEngine

router = APIRouter()


@lru_cache(maxsize=1)
def _get_order_manager() -> OrderManager:
    return OrderManager()


def _handle_risk_violation(exc: RiskViolation) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"message": exc.message, "code": exc.code, "details": exc.details},
    ) from exc


@router.get("/orders", response_model=List[Dict[str, Any]])
def list_orders(
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    mode: Optional[str] = None,
) -> List[Dict[str, Any]]:
    manager = _get_order_manager()
    return manager.list_orders(limit=limit, status=status_filter, mode=mode)


@router.get("/orders/{order_id}", response_model=Dict[str, Any])
def get_order(order_id: str) -> Dict[str, Any]:
    manager = _get_order_manager()
    order = manager.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found.")
    return order


@router.post("/orders", response_model=OrderResponse)
def create_order(payload: OrderRequest) -> OrderResponse:
    manager = _get_order_manager()
    try:
        return manager.place_order(payload)
    except RiskViolation as exc:
        _handle_risk_violation(exc)
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    raise HTTPException(status_code=500, detail="Unknown error")


@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: str, payload: CancelRequest) -> OrderResponse:
    manager = _get_order_manager()
    return manager.cancel_order(order_id, payload)


@router.post("/orders/{order_id}/amend", response_model=OrderResponse)
def amend_order(order_id: str, updates: Dict[str, Any]) -> OrderResponse:
    manager = _get_order_manager()
    return manager.amend_order(order_id, updates)


@router.post("/orders/{order_id}/sync", response_model=OrderResponse)
def sync_order(order_id: str) -> OrderResponse:
    manager = _get_order_manager()
    return manager.sync_order(order_id)


@router.get("/positions", response_model=List[Dict[str, Any]])
def list_positions(mode: Optional[str] = None) -> List[Dict[str, Any]]:
    manager = _get_order_manager()
    return manager.list_positions(mode)


@router.get("/fills", response_model=List[Dict[str, Any]])
def list_fills(limit: int = Query(100, ge=1, le=500), mode: Optional[str] = None) -> List[Dict[str, Any]]:
    manager = _get_order_manager()
    return manager.list_fills(limit=limit, mode=mode)


@router.get("/ledger", response_model=List[Dict[str, Any]])
def ledger_snapshots(limit: int = Query(50, ge=1, le=200), mode: Optional[str] = None) -> List[Dict[str, Any]]:
    manager = _get_order_manager()
    return manager.ledger_snapshots(limit=limit, mode=mode)


@router.get("/summary", response_model=Dict[str, Any])
def trading_summary() -> Dict[str, Any]:
    manager = _get_order_manager()
    risk = manager.risk_manager.get_summary()
    return {
        "orders": manager.list_orders(limit=20),
        "positions": manager.list_positions(),
        "fills": manager.list_fills(limit=50),
        "ledger": manager.ledger_snapshots(limit=10),
        "risk": risk,
    }


@router.get("/stream", response_model=Dict[str, Any])
def trading_stream(limit: int = Query(20, ge=1, le=200)) -> Dict[str, Any]:
    manager = _get_order_manager()
    return {
        "orders": manager.list_orders(limit=limit),
        "fills": manager.list_fills(limit=limit),
        "positions": manager.list_positions(),
    }


@router.get("/reconciliation", response_model=Dict[str, Any])
def get_reconciliation_report(modes: Optional[List[str]] = Query(None)) -> Dict[str, Any]:
    """Get reconciliation report for trading settlement."""
    settlement = SettlementEngine()
    report = settlement.reconciliation_report(modes=modes)
    return report


@router.post("/reconciliation/run", response_model=Dict[str, Any])
def run_reconciliation(modes: Optional[List[str]] = None) -> Dict[str, Any]:
    """Trigger reconciliation report (can be called by scheduled jobs)."""
    from manager.tasks import run_daily_reconciliation

    task = run_daily_reconciliation.delay(modes=modes)
    return {"task_id": task.id, "status": "scheduled"}


def get_risk_manager() -> RiskManager:
    return _get_order_manager().risk_manager


def get_order_manager() -> OrderManager:
    return _get_order_manager()


# WebSocket connection manager
class TradingConnectionManager:
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


trading_manager = TradingConnectionManager()


async def websocket_trading(websocket: WebSocket):
    """WebSocket endpoint for real-time trading updates (orders, fills, positions)."""
    await trading_manager.connect(websocket)
    try:
        manager = _get_order_manager()
        last_data_hash = None
        limit = 20  # Default limit

        # Send initial data
        orders = manager.list_orders(limit=limit)
        fills = manager.list_fills(limit=limit)
        positions = manager.list_positions()
        initial_data = {
            "type": "trading_update",
            "orders": orders,
            "fills": fills,
            "positions": positions,
        }
        await websocket.send_json(initial_data)

        while True:
            # Fetch current data
            orders = manager.list_orders(limit=limit)
            fills = manager.list_fills(limit=limit)
            positions = manager.list_positions()

            # Create data payload
            data = {
                "type": "trading_update",
                "orders": orders,
                "fills": fills,
                "positions": positions,
            }

            # Only send if data changed (simple hash check)
            data_str = json.dumps(data, sort_keys=True, default=str)
            current_hash = hash(data_str)
            if current_hash != last_data_hash:
                await websocket.send_json(data)
                last_data_hash = current_hash

            # Wait before next update (polling interval)
            await asyncio.sleep(2.0)  # Update every 2 seconds

    except WebSocketDisconnect:
        trading_manager.disconnect(websocket)
    except Exception as exc:
        trading_manager.disconnect(websocket)
        # Log error but don't crash
        print(f"WebSocket error: {exc}")


