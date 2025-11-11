/* eslint-disable */
// @ts-nocheck
import { useMemo, useState } from "react";
import useSWR from "swr";

import { AccountSelector } from "@/components/AccountSelector";
import { AlertStream } from "@/components/AlertStream";
import { ApprovalWizard } from "@/components/ApprovalWizard";
import { ExecutionLatencyChart } from "@/components/ExecutionLatencyChart";
import { FillsFeed } from "@/components/FillsFeed";
import { KillSwitchPanel } from "@/components/KillSwitchPanel";
import { OrderAmendForm } from "@/components/OrderAmendForm";
import { OrderBlotter } from "@/components/OrderBlotter";
import { PositionsTable } from "@/components/PositionsTable";
import { RiskGaugeCard } from "@/components/RiskGaugeCard";
import { TradingTabs } from "@/components/TradingTabs";
import { useToast } from "@/components/ToastProvider";
import { Card } from "@/components/ui/card";
import { fetcher, postJson } from "@/lib/api";
import { useWebSocket } from "@/lib/hooks";

const MODES = [
  { key: "paper", label: "Paper", description: "Virtual ledger and fills — safest place to start." },
  { key: "testnet", label: "Testnet", description: "Exchange sandbox mirroring live order flow." },
  { key: "live", label: "Live", description: "Guarded live trading. MFA + permissions required." },
];

export default function TradingControlCenterPage() {
  const [mode, setMode] = useState("paper");
  const [editingOrder, setEditingOrder] = useState(null);
  const { pushToast } = useToast();

  // Use WebSocket for real-time updates, fallback to polling
  const { data: wsData, isConnected: wsConnected } = useWebSocket("/ws/trading");
  const {
    data: summary,
    mutate: refreshSummary,
    isValidating,
  } = useSWR("/api/trading/summary", fetcher, { 
    refreshInterval: wsConnected ? 0 : 15_000, // Disable polling if WebSocket is connected
  });

  // Merge WebSocket data with summary data
  const mergedSummary = useMemo(() => {
    if (wsData && wsData.type === "trading_update") {
      // Use WebSocket data if available
      return {
        orders: wsData.orders || [],
        fills: wsData.fills || [],
        positions: wsData.positions || [],
        risk: summary?.risk || { open_exposure: {}, kill_switch: { armed: false } },
      };
    }
    return summary;
  }, [wsData, summary]);

  const orders = useMemo(
    () => (mergedSummary?.orders ?? []).filter((order) => order.mode === mode),
    [mergedSummary, mode],
  );
  const positions = useMemo(
    () => (mergedSummary?.positions ?? []).filter((position) => (position.mode ?? mode) === mode),
    [mergedSummary, mode],
  );
  const fills = useMemo(
    () => (mergedSummary?.fills ?? []).filter((fill) => (fill.mode ?? mode) === mode).slice(0, 8),
    [mergedSummary, mode],
  );
  const latencies = useMemo(() => {
    return orders
      .filter((order) => order.created_at && order.updated_at)
      .map((order) => {
        const start = new Date(order.created_at).getTime();
        const end = new Date(order.updated_at).getTime();
        return Math.max(0, end - start);
      })
      .slice(-12);
  }, [orders]);

  const risk = mergedSummary?.risk ?? summary?.risk ?? { open_exposure: {}, kill_switch: { armed: false } };

  const handleSubmitOrder = async (payload) => {
    await postJson("/api/trading/orders", payload);
    pushToast({ title: "Order submitted", description: `${payload.side.toUpperCase()} ${payload.symbol}`, variant: "success" });
    await refreshSummary();
  };

  const handleCancel = async (order) => {
    await postJson(`/api/trading/orders/${order.order_id}/cancel`, { reason: "user" });
    pushToast({ title: "Order canceled", description: order.order_id, variant: "warning" });
    await refreshSummary();
  };

  const handleSync = async (order) => {
    await postJson(`/api/trading/orders/${order.order_id}/sync`, {});
    pushToast({ title: "Order synced", description: order.order_id, variant: "info" });
    await refreshSummary();
  };

  const handleAmend = (order) => setEditingOrder(order);

  const handleAmendSubmit = async (updates) => {
    if (!editingOrder) return;
    await postJson(`/api/trading/orders/${editingOrder.order_id}/amend`, updates);
    pushToast({ title: "Order amended", description: editingOrder.order_id, variant: "success" });
    setEditingOrder(null);
    await refreshSummary();
  };

  const handleKillSwitchArm = async (reason) => {
    await postJson("/api/admin/kill-switch", { action: "arm", reason, mode });
    pushToast({ title: "Kill switch armed", description: reason, variant: "error" });
    await refreshSummary();
  };

  const handleKillSwitchRelease = async () => {
    await postJson("/api/admin/kill-switch", { action: "release" });
    pushToast({ title: "Kill switch released", description: "Trading resumes.", variant: "success" });
    await refreshSummary();
  };

  const alerts = useMemo(() => {
    return fills.slice(0, 5).map((fill) => ({
      title: `${fill.symbol} ${fill.side.toUpperCase()} fill`,
      message: `${fill.quantity} @ $${fill.price}`,
      severity: fill.pnl >= 0 ? "success" : "warning",
      timestamp: fill.executed_at,
    }));
  }, [fills]);

  const exposureEntries = Object.entries(risk.open_exposure ?? {}).map(([key, value]) => ({
    mode: key,
    value,
    limit: mergedSummary?.risk?.settings?.risk?.max_open_exposure_usd ?? summary?.risk?.settings?.risk?.max_open_exposure_usd ?? 1,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <TradingTabs mode={mode} onModeChange={setMode} modes={MODES} />
          <ApprovalWizard onSubmit={handleSubmitOrder} defaultMode={mode} />
          {editingOrder ? (
            <Card className="p-4">
              <OrderAmendForm
                defaultPrice={editingOrder.price}
                onSubmit={handleAmendSubmit}
                onCancel={() => setEditingOrder(null)}
              />
            </Card>
          ) : null}
          <OrderBlotter orders={orders} onCancel={handleCancel} onSync={handleSync} onAmend={handleAmend} />
          <PositionsTable positions={positions} mode={mode} />
        </div>
        <div className="w-full space-y-4 lg:w-80">
          <KillSwitchPanel
            killSwitch={risk.kill_switch}
            onArm={handleKillSwitchArm}
            onRelease={handleKillSwitchRelease}
          />
          <ExecutionLatencyChart samples={latencies} />
          <AlertStream alerts={alerts} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RiskGaugeCard
          title="Open Exposure"
          current={risk.open_exposure?.[mode] ?? 0}
          limit={mergedSummary?.risk?.settings?.risk?.max_open_exposure_usd ?? summary?.risk?.settings?.risk?.max_open_exposure_usd ?? 1}
        />
        <RiskGaugeCard
          title="Daily Loss"
          current={Math.abs(mergedSummary?.risk?.daily_loss_usd ?? summary?.risk?.daily_loss_usd ?? 0)}
          limit={mergedSummary?.risk?.settings?.risk?.max_daily_loss_usd ?? summary?.risk?.settings?.risk?.max_daily_loss_usd ?? 1}
          tone={(mergedSummary?.risk?.daily_loss_usd ?? summary?.risk?.daily_loss_usd ?? 0) < 0 ? "warning" : "ok"}
        />
        <RiskGaugeCard
          title="Max Trade Cap"
          current={0}
          limit={mergedSummary?.risk?.settings?.risk?.max_trade_usd ?? summary?.risk?.settings?.risk?.max_trade_usd ?? 1}
          description="Auto-calculated per order."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FillsFeed fills={fills} />
        <ExecutionLatencyChart samples={latencies} />
      </div>
    </div>
  );
}

