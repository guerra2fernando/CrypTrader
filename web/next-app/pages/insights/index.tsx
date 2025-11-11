/* eslint-disable */
// @ts-nocheck
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { TrendingUp, BarChart3, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

import { type ForecastRow } from "@/components/ForecastTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMode } from "@/lib/mode-context";
import { fetcher } from "@/lib/api";

type ForecastBatchResponse = {
  forecasts: ForecastRow[];
};

type StrategiesResponse = {
  runs: Array<{
    run_id: string;
    strategy: string;
    symbol: string;
    interval: string;
    results: {
      pnl?: number;
      sharpe?: number;
      max_drawdown?: number;
    };
  }>;
};

function useBatchForecast(horizon: string, symbols: string[]) {
  const params = new URLSearchParams({
    horizon,
    symbols: symbols.join(","),
  });
  const key = `/api/forecast/batch?${params.toString()}`;
  return useSWR(key, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
}

export default function InsightsPage() {
  const router = useRouter();
  const { isEasyMode } = useMode();
  const [mounted, setMounted] = useState(false);

  // Forecasts data
  const DEFAULT_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
  const { data: forecastData, isLoading: isLoadingForecasts } = useBatchForecast("1h", DEFAULT_SYMBOLS);
  const forecastRows: ForecastRow[] = useMemo(
    () => (forecastData as ForecastBatchResponse | undefined)?.forecasts ?? [],
    [forecastData],
  );

  // Strategies data
  const { data: strategiesData } = useSWR<StrategiesResponse>("/api/run/sim?limit=5", fetcher);
  const topStrategies = useMemo(() => {
    const runs = strategiesData?.runs ?? [];
    return runs
      .sort((a, b) => (b.results.pnl ?? 0) - (a.results.pnl ?? 0))
      .slice(0, 3);
  }, [strategiesData]);

  useEffect(() => {
    setMounted(true);
    // Only show in Easy Mode - redirect if in Advanced Mode
    if (!isEasyMode) {
      router.push("/analytics");
    }
  }, [isEasyMode, router]);

  if (!mounted || !isEasyMode) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          See what the system thinks about the markets, which strategies are performing best, and get recommendations.
        </p>
      </div>

      {/* What the System Thinks - Forecasts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>What the System Thinks</CardTitle>
          </div>
          <CardDescription>
            Price predictions for the next hour. Positive values mean prices are expected to go up, negative means down.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingForecasts ? (
            <p className="text-sm text-muted-foreground">Loading predictions...</p>
          ) : forecastRows.length > 0 ? (
            <div className="space-y-3">
              {forecastRows.slice(0, 3).map((forecast) => {
                const predReturn = forecast.pred_return ?? 0;
                const isPositive = predReturn > 0;
                return (
                  <div key={forecast.symbol} className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                    <div>
                      <p className="font-medium text-foreground">{forecast.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {isPositive ? "Expected to go up" : predReturn < 0 ? "Expected to go down" : "Expected to stay flat"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={isPositive ? "default" : predReturn < 0 ? "destructive" : "secondary"}>
                        {isPositive ? "+" : ""}
                        {(predReturn * 100).toFixed(2)}%
                      </Badge>
                      {forecast.confidence && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Confidence: {(forecast.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No forecasts available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Best Strategies */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Best Strategies</CardTitle>
          </div>
          <CardDescription>
            Top performing trading strategies based on recent tests. Higher profit means better performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topStrategies.length > 0 ? (
            <div className="space-y-3">
              {topStrategies.map((strategy, index) => {
                const pnl = strategy.results.pnl ?? 0;
                const sharpe = strategy.results.sharpe ?? 0;
                return (
                  <div key={strategy.run_id} className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <p className="font-medium text-foreground">{strategy.strategy}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {strategy.symbol} • {strategy.interval}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Risk-adjusted return: {sharpe.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant={pnl > 0 ? "default" : pnl < 0 ? "destructive" : "secondary"}>
                        {pnl > 0 ? "+" : ""}
                        {pnl.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No strategy results available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Get Recommendations</CardTitle>
          </div>
          <CardDescription>
            Ask the AI assistant for personalized trading recommendations based on current market conditions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/assistant">
            <Button className="w-full sm:w-auto">
              Ask the Assistant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            The assistant can help you understand what to trade, when to trade, and answer any questions about the platform.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

