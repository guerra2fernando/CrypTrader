import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMode } from "@/lib/mode-context";

type AutonomyAlert = {
  id: string;
  title: string;
  message: string;
  severity?: "info" | "warning" | "critical";
};

type AutonomyAlertDrawerProps = {
  alerts?: AutonomyAlert[];
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-foreground",
  warning: "text-amber-500",
  critical: "text-red-500",
};

export function AutonomyAlertDrawer({ alerts = [] }: AutonomyAlertDrawerProps) {
  const { isEasyMode } = useMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {alerts.length === 0 ? (
          <EmptyState
            variant="default"
            title={isEasyMode ? "No Alerts" : "No Active Alerts"}
            description={
              isEasyMode
                ? "All automation systems are running smoothly. Alerts will appear here if the system needs your attention."
                : "No active alerts."
            }
          />
        ) : null}
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-md border border-border/60 bg-muted/30 p-3">
            <p className={`text-xs font-semibold ${SEVERITY_COLORS[alert.severity ?? "info"]}`}>{alert.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{alert.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

