/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ArrowRight, CheckCircle2, TrendingUp, Database, Sparkles, BarChart3 } from "lucide-react";

import { ErrorMessage } from "@/components/ErrorMessage";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMode } from "@/lib/mode-context";
import { fetcher } from "@/lib/api";

type Step = "intro" | "data" | "setup" | "complete";

type BootstrapResponse = {
  seeded_symbols: number;
  ingested: Array<{ symbol: string; interval: string; rows: number }>;
  features: Array<{ symbol: string; interval: string; rows: number }>;
  simulation_run_id: string | null;
  report_path: string | null;
  inventory: Array<{
    symbol: string;
    interval: string;
    ohlcv_count: number;
    features_count: number;
    latest_candle: string | null;
  }>;
  timestamp: string;
};

export default function GetStarted(): JSX.Element {
  const router = useRouter();
  const { isEasyMode } = useMode();
  const [currentStep, setCurrentStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapResult, setBootstrapResult] = useState<BootstrapResponse | null>(null);

  // Only show in Easy Mode - redirect if in Advanced Mode
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isEasyMode) {
      router.push("/");
    }
  }, [isEasyMode, router]);

  if (!mounted || !isEasyMode) {
    return null;
  }

  const handleStartSetup = () => {
    setCurrentStep("data");
  };

  const handleRunBootstrap = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use default symbols and intervals for onboarding
      const response = await fetcher<BootstrapResponse>("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: ["BTC/USD", "ETH/USD"],
          intervals: ["1m", "5m"],
          lookback_days: 30,
        }),
      });
      setBootstrapResult(response);
      setCurrentStep("complete");
    } catch (err: any) {
      setError(err.message || "Failed to set up data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Lenxys Trader</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Let's get you set up in just a few steps. We'll guide you through everything.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4">
        {(["intro", "data", "setup", "complete"] as Step[]).map((step, index) => {
          const stepNames = { intro: 1, data: 2, setup: 3, complete: 4 };
          const currentIndex = stepNames[currentStep];
          const stepIndex = stepNames[step];
          const isActive = stepIndex === currentIndex;
          const isCompleted = stepIndex < currentIndex;

          return (
            <div key={step} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-muted/30 text-muted-foreground"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : stepIndex}
              </div>
              {index < 3 && (
                <div
                  className={`h-1 w-16 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === "intro" && "What is Lenxys Trader?"}
            {currentStep === "data" && "Understanding Your Data"}
            {currentStep === "setup" && "Setting Up Your Data"}
            {currentStep === "complete" && "You're All Set!"}
          </CardTitle>
          <CardDescription>
            {currentStep === "intro" && "Learn what this platform can do for you"}
            {currentStep === "data" && "We'll fetch historical market data to get started"}
            {currentStep === "setup" && "Running the initial setup process"}
            {currentStep === "complete" && "Your trading platform is ready to use"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === "intro" && (
            <>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Automated Trading</h3>
                    <p className="text-sm text-muted-foreground">
                      The platform uses AI to analyze markets and make trading recommendations. You stay in control and can review everything before executing trades.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Market Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Get price forecasts, strategy performance insights, and risk assessments to help you make informed decisions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-sm text-muted-foreground">
                      Ask questions, get recommendations, and understand what the system is thinking. The assistant explains everything in plain language.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleStartSetup} size="lg">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {currentStep === "data" && (
            <>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To get started, we need to fetch historical market data. This includes:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Price Data</p>
                      <p className="text-xs text-muted-foreground">
                        Historical prices for cryptocurrencies (like Bitcoin and Ethereum)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Market Features</p>
                      <p className="text-xs text-muted-foreground">
                        Calculated indicators that help predict market movements
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-primary">What we'll do:</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• Fetch the last 30 days of price data for Bitcoin and Ethereum</li>
                    <li>• Calculate market indicators and features</li>
                    <li>• Run a test to make sure everything works</li>
                    <li>• Generate your first performance report</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("intro")}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep("setup")} size="lg">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {currentStep === "setup" && (
            <>
              {!bootstrapResult && !loading && (
                <>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Ready to set up your data? This will take a few minutes.
                    </p>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-medium">Default Setup:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">BTC/USD</Badge>
                        <Badge variant="secondary">ETH/USD</Badge>
                        <Badge variant="secondary">1 minute</Badge>
                        <Badge variant="secondary">5 minute</Badge>
                        <Badge variant="secondary">30 days</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep("data")}>
                      Back
                    </Button>
                    <Button onClick={handleRunBootstrap} size="lg" disabled={loading}>
                      {loading ? "Setting up..." : "Start Setup"}
                    </Button>
                  </div>
                </>
              )}

              {loading && (
                <ProgressIndicator
                  message="Setting up your platform..."
                  subMessage="Fetching market data and calculating features. This may take a few minutes."
                  variant="spinner"
                />
              )}

              {error && (
                <ErrorMessage
                  title="Setup failed"
                  message={error}
                  onRetry={() => {
                    setError(null);
                    setCurrentStep("data");
                  }}
                  guidance="The setup process encountered an error. This might be due to network issues or server problems. Try again, or check your connection."
                />
              )}
            </>
          )}

          {currentStep === "complete" && bootstrapResult && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <CheckCircle2 className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">Setup Complete!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your platform is ready. Here's what we set up:
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Price Data</p>
                    <p className="mt-1 text-2xl font-bold">{bootstrapResult.ingested.length} pairs</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Features Calculated</p>
                    <p className="mt-1 text-2xl font-bold">{bootstrapResult.features.length} sets</p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-primary">What's Next?</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• Visit the Dashboard to see your portfolio overview</li>
                    <li>• Check Insights to see market forecasts and recommendations</li>
                    <li>• Use the Assistant to ask questions about trading</li>
                    <li>• Go to Trading when you're ready to place orders</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleComplete} size="lg">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

