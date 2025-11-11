import { useEffect, useState } from "react";
import { Settings, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMode } from "@/lib/mode-context";
import { cn } from "@/lib/utils";

export function ModeToggle(): JSX.Element | null {
  const { mode, setMode, isEasyMode } = useMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs",
          isEasyMode && "bg-background shadow-sm",
        )}
        onClick={() => setMode("easy")}
        aria-label="Switch to Easy Mode"
        title="Easy Mode - Guided experience with explanations"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Easy</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs",
          !isEasyMode && "bg-background shadow-sm",
        )}
        onClick={() => setMode("advanced")}
        aria-label="Switch to Advanced Mode"
        title="Advanced Mode - Full access to all features"
      >
        <Settings className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Advanced</span>
      </Button>
    </div>
  );
}

