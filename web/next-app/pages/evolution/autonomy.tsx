/* eslint-disable */
// @ts-nocheck
import { useMemo, useState } from "react";
import useSWR from "swr";

import { AutonomyAlertDrawer } from "@/components/AutonomyAlertDrawer";
import { AutomationToggle } from "@/components/AutomationToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExperimentDetailPanel } from "@/components/ExperimentDetailPanel";
import { ExperimentKanbanBoard } from "@/components/ExperimentKanbanBoard";
import { RollbackModal } from "@/components/RollbackModal";
import { SchedulerStatusBadge } from "@/components/SchedulerStatusBadge";
import { SafetyGuardSummary } from "@/components/SafetyGuardSummary";
import { TooltipExplainer } from "@/components/TooltipExplainer";
import { fetcher, postJson, putJson } from "@/lib/api";
import { useWebSocket } from "@/lib/hooks";

type EvolutionResponse = {
  experiments: any[];
};

type SchedulerResponse = {
  schedulers: any[];
};

type AutonomySettings = {
  auto_promote: boolean;
  auto_promote_threshold: number;
  safety_limits?: Record<string, number | string>;
  knowledge_retention_weeks?: number;
  llm_provider?: string;
  llm_model?: string;
};

export default function EvolutionAutonomyPage() {
  // Use WebSocket for real-time experiment updates, fallback to polling
  const { data: wsData, isConnected: wsConnected } = useWebSocket("/ws/evolution");
  const { data: experimentsData, mutate: refreshExperiments } = useSWR(
    "/api/evolution/experiments?limit=60",
    fetcher,
    { refreshInterval: wsConnected ? 0 : 15000 }, // Disable polling if WebSocket is connected
  );
  const { data: schedulerData, mutate: refreshScheduler } = useSWR("/api/evolution/schedulers", fetcher);
  const { data: autonomyData, mutate: refreshAutonomy } = useSWR("/api/settings/autonomy", fetcher);

  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackStrategyId, setRollbackStrategyId] = useState<string | null>(null);
  const [runningCycle, setRunningCycle] = useState(false);
  // Merge WebSocket data with API data
  const experiments = useMemo(() => {
    if (wsData && wsData.type === "evolution_update") {
      return wsData.experiments || [];
    }
    return (experimentsData as EvolutionResponse | undefined)?.experiments ?? [];
  }, [wsData, experimentsData]);

  const selectedExperiment = experiments.find((experiment) => experiment.experiment_id === selectedExperimentId) ?? null;
  
  // Use WebSocket scheduler data if available
  const schedulerState = useMemo(() => {
    if (wsData && wsData.type === "evolution_update" && wsData.schedulers) {
      return Array.isArray(wsData.schedulers) ? wsData.schedulers[0] : wsData.schedulers;
    }
    return (schedulerData as SchedulerResponse | undefined)?.schedulers?.[0];
  }, [wsData, schedulerData]);
  const autonomySettings = (autonomyData as AutonomySettings | undefined) ?? {
    auto_promote: false,
    auto_promote_threshold: 0.05,
    safety_limits: {},
    knowledge_retention_weeks: 12,
    llm_provider: "disabled",
  };

  const alerts = useMemo(() => {
    return experiments
      .filter((experiment) => typeof experiment.metrics?.max_drawdown === "number" && experiment.metrics.max_drawdown > 0.2)
      .slice(0, 3)
      .map((experiment) => ({
        id: experiment.experiment_id,
        title: `High drawdown for ${experiment.experiment_id}`,
        message: `Max drawdown ${(experiment.metrics.max_drawdown * 100).toFixed(1)}% exceeds guardrails.`,
        severity: "warning" as const,
      }));
  }, [experiments]);

  const handleAutomationToggle = async (enabled: boolean) => {
    await putJson("/api/settings/autonomy", {
      ...autonomySettings,
      auto_promote: enabled,
    });
    refreshAutonomy();
  };

  const handleSchedulerToggle = async (enabled: boolean) => {
    await postJson("/api/evolution/schedulers/toggle", { enabled });
    refreshScheduler();
  };

  const handleRunCycle = async () => {
    try {
      setRunningCycle(true);
      await postJson("/api/evolution/run", {});
      await refreshExperiments();
    } finally {
      setRunningCycle(false);
    }
  };

  const handleRollback = (experimentId: string) => {
    setRollbackStrategyId(experimentId);
    setRollbackOpen(true);
  };

  const confirmRollback = async (targetStrategyId: string | null) => {
    if (!rollbackStrategyId) return;
    await postJson("/api/evolution/rollback", {
      strategy_id: rollbackStrategyId,
      target_strategy_id: targetStrategyId,
    });
    setRollbackOpen(false);
    setRollbackStrategyId(null);
    await refreshExperiments();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Autonomous Evolution
          <TooltipExplainer 
            term="Autonomous Evolution" 
            explanation="This is the fully automated strategy discovery system. Unlike manual mode where you click 'Run Experiments', autonomous mode continuously generates, tests, and evaluates strategies 24/7. It automatically promotes winners to production and pauses underperformers. Schedulers and safety guardrails ensure quality control. This allows the system to evolve trading strategies without constant human intervention."
          />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor continuous strategy evolution with automatic quality control and safety guardrails.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Evolution Control Panel
              <TooltipExplainer 
                term="Evolution Control Panel" 
                explanation="Control the autonomous evolution system. The scheduler determines when to run experiments (continuously vs scheduled intervals). Auto-promote settings determine if winning strategies are automatically activated for trading or require manual approval. Safety limits prevent promoting strategies with excessive drawdowns or risk metrics."
              />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Monitor experiment throughput, schedule automation, and promote winning strategies with guardrails.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <SchedulerStatusBadge state={schedulerState} />
              <Button onClick={() => handleSchedulerToggle(!(schedulerState?.enabled ?? false))}>
                {schedulerState?.enabled ? "Pause Scheduler" : "Resume Scheduler"}
              </Button>
              <Button variant="outline" onClick={handleRunCycle} disabled={runningCycle}>
                {runningCycle ? "Running…" : "Run Cycle Now"}
              </Button>
            </div>
            <AutomationToggle enabled={autonomySettings.auto_promote} onChange={handleAutomationToggle} />
            <SafetyGuardSummary safetyLimits={autonomySettings.safety_limits} />
          </CardContent>
        </Card>
        <AutonomyAlertDrawer alerts={alerts} />
      </div>

      <ExperimentKanbanBoard
        experiments={experiments}
        onSelect={(experiment) => setSelectedExperimentId(experiment.experiment_id)}
        selectedId={selectedExperimentId}
      />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <ExperimentDetailPanel experiment={selectedExperiment} />
        <Card>
          <CardHeader>
            <CardTitle>
              Actions
              <TooltipExplainer 
                term="Evolution Actions" 
                explanation="Manage individual experiments. 'Rollback' reverts a strategy to a previous version if it's underperforming - useful when a mutation made things worse. You can roll back to any point in the strategy's lineage. This is a safety valve for fixing mistakes in the evolution process."
                size="sm"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="secondary"
              disabled={!selectedExperiment}
              onClick={() => selectedExperiment && handleRollback(selectedExperiment.candidate?.genome?.strategy_id ?? selectedExperiment.experiment_id)}
            >
              Rollback Selected
            </Button>
          </CardContent>
        </Card>
      </div>

      <RollbackModal
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        strategyId={rollbackStrategyId}
        onConfirm={confirmRollback}
      />
    </div>
  );
}

