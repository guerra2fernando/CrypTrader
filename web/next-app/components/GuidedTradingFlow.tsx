import { useState } from "react";
import { ArrowRight, CheckCircle2, TrendingUp, TrendingDown, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMode } from "@/lib/mode-context";
import { cn } from "@/lib/utils";

type TradingAction = "buy" | "sell" | "positions" | "recommendations";

type GuidedTradingFlowProps = {
  onActionSelect?: (action: TradingAction) => void;
  onSubmitOrder?: (order: { symbol: string; side: "buy" | "sell"; size: number }) => Promise<void>;
};

export function GuidedTradingFlow({ onActionSelect, onSubmitOrder }: GuidedTradingFlowProps) {
  const { isEasyMode } = useMode();
  const [selectedAction, setSelectedAction] = useState<TradingAction | null>(null);
  const [step, setStep] = useState<number>(1);
  const [orderData, setOrderData] = useState({ symbol: "", side: "buy" as "buy" | "sell", size: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show in Easy Mode
  if (!isEasyMode) {
    return null;
  }

  const handleActionSelect = (action: TradingAction) => {
    setSelectedAction(action);
    setStep(1);
    onActionSelect?.(action);
  };

  const handleSubmitOrder = async () => {
    if (!orderData.symbol || !orderData.size) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmitOrder?.({
        symbol: orderData.symbol,
        side: orderData.side,
        size: parseFloat(orderData.size),
      });
      setStep(2); // Show success
    } catch (error) {
      console.error("Order submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedAction) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>What would you like to do?</CardTitle>
          <CardDescription>Choose an action to get step-by-step guidance</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 text-left"
            onClick={() => handleActionSelect("buy")}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold">Buy Cryptocurrency</span>
            </div>
            <span className="text-xs text-muted-foreground">Purchase crypto with step-by-step guidance</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 text-left"
            onClick={() => handleActionSelect("sell")}
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <span className="font-semibold">Sell Cryptocurrency</span>
            </div>
            <span className="text-xs text-muted-foreground">Sell your crypto holdings</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 text-left"
            onClick={() => handleActionSelect("positions")}
          >
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">Check My Positions</span>
            </div>
            <span className="text-xs text-muted-foreground">View your current holdings and their value</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 text-left"
            onClick={() => handleActionSelect("recommendations")}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">See Recommendations</span>
            </div>
            <span className="text-xs text-muted-foreground">Get AI-powered trading suggestions</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (selectedAction === "buy" || selectedAction === "sell") {
    if (step === 2) {
      return (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Order Submitted Successfully!
            </CardTitle>
            <CardDescription>Your {selectedAction} order has been submitted and is being processed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Symbol:</span> {orderData.symbol}
              </div>
              <div>
                <span className="font-semibold">Side:</span> {orderData.side === "buy" ? "Buy" : "Sell"}
              </div>
              <div>
                <span className="font-semibold">Size:</span> {orderData.size}
              </div>
            </div>
            <Button className="mt-4" onClick={() => {
              setSelectedAction(null);
              setStep(1);
              setOrderData({ symbol: "", side: "buy", size: "" });
            }}>
              Place Another Order
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>
            {selectedAction === "buy" ? "Buy" : "Sell"} Cryptocurrency - Step {step} of 2
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Let's set up your order. First, choose what you want to trade."
              : "Review your order details and submit when ready."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="symbol">What cryptocurrency do you want to {selectedAction}?</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., BTC/USDT, ETH/USDT"
                  value={orderData.symbol}
                  onChange={(e) => setOrderData({ ...orderData, symbol: e.target.value.toUpperCase() })}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the trading pair (e.g., BTC/USDT means Bitcoin priced in USDT)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">How much do you want to {selectedAction}? (USD)</Label>
                <Input
                  id="size"
                  type="number"
                  placeholder="e.g., 100"
                  value={orderData.size}
                  onChange={(e) => setOrderData({ ...orderData, size: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the dollar amount you want to {selectedAction === "buy" ? "spend" : "sell"}
                </p>
              </div>
              <Button onClick={() => setStep(2)} disabled={!orderData.symbol || !orderData.size} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-lg border bg-background p-4">
                <h4 className="mb-3 font-semibold">Review Your Order</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Action:</span>
                    <span className="font-medium">{selectedAction === "buy" ? "Buy" : "Sell"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Symbol:</span>
                    <span className="font-medium">{orderData.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">${orderData.size} USD</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmitOrder} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Submitting..." : `Submit ${selectedAction === "buy" ? "Buy" : "Sell"} Order`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (selectedAction === "positions") {
    return (
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle>Your Positions</CardTitle>
          <CardDescription>View your current cryptocurrency holdings below</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your positions will appear in the table below. This shows what cryptocurrencies you currently own and their
            current value.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setSelectedAction(null)}>
            Choose Another Action
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (selectedAction === "recommendations") {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Get Recommendations</CardTitle>
          <CardDescription>Visit the Assistant page to get AI-powered trading recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The Assistant uses advanced AI to analyze market conditions and suggest the best trading opportunities for
            you.
          </p>
          <Button className="mt-4" onClick={() => (window.location.href = "/assistant")}>
            Go to Assistant
          </Button>
          <Button variant="outline" className="ml-2 mt-4" onClick={() => setSelectedAction(null)}>
            Choose Another Action
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

