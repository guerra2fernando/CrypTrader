"""Execution model with fixed slippage and fees."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ExecutionConfig:
    slippage_bps: float = 5.0
    fee_bps: float = 10.0


class ExecutionModel:
    def __init__(self, config: ExecutionConfig | None = None) -> None:
        self.config = config or ExecutionConfig()

    def apply_slippage(self, price: float, side: str) -> float:
        adjustment = self.config.slippage_bps / 10_000
        if side.lower() == "buy":
            return price * (1 + adjustment)
        return price * (1 - adjustment)

    def apply_fees(self, notional: float) -> float:
        fee = notional * (self.config.fee_bps / 10_000)
        return notional - fee

