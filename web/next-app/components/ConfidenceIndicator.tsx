import { Badge } from "@/components/ui/badge";

type Props = {
  value: number | null | undefined;
};

export function ConfidenceIndicator({ value }: Props) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <Badge variant="outline">N/A</Badge>;
  }

  const percent = Math.max(0, Math.min(1, value));
  const display = `${(percent * 100).toFixed(0)}%`;

  let variant: "success" | "warning" | "destructive" | "secondary" = "secondary";
  if (percent >= 0.7) {
    variant = "success";
  } else if (percent >= 0.5) {
    variant = "warning";
  } else if (percent < 0.3) {
    variant = "destructive";
  }

  return <Badge variant={variant}>{display}</Badge>;
}

