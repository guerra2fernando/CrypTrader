import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMode } from "@/lib/mode-context";
import { Loader2 } from "lucide-react";

type ProgressIndicatorProps = {
  message: string;
  progress?: number; // 0-100
  subMessage?: string;
  variant?: "spinner" | "progress" | "indeterminate";
};

export function ProgressIndicator({ message, progress, subMessage, variant = "spinner" }: ProgressIndicatorProps) {
  const { isEasyMode } = useMode();

  return (
    <Card className="border-muted">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {variant === "spinner" || variant === "indeterminate" ? (
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        ) : null}
        {variant === "progress" && progress !== undefined ? (
          <div className="mb-4 w-full max-w-xs">
            <Progress value={progress} className="mb-2" />
            <p className="text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        ) : null}
        <p className={`mb-2 text-sm font-medium ${isEasyMode ? "text-foreground" : "text-foreground"}`}>
          {message}
        </p>
        {subMessage && <p className="text-xs text-muted-foreground">{subMessage}</p>}
      </CardContent>
    </Card>
  );
}

