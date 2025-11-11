import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMode } from "@/lib/mode-context";
import { CheckCircle2, ArrowRight } from "lucide-react";

type SuccessStateProps = {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "success";
};

export function SuccessState({ title, message, action, variant = "success" }: SuccessStateProps) {
  const { isEasyMode } = useMode();

  return (
    <Card className={`border ${variant === "success" ? "border-emerald-500/50 bg-emerald-500/10" : "border-muted"}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`h-5 w-5 ${variant === "success" ? "text-emerald-600" : "text-muted-foreground"}`} />
          <CardTitle className={variant === "success" ? "text-emerald-900 dark:text-emerald-100" : ""}>
            {title}
          </CardTitle>
        </div>
        <CardDescription className={variant === "success" ? "text-emerald-800 dark:text-emerald-200" : ""}>
          {message}
        </CardDescription>
      </CardHeader>
      {action && (
        <CardContent>
          <Button onClick={action.onClick} variant="outline" size="sm" className="w-full sm:w-auto">
            {action.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

