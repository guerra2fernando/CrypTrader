import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMode } from "@/lib/mode-context";
import { AlertCircle, RefreshCw, HelpCircle } from "lucide-react";

type ErrorMessageProps = {
  title?: string;
  message: string;
  error?: Error | string | null;
  onRetry?: () => void;
  guidance?: string;
  variant?: "default" | "destructive" | "warning";
};

export function ErrorMessage({
  title,
  message,
  error,
  onRetry,
  guidance,
  variant = "destructive",
}: ErrorMessageProps) {
  const { isEasyMode } = useMode();

  const errorText = error instanceof Error ? error.message : typeof error === "string" ? error : null;
  const displayMessage = errorText || message;

  // Provide guidance based on error type in Easy Mode
  const getGuidance = (): string | null => {
    if (guidance) return guidance;

    if (!isEasyMode) return null;

    const lowerMessage = displayMessage.toLowerCase();

    if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
      return "Check your internet connection and try again. If the problem persists, the server might be temporarily unavailable.";
    }

    if (lowerMessage.includes("timeout")) {
      return "The request took too long. This might happen during high load. Please try again in a moment.";
    }

    if (lowerMessage.includes("unauthorized") || lowerMessage.includes("permission")) {
      return "You don't have permission to perform this action. Contact your administrator if you believe this is an error.";
    }

    if (lowerMessage.includes("not found") || lowerMessage.includes("404")) {
      return "The requested resource was not found. It may have been deleted or moved.";
    }

    if (lowerMessage.includes("server") || lowerMessage.includes("500")) {
      return "The server encountered an error. Please try again later or contact support if the problem continues.";
    }

    return "Something went wrong. Please try again, or contact support if the problem persists.";
  };

  const guidanceText = getGuidance();

  return (
    <Card className={`border ${variant === "destructive" ? "border-destructive/50 bg-destructive/10" : variant === "warning" ? "border-amber-500/50 bg-amber-500/10" : "border-muted"}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className={`h-5 w-5 ${variant === "destructive" ? "text-destructive" : variant === "warning" ? "text-amber-600" : "text-muted-foreground"}`} />
          <CardTitle className={variant === "destructive" ? "text-destructive" : variant === "warning" ? "text-amber-900 dark:text-amber-100" : ""}>
            {title || "Error"}
          </CardTitle>
        </div>
        <CardDescription className={variant === "destructive" ? "text-destructive/80" : variant === "warning" ? "text-amber-800 dark:text-amber-200" : ""}>
          {displayMessage}
        </CardDescription>
      </CardHeader>
      {(guidanceText || onRetry) && (
        <CardContent className="space-y-3">
          {guidanceText && (
            <div className="flex gap-2 rounded-md border border-border/50 bg-muted/30 p-3">
              <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{guidanceText}</p>
            </div>
          )}
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm" className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

