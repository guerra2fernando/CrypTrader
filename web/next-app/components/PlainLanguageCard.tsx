import { useMode } from "@/lib/mode-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlainLanguageCardProps = {
  technicalTerm: string;
  plainTerm: string;
  explanation: string;
  children?: React.ReactNode;
  className?: string;
};

// Mapping of technical terms to plain language
const TERM_MAP: Record<string, { plain: string; explanation: string }> = {
  "OHLCV": {
    plain: "Price Data",
    explanation: "Historical market prices including open, high, low, close, and trading volume",
  },
  "meta-model": {
    plain: "Strategy Selector",
    explanation: "The system that automatically chooses which trading strategies to use based on their performance",
  },
  "Meta-model": {
    plain: "Strategy Selector",
    explanation: "The system that automatically chooses which trading strategies to use based on their performance",
  },
  "allocator": {
    plain: "Portfolio Allocation",
    explanation: "How the system divides your trading capital between different strategies",
  },
  "Allocator": {
    plain: "Portfolio Allocation",
    explanation: "How the system divides your trading capital between different strategies",
  },
  "Evolution": {
    plain: "Strategy Discovery",
    explanation: "The system automatically creates and tests new trading strategies to find better ones",
  },
  "backtest": {
    plain: "Strategy Test",
    explanation: "Testing how a trading strategy would have performed using historical data",
  },
  "Backtest": {
    plain: "Strategy Test",
    explanation: "Testing how a trading strategy would have performed using historical data",
  },
  "Sharpe Ratio": {
    plain: "Risk-Adjusted Return",
    explanation: "A measure of how much profit you make relative to the risk you take. Higher is better.",
  },
  "Sharpe": {
    plain: "Risk-Adjusted Return",
    explanation: "A measure of how much profit you make relative to the risk you take. Higher is better.",
  },
  "Max Drawdown": {
    plain: "Worst Loss Period",
    explanation: "The largest drop in value from a peak to a low point. Lower is better.",
  },
  "Drawdown": {
    plain: "Loss Period",
    explanation: "A period when your portfolio value decreases from a previous high point",
  },
  "PnL": {
    plain: "Profit/Loss",
    explanation: "The total amount of money you've made or lost from your trades",
  },
  "Data Bootstrap Controls": {
    plain: "Initial Setup",
    explanation: "Kick off the end-to-end data preparation: download market history, build features, and produce a baseline report",
  },
};

export function PlainLanguageCard({ technicalTerm, plainTerm, explanation, children, className }: PlainLanguageCardProps) {
  const { isEasyMode } = useMode();

  // Only show in Easy Mode
  if (!isEasyMode) {
    return children ? <>{children}</> : null;
  }

  const termInfo = TERM_MAP[technicalTerm] || { plain: plainTerm, explanation };

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader>
        <CardTitle className="text-base">
          {termInfo.plain}
          <span className="ml-2 text-xs font-normal text-muted-foreground">({technicalTerm})</span>
        </CardTitle>
        <CardDescription>{termInfo.explanation}</CardDescription>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// Helper function to translate terms based on mode
export function translateTerm(term: string, mode: "easy" | "advanced"): string {
  if (mode === "advanced") {
    return term;
  }
  const mapping = TERM_MAP[term];
  return mapping ? mapping.plain : term;
}

