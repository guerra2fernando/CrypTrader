/* eslint-disable */
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, TrendingUp, MessageSquare, BarChart3, Settings, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useMode } from "@/lib/mode-context";
import { fetcher } from "../lib/api";

type StatusResponse = {
  status: string;
};

type Report = {
  date: string;
  summary?: string;
};

type ReportsResponse = {
  reports: Report[];
};

type InventoryRow = {
  symbol: string;
  interval: string;
  ohlcv_count: number;
  features_count: number;
  latest_candle: string | null;
  latest_feature: string | null;
};

type AdminOverviewResponse = {
  available_symbols: string[];
  default_symbols: string[];
  default_intervals: string[];
  default_lookback_days: number;
  inventory: InventoryRow[];
};

type BootstrapResponse = {
  seeded_symbols: number;
  ingested: Array<{ symbol: string; interval: string; rows: number }>;
  features: Array<{ symbol: string; interval: string; rows: number }>;
  simulation_run_id: string | null;
  report_path: string | null;
  inventory: InventoryRow[];
  batch_size: number;
  lookback_days: number;
  requested_symbols: string[];
  requested_intervals: string[];
  timestamp: string;
};

export default function Home(): JSX.Element {
  const { data: status, mutate: refreshStatus } = useSWR<StatusResponse>("/api/status", fetcher);
  const { data: reports, mutate: refreshReports } = useSWR<ReportsResponse>("/api/reports?limit=3", fetcher);
  const { data: overview, mutate: refreshOverview } = useSWR<AdminOverviewResponse>("/api/admin/overview", fetcher);
  const [bootstrapResult, setBootstrapResult] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [symbolsInitialized, setSymbolsInitialized] = useState(false);
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>([]);
  const [intervalsInitialized, setIntervalsInitialized] = useState(false);
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [lookbackInitialized, setLookbackInitialized] = useState(false);

  const availableSymbols = overview?.available_symbols ?? [];
  const inventory = overview?.inventory ?? [];
  const reportItems: Report[] = reports?.reports ?? [];

  useEffect(() => {
    if (!symbolsInitialized && overview?.default_symbols?.length) {
      setSelectedSymbols(overview.default_symbols);
      setSymbolsInitialized(true);
    }
  }, [overview, symbolsInitialized]);

  useEffect(() => {
    if (!intervalsInitialized && overview?.default_intervals?.length) {
      setSelectedIntervals(overview.default_intervals);
      setIntervalsInitialized(true);
    }
  }, [overview, intervalsInitialized]);

  useEffect(() => {
    if (!lookbackInitialized && overview?.default_lookback_days) {
      setLookbackDays(overview.default_lookback_days);
      setLookbackInitialized(true);
    }
  }, [overview, lookbackInitialized]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const formatNumber = (value: number) => numberFormatter.format(value);

  const highlightedKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedSymbols.forEach((symbol) => {
      selectedIntervals.forEach((interval) => {
        keys.add(`${symbol}__${interval}`);
      });
    });
    return keys;
  }, [selectedSymbols, selectedIntervals]);

  const handleSymbolToggle = (symbol: string, checked: boolean) => {
    setSelectedSymbols((prev) => {
      if (checked) {
        if (prev.includes(symbol)) {
          return prev;
        }
        return [...prev, symbol];
      }
      return prev.filter((item) => item !== symbol);
    });
  };

  const handleIntervalToggle = (interval: string, checked: boolean) => {
    setSelectedIntervals((prev) => {
      if (checked) {
        if (prev.includes(interval)) {
          return prev;
        }
        return [...prev, interval];
      }
      return prev.filter((item) => item !== interval);
    });
  };

  const handleLookbackChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      setLookbackDays(0);
      return;
    }
    setLookbackDays(Math.max(1, Math.min(365, Math.floor(parsed))));
  };

  const handleBootstrap = async () => {
    if (!selectedSymbols.length || !selectedIntervals.length) {
      setError("Choose at least one symbol and interval.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetcher<BootstrapResponse>("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: selectedSymbols,
          intervals: selectedIntervals,
          lookback_days: lookbackDays,
        }),
      });
      setBootstrapResult(response);
      await Promise.all([refreshStatus(), refreshReports(), refreshOverview()]);
    } catch (err: any) {
      setError(err.message || "Failed to bootstrap data.");
    } finally {
      setLoading(false);
    }
  };

  const canBootstrap = selectedSymbols.length > 0 && selectedIntervals.length > 0 && !loading;
  const { isEasyMode } = useMode();

  // Easy Mode Dashboard
  if (isEasyMode) {
    const hasData = inventory.length > 0;
    const hasReports = reportItems.length > 0;

    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        {!hasData && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Welcome to Lenxys Trader
              </CardTitle>
              <CardDescription>
                Get started by setting up your trading platform. We'll guide you through everything step by step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/get-started">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/trading">
            <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Trading</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Place orders and manage your positions</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/insights">
            <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View forecasts and strategy recommendations</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/assistant">
            <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Assistant</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Ask questions and get trading advice</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings">
            <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Configure your trading preferences</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current platform health and data status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Platform Status</p>
                <p className="text-xs text-muted-foreground">Overall system health</p>
              </div>
              <Badge variant={status?.status === "ok" ? "default" : "destructive"}>
                {status ? (status.status === "ok" ? "Healthy" : status.status) : "Loading"}
              </Badge>
            </div>
            {hasData && (
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Data Coverage</p>
                  <p className="text-xs text-muted-foreground">Available market data</p>
                </div>
                <Badge variant="secondary">{inventory.length} pairs configured</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {hasReports && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Latest performance summaries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportItems.slice(0, 3).map((report: Report) => (
                  <div key={report.date} className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-sm font-semibold text-foreground">{report.date}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{report.summary || "No summary available."}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Setup Prompt */}
        {!hasData && (
          <Card>
            <CardHeader>
              <CardTitle>Initial Setup</CardTitle>
              <CardDescription>Set up your trading data to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Before you can start trading, we need to fetch historical market data. This helps the system make better predictions.
              </p>
              <Link href="/get-started">
                <Button>
                  Complete Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Advanced Mode Dashboard (Original Technical View)
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[2fr,3fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Phase 0 Bootstrap</CardTitle>
              <CardDescription>
                Fetch minute-level history, build features, run the baseline sim, and generate a fresh report.
              </CardDescription>
            </div>
            <Badge variant={status?.status === "ok" ? "success" : "warning"}>
              {status ? (status.status === "ok" ? "Healthy" : status.status) : "Loading"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Symbols</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSymbols(availableSymbols)}
                    disabled={!availableSymbols.length}
                  >
                    Select all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSymbols([])}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {availableSymbols.map((symbol) => {
                  const checked = selectedSymbols.includes(symbol);
                  return (
                    <Label
                      key={symbol}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2",
                        checked && "border-primary/60 bg-primary/5",
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">{symbol}</span>
                      <Checkbox checked={checked} onCheckedChange={(value) => handleSymbolToggle(symbol, value === true)} />
                    </Label>
                  );
                })}
                {!availableSymbols.length ? <p className="text-sm text-muted-foreground">No symbols seeded yet.</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Intervals</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIntervals(overview?.default_intervals ?? [])}>
                    Reset
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {overview?.default_intervals?.map((interval) => {
                  const checked = selectedIntervals.includes(interval);
                  return (
                    <Label
                      key={interval}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                        checked ? "border-primary/60 bg-primary/5" : "bg-muted/30",
                      )}
                    >
                      {interval}
                      <Checkbox checked={checked} onCheckedChange={(value) => handleIntervalToggle(interval, value === true)} />
                    </Label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lookback">Lookback window (days)</Label>
              <Input
                id="lookback"
                type="number"
                min={1}
                max={365}
                value={lookbackDays}
                onChange={(event) => handleLookbackChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Default is the last {overview?.default_lookback_days ?? 30} days.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleBootstrap} disabled={!canBootstrap}>
                {loading ? "Bootstrapping..." : "Run Bootstrap"}
              </Button>
              {error ? <span className="text-sm text-destructive">{error}</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Coverage</CardTitle>
            <CardDescription>Counts pulled directly from MongoDB collections after the latest sync.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {inventory.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">{isEasyMode ? "Price Data Points" : "OHLCV Candles"}</TableHead>
                    <TableHead className="text-right">Feature Rows</TableHead>
                    <TableHead className="text-right">Latest Candle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((row) => {
                    const key = `${row.symbol}__${row.interval}`;
                    return (
                      <TableRow key={key} className={cn(highlightedKeys.has(key) && "bg-primary/5")}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{row.symbol}</span>
                            <Badge variant="secondary">{row.interval}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(row.ohlcv_count)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(row.features_count)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {row.latest_candle ? new Date(row.latest_candle).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet. Run a bootstrap to populate MongoDB.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Last three generated daily reports.</CardDescription>
          </CardHeader>
          <CardContent>
            {reportItems.length ? (
              <ul className="space-y-3">
                {reportItems.map((report: Report) => (
                  <li key={report.date} className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <div className="text-sm font-semibold text-foreground">{report.date}</div>
                    <div>{report.summary || "No summary available."}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No reports yet. Run the bootstrap to create one.</p>
            )}
          </CardContent>
        </Card>
      </section>

      {bootstrapResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Bootstrap Summary</CardTitle>
            <CardDescription>
              Completed at {new Date(bootstrapResult.timestamp).toLocaleString()} with batch size {bootstrapResult.batch_size}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-muted-foreground">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">Seeded Symbols</p>
                <p>{bootstrapResult.seeded_symbols}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Simulation Run ID</p>
                <p>{bootstrapResult.simulation_run_id ?? "n/a"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Ingested Candles</p>
                <ul className="mt-2 space-y-1">
                  {bootstrapResult.ingested.map((entry, index) => (
                    <li key={`${entry.symbol}-${entry.interval}-${index}`}>
                      {entry.symbol} {entry.interval}: {formatNumber(entry.rows)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Feature Rows</p>
                <ul className="mt-2 space-y-1">
                  {bootstrapResult.features.map((entry, index) => (
                    <li key={`${entry.symbol}-${entry.interval}-features-${index}`}>
                      {entry.symbol} {entry.interval}: {formatNumber(entry.rows)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2">
                <p className="font-medium text-foreground">Report Artifact</p>
                <p>{bootstrapResult.report_path ?? "n/a"}</p>
              </div>
            </div>

            {bootstrapResult.inventory?.length ? (
              <div>
                <p className="font-medium text-foreground">Post-bootstrap Coverage</p>
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">{isEasyMode ? "Price Data Points" : "OHLCV Candles"}</TableHead>
                      <TableHead className="text-right">Feature Rows</TableHead>
                      <TableHead className="text-right">Latest Candle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bootstrapResult.inventory
                      .filter((row) =>
                        bootstrapResult.requested_symbols.includes(row.symbol) &&
                        bootstrapResult.requested_intervals.includes(row.interval),
                      )
                      .map((row) => {
                        const key = `${row.symbol}__${row.interval}`;
                        return (
                          <TableRow key={key}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{row.symbol}</span>
                                <Badge variant="secondary">{row.interval}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(row.ohlcv_count)}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(row.features_count)}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {row.latest_candle ? new Date(row.latest_candle).toLocaleString() : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
