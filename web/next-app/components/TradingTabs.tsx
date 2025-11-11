/* eslint-disable */
// @ts-nocheck
import { Button } from "@/components/ui/button";
import { TooltipExplainer } from "@/components/TooltipExplainer";
import { cn } from "@/lib/utils";

type TradingTabsProps = {
  mode: string;
  onModeChange: (mode: string) => void;
  modes?: { key: string; label: string; description?: string }[];
  className?: string;
};

const DEFAULT_MODES = [
  { 
    key: "paper", 
    label: "Paper", 
    description: "Safe simulation using virtual balances.",
    tooltip: "Paper trading uses a virtual account with fake money. Perfect for learning and testing strategies without any financial risk. No real trades are placed on exchanges."
  },
  { 
    key: "testnet", 
    label: "Testnet", 
    description: "Exchange sandbox for end-to-end rehearsals.",
    tooltip: "Testnet connects to exchange sandbox environments that mirror real trading but use test funds. This validates that your system integrates correctly with exchanges before going live."
  },
  { 
    key: "live", 
    label: "Live", 
    description: "Guarded production execution with limits.",
    tooltip: "Live mode places real orders on real exchanges with real money. It includes safety limits and risk management to protect your capital. Only use this once you're confident in your strategies."
  },
];

export function TradingTabs({ mode, onModeChange, modes = DEFAULT_MODES, className }: TradingTabsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {modes.map((item) => {
        const active = item.key === mode;
        return (
          <div key={item.key} className="flex flex-col gap-1">
            <Button
              variant={active ? "default" : "outline"}
              className={cn("min-w-[110px] justify-start", active && "shadow-md")}
              onClick={() => onModeChange(item.key)}
            >
              {item.label}
              {item.tooltip && <TooltipExplainer term={item.label} explanation={item.tooltip} size="sm" />}
            </Button>
            {item.description ? (
              <p className={cn("text-xs text-muted-foreground", !active && "opacity-60")}>{item.description}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

