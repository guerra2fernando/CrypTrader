import { EmptyState } from "@/components/EmptyState";
import { TooltipExplainer } from "@/components/TooltipExplainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMode } from "@/lib/mode-context";

type Experiment = {
  experiment_id: string;
  status: string;
  score?: number;
  metrics?: Record<string, number>;
  insights?: Record<string, any>;
  notes?: Array<{ note: string; created_at: string }>;
  candidate?: {
    genome?: {
      strategy_id?: string;
      family?: string;
      fitness?: Record<string, number>;
    };
    metadata?: {
      horizon?: string;
      model_type?: string;
      features?: string[];
    };
    operations?: string[];
  };
};

type ExperimentDetailPanelProps = {
  experiment?: Experiment | null;
};

export function ExperimentDetailPanel({ experiment }: ExperimentDetailPanelProps) {
  const { isEasyMode } = useMode();

  if (!experiment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Experiment Details
            <TooltipExplainer 
              term="Experiment Details" 
              explanation="Detailed breakdown of a specific strategy experiment including performance metrics, mutations applied, features used, and notes. This helps understand what changed from the parent strategy and how those changes affected performance. Use this to learn which types of mutations improve results."
              size="sm"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="default"
            title={isEasyMode ? "Select an Experiment" : "Select an Experiment"}
            description={
              isEasyMode
                ? "Click on an experiment from the board to see detailed information about how it performed and what changes were made."
                : "Select an experiment to inspect metrics and mutations."
            }
          />
        </CardContent>
      </Card>
    );
  }

  const metadata = experiment.candidate?.metadata ?? {};
  const metrics = experiment.metrics ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          {experiment.experiment_id}
          <TooltipExplainer 
            term="Experiment ID" 
            explanation="Unique identifier for this specific strategy test. The ID helps track this experiment across the system - in logs, reports, and the lineage graph. Each experiment represents testing one specific combination of strategy parameters to see how it performs."
            size="sm"
          />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {metadata.model_type ?? "Unknown model"} · {metadata.horizon ?? "—"} horizon
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <section>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Metrics</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="rounded-md border border-border/50 bg-muted/20 p-2">
                <p className="font-medium text-foreground">{key}</p>
                <p>{typeof value === "number" ? value.toFixed(4) : value}</p>
              </div>
            ))}
            {Object.keys(metrics).length === 0 ? <p>No metrics recorded yet.</p> : null}
          </div>
        </section>

        {Array.isArray(experiment.candidate?.operations) && experiment.candidate?.operations?.length ? (
          <section>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Mutation Operations</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {experiment.candidate?.operations?.map((operation) => (
                <li key={operation}>{operation}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {Array.isArray(metadata.features) && metadata.features.length ? (
          <section>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Features</h3>
            <p className="mt-1 text-xs text-muted-foreground">{metadata.features.join(", ")}</p>
          </section>
        ) : null}

        {experiment.notes && experiment.notes.length ? (
          <section>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Notes</h3>
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              {experiment.notes.map((note) => (
                <li key={`${note.note}-${note.created_at}`} className="rounded-md border border-border/60 bg-muted/20 p-2">
                  <p>{note.note}</p>
                  <p className="mt-1 text-[10px] uppercase opacity-60">{note.created_at}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

