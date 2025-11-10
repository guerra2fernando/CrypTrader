"""Event-driven backtesting engine."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import pandas as pd

from backtester.execution_model import ExecutionModel


@dataclass
class Position:
    entry_price: float
    quantity: float


@dataclass
class Trade:
    entry_ts: pd.Timestamp
    exit_ts: Optional[pd.Timestamp]
    entry_price: float
    exit_price: Optional[float]
    quantity: float
    pnl: Optional[float]


@dataclass
class BacktestResult:
    trades: List[Trade] = field(default_factory=list)
    equity_curve: List[Dict[str, float]] = field(default_factory=list)
    metrics: Dict[str, float] = field(default_factory=dict)


class Backtester:
    def __init__(
        self,
        initial_capital: float = 10_000.0,
        position_size_pct: float = 0.95,
        execution_model: Optional[ExecutionModel] = None,
    ) -> None:
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.position_size_pct = position_size_pct
        self.execution = execution_model or ExecutionModel()
        self.position: Optional[Position] = None
        self.trades: List[Trade] = []
        self.equity_curve: List[Dict[str, float]] = []

    def on_signal(self, ts: pd.Timestamp, price: float, signal: str) -> None:
        signal = signal.lower()
        if signal == "buy":
            self._handle_buy(ts, price)
        elif signal == "sell":
            self._handle_sell(ts, price)
        self._mark_equity(ts, price)

    def _handle_buy(self, ts: pd.Timestamp, price: float) -> None:
        if self.position:
            return
        exec_price = self.execution.apply_slippage(price, "buy")
        notional = self.cash * self.position_size_pct
        net_notional = self.execution.apply_fees(notional)
        qty = net_notional / exec_price
        self.position = Position(entry_price=exec_price, quantity=qty)
        self.cash -= notional
        self.trades.append(
            Trade(
                entry_ts=ts,
                exit_ts=None,
                entry_price=exec_price,
                exit_price=None,
                quantity=qty,
                pnl=None,
            )
        )

    def _handle_sell(self, ts: pd.Timestamp, price: float) -> None:
        if not self.position:
            return
        exec_price = self.execution.apply_slippage(price, "sell")
        gross = exec_price * self.position.quantity
        net = self.execution.apply_fees(gross)
        self.cash += net
        pnl = (exec_price - self.position.entry_price) * self.position.quantity
        last_trade = self.trades[-1]
        last_trade.exit_ts = ts
        last_trade.exit_price = exec_price
        last_trade.pnl = pnl
        self.position = None

    def _mark_equity(self, ts: pd.Timestamp, price: float) -> None:
        position_value = 0.0
        if self.position:
            position_value = price * self.position.quantity
        equity = self.cash + position_value
        self.equity_curve.append({"timestamp": ts, "equity": equity})

    def finalize(self) -> BacktestResult:
        metrics = {}
        if self.equity_curve:
            series = pd.Series([point["equity"] for point in self.equity_curve])
            returns = series.pct_change().dropna()
            metrics = {
                "pnl": series.iloc[-1] - self.initial_capital,
                "max_drawdown": (series.cummax() - series).max() / series.cummax().max(),
                "sharpe": (returns.mean() / returns.std()) * (252 ** 0.5)
                if returns.std() != 0
                else 0.0,
            }
        return BacktestResult(trades=self.trades, equity_curve=self.equity_curve, metrics=metrics)

