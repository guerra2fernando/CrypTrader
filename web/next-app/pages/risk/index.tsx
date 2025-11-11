/* eslint-disable */
// @ts-nocheck
import useSWR from "swr";

import { AlertStream } from "@/components/AlertStream";
import { ExposureDonutChart } from "@/components/ExposureDonutChart";
import { RiskGaugeCard } from "@/components/RiskGaugeCard";
import { TooltipExplainer } from "@/components/TooltipExplainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetcher, postJson } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export default function RiskDashboardPage() {
  const { data: summary, mutate: refreshSummary } = useSWR("/api/risk/summary", fetcher, { refreshInterval: 20000 });
  const { data: breaches, mutate: refreshBreaches } = useSWR("/api/risk/breaches", fetcher, { refreshInterval: 30000 });

  const openExposure = summary?.open_exposure ?? {};
  const metrics = summary?.settings?.risk ?? {};
  const breachesList = breaches ?? [];

  const alerts = breachesList.map((breach) => ({
    title: breach.code?.replaceAll("_", " ").toUpperCase() ?? "BREACH",
    message: breach.message ?? "",
    severity: "error",
    timestamp: breach.created_at,
  }));

  const exposures = Object.entries(openExposure).map(([mode, value]) => ({
    mode,
    value,
    limit: metrics.max_open_exposure_usd ?? 1,
  }));

  const acknowledgeBreach = async (breachId: string) => {
    await postJson("/api/risk/acknowledge", { breach_id: breachId });
    await Promise.all([refreshBreaches(), refreshSummary()]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Risk Dashboard
          <TooltipExplainer 
            term="Risk Dashboard" 
            explanation="This dashboard monitors all your risk metrics in real-time to protect your capital. It tracks position sizes, daily losses, and breaches of safety limits. The system automatically enforces these limits to prevent excessive losses or overexposure. Think of this as your trading safety control center."
          />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor exposure limits, track breaches, and review risk metrics across all trading modes.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <RiskGaugeCard
          title="Open Exposure"
          current={Object.values(openExposure).reduce((sum, value) => sum + value, 0)}
          limit={metrics.max_open_exposure_usd ?? 1}
          tooltip="Total dollar value of all open positions across all modes. This limit prevents overexposure - having too much capital at risk simultaneously. When you hit this limit, you must close positions before opening new ones."
        />
        <RiskGaugeCard
          title="Daily Loss"
          current={Math.abs(summary?.daily_loss_usd ?? 0)}
          limit={metrics.max_daily_loss_usd ?? 1}
          tone={summary?.daily_loss_usd < 0 ? "warning" : "ok"}
          tooltip="How much money has been lost today. This circuit breaker stops trading automatically if you hit the daily loss limit, preventing emotional trading and deeper losses. Resets at midnight."
        />
        <RiskGaugeCard
          title="Auto Mode Cap"
          current={summary?.settings?.auto_mode?.max_trade_usd ?? 0}
          limit={metrics.max_trade_usd ?? 1}
          tooltip="Maximum dollar size for automated trades. This ensures the system can't place orders that are too large for your account. Protects against bugs or miscalculations in automated strategies."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExposureDonutChart exposures={exposures} />
        <AlertStream alerts={alerts} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Open Breaches
            <TooltipExplainer 
              term="Open Breaches" 
              explanation="Risk breaches occur when trading activity violates a safety limit - like exceeding your daily loss cap or position size limit. Each breach must be acknowledged to confirm you're aware of it. Breaches may temporarily halt trading until resolved. This accountability system prevents ignoring important risk events."
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {breachesList.length === 0 ? (
            <p className="text-sm text-muted-foreground">All clear. No outstanding breaches.</p>
          ) : (
            breachesList.map((breach) => (
              <div key={breach._id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <div className="text-sm font-medium">{breach.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(breach.created_at).toLocaleString()} • Context: {JSON.stringify(breach.context ?? {})}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => acknowledgeBreach(breach._id)}>
                  Acknowledge
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

