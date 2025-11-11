/* eslint-disable */
// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMode } from "@/lib/mode-context";
import { formatNumber, formatPercent } from "@/lib/utils";

type RiskGaugeCardProps = {
  title: string;
  current: number;
  limit: number;
  description?: string;
  tone?: "ok" | "warning" | "critical";
};

export function RiskGaugeCard({ title, current, limit, description, tone = "ok" }: RiskGaugeCardProps) {
  const { isEasyMode } = useMode();
  const ratio = limit > 0 ? Math.min(1, current / limit) : 0;
  const percent = ratio * 100;
  const color =
    tone === "critical"
      ? "bg-red-500"
      : tone === "warning"
        ? "bg-amber-500"
        : percent > 80
          ? "bg-amber-500"
          : percent > 95
            ? "bg-red-500"
            : "bg-emerald-500";

  // Generate plain language explanation for Easy Mode
  const getExplanation = (): string => {
    if (percent >= 95 || tone === "critical") {
      return "⚠️ This limit is almost reached. Trading may be restricted to protect your account.";
    } else if (percent >= 80 || tone === "warning") {
      return "⚠️ This limit is getting high. Be careful with new trades.";
    } else {
      return "✓ You're well within safe limits. You can continue trading normally.";
    }
  };

  // Translate title for Easy Mode
  const getPlainTitle = (): string => {
    if (title.includes("Daily Loss")) return "Daily Loss Limit";
    if (title.includes("Open Exposure")) return "Total Investment Limit";
    if (title.includes("Trade")) return "Single Trade Limit";
    return title;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{isEasyMode ? getPlainTitle() : title}</span>
          <span className="text-sm text-muted-foreground">
            ${formatNumber(current, 2)} / ${formatNumber(limit, 2)}
          </span>
        </CardTitle>
        {isEasyMode && <CardDescription className="text-xs">{getExplanation()}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percent} className="h-2">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
        </Progress>
        <div className="text-xs text-muted-foreground">
          {isEasyMode
            ? `${formatPercent(ratio, 1)} of your limit used`
            : description ?? `Usage ${formatPercent(ratio, 1)} of configured limit.`}
        </div>
      </CardContent>
    </Card>
  );
}

