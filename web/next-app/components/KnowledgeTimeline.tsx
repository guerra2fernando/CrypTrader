import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMode } from "@/lib/mode-context";

type KnowledgeEntry = {
  period: string;
  summary?: string;
  insights?: string[];
  actionables?: string[];
  evaluation_count?: number;
  created_at?: string;
};

type KnowledgeTimelineProps = {
  entries: KnowledgeEntry[];
  onSelect?: (entry: KnowledgeEntry) => void;
};

export function KnowledgeTimeline({ entries, onSelect }: KnowledgeTimelineProps) {
  const { isEasyMode } = useMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <EmptyState
            variant="data"
            title={isEasyMode ? "No Insights Yet" : "No Knowledge Recorded"}
            description={
              isEasyMode
                ? "Historical insights and learnings will appear here once the system has analyzed trading data. Check back after some trading activity."
                : "No knowledge recorded yet."
            }
          />
        ) : null}
        {entries.map((entry) => (
          <button
            key={entry.period}
            type="button"
            onClick={() => onSelect?.(entry)}
            className="w-full rounded-lg border border-border/60 bg-muted/20 p-4 text-left transition hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{entry.period}</span>
              <span className="text-xs text-muted-foreground">
                {entry.evaluation_count ? `${entry.evaluation_count} evaluations` : "—"}
              </span>
            </div>
            {entry.summary ? <p className="mt-2 text-xs text-muted-foreground">{entry.summary}</p> : null}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

