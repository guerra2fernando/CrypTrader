import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { ForecastTable, type ForecastRow } from "@/components/ForecastTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildApiUrl, fetcher } from "@/lib/api";

const HORIZONS = ["1m", "1h", "1d"] as const;
const DEFAULT_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
const HISTORY_LENGTH = 60;

type RawForecast = ForecastRow & {
  predicted_return?: number;
  prediction?: number;
};

type ForecastBatchResponse = {
  forecasts: RawForecast[];
};

function useBatchForecast(horizon: string, symbols: string[]) {
  const params = new URLSearchParams({
    horizon,
    symbols: symbols.join(","),
  });
  const key = `/api/forecast/batch?${params.toString()}`;
  return useSWR<ForecastBatchResponse>(key, (url) => fetcher<ForecastBatchResponse>(url), {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
}

export default function ForecastsPage() {
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>("1h");
  const [symbols] = useState(DEFAULT_SYMBOLS);
  const { data, isLoading, error, mutate } = useBatchForecast(horizon, symbols);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (data) {
      setLastUpdated(new Date());
    }
  }, [data]);

  useEffect(() => {
    setHistory({});
  }, [horizon]);

  useEffect(() => {
    if (!data?.forecasts) {
      return;
    }
    setHistory((prev) => {
      const next: Record<string, number[]> = { ...prev };
      for (const item of data.forecasts) {
        const key = item.symbol;
        const prediction = item.pred_return ?? item.predicted_return ?? item.prediction;
        if (typeof prediction !== "number" || Number.isNaN(prediction)) {
          continue;
        }
        const series = next[key] ? [...next[key], prediction] : [prediction];
        next[key] = series.slice(-HISTORY_LENGTH);
      }
      return next;
    });
  }, [data]);

  const handleExport = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        horizon,
        symbols: symbols.join(","),
      });
      const url = buildApiUrl(`/api/forecast/export?${params.toString()}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const filename = `forecast_${horizon}_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export forecasts.");
    } finally {
      setIsExporting(false);
    }
  };

  const rows: ForecastRow[] = useMemo(
    () =>
      data?.forecasts?.map((item) => ({
        symbol: item.symbol,
        horizon: item.horizon,
        timestamp: item.timestamp,
        pred_return: item.pred_return ?? item.predicted_return ?? item.prediction ?? undefined,
        confidence: item.confidence,
        models: item.models,
        error: item.error,
      })) ?? [],
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forecast Studio</h1>
          <p className="text-sm text-muted-foreground">
            Ensemble predictions for {symbols.join(", ")} across multiple horizons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {HORIZONS.map((h) => (
            <Button key={h} variant={h === horizon ? "default" : "outline"} onClick={() => setHorizon(h)}>
              {h.toUpperCase()}
            </Button>
          ))}
          <Button variant="outline" onClick={handleExport} disabled={isLoading || isExporting}>
            {isExporting ? "Exporting..." : "Download CSV"}
          </Button>
          <Button variant="ghost" onClick={() => mutate()} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load forecasts</CardTitle>
            <CardDescription className="text-destructive/80">{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {exportError && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="py-3 text-sm text-amber-900 dark:text-amber-200">{exportError}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{horizon.toUpperCase()} Ensemble Forecasts</CardTitle>
          <CardDescription>Weighted by inverse RMSE with confidence derived from prediction spread.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastTable data={rows} isLoading={isLoading} lastUpdated={lastUpdated} history={history} />
        </CardContent>
      </Card>
    </div>
  );
}

