/* eslint-disable */
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { EmptyState } from "@/components/EmptyState";
import { TooltipExplainer } from "@/components/TooltipExplainer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMode } from "@/lib/mode-context";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";

type StrategiesResponse = {
  runs: Run[];
};

type EquityPoint = {
  timestamp: string;
  equity: number;
};

type Trade = {
  pnl?: number;
};

type Run = {
  run_id: string;
  strategy: string;
  symbol: string;
  interval: string;
  created_at?: string;
  results: {
    pnl?: number;
    sharpe?: number;
    max_drawdown?: number;
  };
  equity_curve?: EquityPoint[];
  trades?: Trade[];
};

type SparklineProps = {
  data?: EquityPoint[];
};

function Sparkline({ data }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">No equity curve yet.</div>;
  }

  const width = 320;
  const height = 128;
  const equities = data.map((point) => point.equity);
  const minEquity = Math.min(...equities);
  const maxEquity = Math.max(...equities);
  const range = maxEquity - minEquity || 1;
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.equity - minEquity) / range) * height;
    return { x, y };
  });
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const gradientId = "equityGradient";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path}`} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        fill={`url(#${gradientId})`}
        opacity={0.4}
      />
    </svg>
  );
}

export default function StrategiesTab(): JSX.Element {
  const { isEasyMode } = useMode();
  const { data } = useSWR<StrategiesResponse>("/api/run/sim?limit=12", fetcher);
  const runs = data?.runs ?? [];
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRunId && runs.length) {
      setSelectedRunId(runs[0].run_id);
    }
  }, [runs, selectedRunId]);

  const selectedRun = useMemo(() => runs.find((run) => run.run_id === selectedRunId) ?? runs[0], [runs, selectedRunId]);
  const trades = selectedRun?.trades ?? [];
  const winners = trades.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const losers = trades.filter((trade) => (trade.pnl ?? 0) < 0).length;
  const pnl = selectedRun?.results?.pnl ?? 0;
  const sharpe = selectedRun?.results?.sharpe ?? 0;
  const maxDrawdown = selectedRun?.results?.max_drawdown ?? 0;

  const badgeVariant = pnl > 0 ? "success" : pnl < 0 ? "destructive" : "secondary";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Simulation Runs</h2>
        <p className="text-sm text-muted-foreground">Latest backtests pulled from MongoDB. Click a row to inspect equity and trade stats.</p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {runs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">{isEasyMode ? "Profit/Loss" : "PnL"}</TableHead>
                  <TableHead className="text-right">{isEasyMode ? "Risk-Adjusted Return" : "Sharpe"}</TableHead>
                  <TableHead className="text-right">{isEasyMode ? "Worst Loss Period" : "Max DD"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const rowPnl = run.results.pnl ?? 0;
                  const rowBadge = rowPnl > 0 ? "success" : rowPnl < 0 ? "destructive" : "secondary";
                  const isSelected = run.run_id === selectedRun?.run_id;
                  return (
                    <TableRow
                      key={run.run_id}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn("cursor-pointer", isSelected && "bg-primary/5")}
                      onClick={() => setSelectedRunId(run.run_id)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{run.run_id}</TableCell>
                      <TableCell className="font-medium text-foreground">{run.strategy}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{run.symbol}</span>
                          <Badge variant="secondary">{run.interval}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={rowBadge}>{rowPnl.toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{(run.results.sharpe ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">{((run.results.max_drawdown ?? 0) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              variant="data"
              title={isEasyMode ? "No Simulations Yet" : "No Simulations"}
              description={
                isEasyMode
                  ? "Strategy test results will appear here once simulations are run. Simulations test how strategies would have performed in the past."
                  : "No simulations have been run."
              }
            />
          )}
        </CardContent>
      </Card>

      {selectedRun ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>{selectedRun.strategy}</CardTitle>
                <CardDescription>
                  {selectedRun.symbol} • {selectedRun.interval} • {selectedRun.run_id}
                </CardDescription>
              </div>
              <Badge variant={badgeVariant}>PnL: {pnl.toFixed(2)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  {isEasyMode ? "Risk-Adjusted Return" : "Sharpe"}
                  {isEasyMode && (
                    <TooltipExplainer
                      term="Risk-Adjusted Return"
                      explanation="A measure of how much profit you make relative to the risk you take. Higher is better."
                    />
                  )}
                </p>
                <p className="text-2xl font-semibold text-foreground">{sharpe.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  {isEasyMode ? "Worst Loss Period" : "Max Drawdown"}
                  {isEasyMode && (
                    <TooltipExplainer
                      term="Worst Loss Period"
                      explanation="The largest drop in value from a peak to a low point. Lower is better."
                    />
                  )}
                </p>
                <p className="text-2xl font-semibold text-foreground">{(maxDrawdown * 100).toFixed(2)}%</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Trades</p>
                <p className="text-2xl font-semibold text-foreground">{trades.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Hit Rate</p>
                <p className="text-2xl font-semibold text-foreground">
                  {trades.length ? ((winners / trades.length) * 100).toFixed(1) : "0.0"}%
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Equity Curve</h3>
              <Sparkline data={selectedRun.equity_curve} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Winning trades:</span> {winners}
                </p>
                <p>
                  <span className="font-medium text-foreground">Losing trades:</span> {losers}
                </p>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Generated:</span>{" "}
                  {selectedRun.created_at ? new Date(selectedRun.created_at).toLocaleString() : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

