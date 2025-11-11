/* eslint-disable */
// @ts-nocheck
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { ErrorMessage } from "@/components/ErrorMessage";
import { InsightsTabs } from "@/components/InsightsTabs";
import { SuccessState } from "@/components/SuccessState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetcher, postJson } from "@/lib/api";

type MetaModelResponse = {
  latest?: {
    trained_at?: string;
    sample_count?: number;
    metrics?: Record<string, number>;
    feature_importances?: { feature: string; importance: number }[];
  };
};

type AllocatorResponse = {
  snapshot?: {
    weights?: { strategy_id: string; weight: number; expected_roi?: number }[];
    expected_portfolio_return?: number;
    expected_portfolio_risk?: number;
    history?: Record<string, number[]>;
  };
};

type OverfitResponse = {
  alerts: Array<{
    _id?: string;
    strategy_id: string;
    decay: number;
    baseline_roi?: number;
    recent_roi?: number;
    detected_at?: string;
    latest_run_id?: string;
    sharpe_delta?: number;
  }>;
};

type KnowledgeResponse = {
  entry?: {
    summary?: string;
    created_at?: string;
    overfit_ids?: string[];
    queued_strategies?: string[];
  };
};

export default function LearningInsightsTab() {
  const { data: metaData, mutate: mutateMeta, isLoading: isLoadingMeta } = useSWR<MetaModelResponse>(
    "/api/learning/meta-model",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    },
  );
  const { data: allocatorData, mutate: mutateAllocator, isLoading: isLoadingAllocator } = useSWR<AllocatorResponse>(
    "/api/learning/allocator",
    fetcher,
    {
      refreshInterval: 120_000,
    },
  );
  const { data: overfitData, mutate: mutateOverfit, isLoading: isLoadingOverfit } = useSWR<OverfitResponse>(
    "/api/learning/overfit?status=open",
    fetcher,
    {
      refreshInterval: 60_000,
    },
  );
  const { data: knowledgeData, mutate: mutateKnowledge, isLoading: isLoadingKnowledge } = useSWR<KnowledgeResponse>(
    "/api/knowledge/latest",
    fetcher,
    {
      refreshInterval: 300_000,
    },
  );

  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [cycleStatus, setCycleStatus] = useState<{ running: boolean; error?: string; message?: string }>({
    running: false,
  });

  const handleAck = useCallback(
    async (alertId: string) => {
      setAcknowledgingId(alertId);
      try {
        await postJson("/api/learning/overfit/ack", { alert_id: alertId });
        await mutateOverfit();
        await mutateKnowledge();
      } catch (error) {
        console.error("Failed to acknowledge alert", error);
      } finally {
        setAcknowledgingId(null);
      }
    },
    [mutateKnowledge, mutateOverfit],
  );

  const runCycle = useCallback(async () => {
    setCycleStatus({ running: true });
    try {
      const response = await postJson("/api/learning/cycle/run", {
        train_meta: true,
        generate_candidates: true,
        rebalance: true,
        evaluate_overfit: true,
      });
      setCycleStatus({ running: false, message: "Learning cycle completed." });
      await Promise.all([mutateMeta(), mutateAllocator(), mutateOverfit(), mutateKnowledge()]);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run learning cycle.";
      setCycleStatus({ running: false, error: message });
      return null;
    }
  }, [mutateAllocator, mutateKnowledge, mutateMeta, mutateOverfit]);

  const metaInsights = useMemo(() => {
    return metaData?.latest;
  }, [metaData]);

  const allocatorInsights = useMemo(() => {
    const snapshot = allocatorData?.snapshot;
    return snapshot
      ? {
          weights: snapshot.weights,
          expected_portfolio_return: snapshot.expected_portfolio_return,
          expected_portfolio_risk: snapshot.expected_portfolio_risk,
        }
      : undefined;
  }, [allocatorData]);

  const knowledgeInsights = useMemo(() => {
    const entry = knowledgeData?.entry;
    if (!entry) {
      return undefined;
    }
    return {
      summary: entry.summary,
      created_at: entry.created_at,
      overfit_ids: entry.overfit_ids,
      queued_strategies: entry.queued_strategies,
    };
  }, [knowledgeData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Learning Insights</h2>
          <p className="text-sm text-muted-foreground">
            Meta-model diagnostics, allocator decisions, and overfitting alerts from the adaptive intelligence loop.
          </p>
        </div>
        <Button onClick={runCycle} disabled={cycleStatus.running}>
          {cycleStatus.running ? "Running Cycle…" : "Run Learning Cycle"}
        </Button>
      </div>

      {cycleStatus.error && (
        <ErrorMessage
          title="Cycle failed"
          message={cycleStatus.error}
          onRetry={() => runCycle()}
        />
      )}

      {cycleStatus.message && !cycleStatus.error && (
        <SuccessState
          title="Learning cycle completed"
          message={cycleStatus.message}
        />
      )}

      <InsightsTabs
        meta={metaInsights}
        allocator={allocatorInsights}
        overfit={overfitData}
        knowledge={knowledgeInsights}
        acknowledgingId={acknowledgingId}
        onAckOverfit={handleAck}
        isLoading={{
          meta: isLoadingMeta,
          allocator: isLoadingAllocator,
          overfit: isLoadingOverfit,
          knowledge: isLoadingKnowledge,
        }}
      />
    </div>
  );
}

