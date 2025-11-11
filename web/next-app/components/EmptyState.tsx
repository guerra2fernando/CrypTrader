import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMode } from "@/lib/mode-context";
import { LucideIcon } from "lucide-react";
import { Inbox, Search, TrendingUp, FileText, AlertCircle } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "data" | "trading" | "error";
};

const iconMap: Record<string, LucideIcon> = {
  default: Inbox,
  search: Search,
  data: TrendingUp,
  trading: TrendingUp,
  error: AlertCircle,
};

export function EmptyState({ icon, title, description, action, variant = "default" }: EmptyStateProps) {
  const { isEasyMode } = useMode();
  const Icon = icon ?? iconMap[variant];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className={`mb-6 max-w-sm text-sm ${isEasyMode ? "text-muted-foreground" : "text-muted-foreground"}`}>
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

