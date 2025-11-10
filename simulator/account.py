"""Virtual trading account to support backtests and simulations."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class Position:
    symbol: str
    quantity: float
    entry_price: float


@dataclass
class TradeLog:
    symbol: str
    entry_ts: str
    exit_ts: str | None
    entry_price: float
    exit_price: float | None
    quantity: float
    pnl: float | None


@dataclass
class VirtualAccount:
    name: str
    starting_balance: float = 10_000.0
    balance: float = field(init=False)
    positions: List[Position] = field(default_factory=list)
    trades: List[TradeLog] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.balance = self.starting_balance

    def open_position(self, symbol: str, quantity: float, price: float, timestamp: str) -> None:
        self.positions.append(Position(symbol=symbol, quantity=quantity, entry_price=price))
        self.balance -= quantity * price
        self.trades.append(
            TradeLog(
                symbol=symbol,
                entry_ts=timestamp,
                exit_ts=None,
                entry_price=price,
                exit_price=None,
                quantity=quantity,
                pnl=None,
            )
        )

    def close_position(self, symbol: str, price: float, timestamp: str) -> None:
        position = next((pos for pos in self.positions if pos.symbol == symbol), None)
        if not position:
            return
        self.positions.remove(position)
        proceeds = position.quantity * price
        pnl = (price - position.entry_price) * position.quantity
        self.balance += proceeds

        for trade in reversed(self.trades):
            if trade.symbol == symbol and trade.exit_ts is None:
                trade.exit_ts = timestamp
                trade.exit_price = price
                trade.pnl = pnl
                break

