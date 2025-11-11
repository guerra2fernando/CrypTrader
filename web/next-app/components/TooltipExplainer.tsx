import { useState } from "react";
import { HelpCircle } from "lucide-react";

import { useMode } from "@/lib/mode-context";
import { cn } from "@/lib/utils";

type TooltipExplainerProps = {
  term: string;
  explanation: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function TooltipExplainer({ term, explanation, className, size = "sm" }: TooltipExplainerProps) {
  const { isEasyMode } = useMode();
  const [isHovered, setIsHovered] = useState(false);

  // Only show in Easy Mode
  if (!isEasyMode) {
    return null;
  }

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "md" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        className="inline-flex items-center text-primary hover:text-primary/80 focus:outline-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={`Explanation for ${term}`}
      >
        <HelpCircle className={cn(iconSize, "ml-1")} />
      </button>
      {isHovered && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
          <div className="font-semibold text-foreground">{term}</div>
          <div className="mt-1 text-muted-foreground">{explanation}</div>
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r bg-popover" />
        </div>
      )}
    </div>
  );
}

