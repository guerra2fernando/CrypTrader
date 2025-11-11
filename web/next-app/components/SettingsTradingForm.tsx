/* eslint-disable */
// @ts-nocheck
import { useState } from "react";

import { TooltipExplainer } from "@/components/TooltipExplainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TradingSettings = {
  modes: Record<string, { enabled: boolean; max_notional_usd: number }>;
  risk: { max_trade_usd: number; max_daily_loss_usd: number; max_open_exposure_usd: number };
  auto_mode: { enabled: boolean; confidence_threshold: number; max_trade_usd: number; default_mode: string };
  alerts: { channels: string[] };
};

type SettingsTradingFormProps = {
  settings: TradingSettings;
  onSubmit: (payload: Partial<TradingSettings>) => Promise<void>;
  isSaving?: boolean;
};

export function SettingsTradingForm({ settings, onSubmit, isSaving = false }: SettingsTradingFormProps) {
  const [draft, setDraft] = useState(settings);
  const channelsText = draft.alerts.channels.join(", ");

  const handleNumberChange = (path: string[], value: string) => {
    setDraft((prev) => updateNested(prev, path, parseFloat(value) || 0));
  };

  const handleToggle = (path: string[], value: boolean) => {
    setDraft((prev) => updateNested(prev, path, value));
  };

  const handleChannelsChange = (value: string) => {
    const segments = value.split(",").map((item) => item.trim()).filter(Boolean);
    setDraft((prev) => updateNested(prev, ["alerts", "channels"], segments));
  };

  const handleSubmit = async () => {
    await onSubmit({
      risk: draft.risk,
      auto_mode: draft.auto_mode,
      alerts: draft.alerts,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Trading Settings
          <TooltipExplainer 
            term="Trading Settings" 
            explanation="Core safety and automation settings that protect your capital and control how the system trades. These include hard limits on trade sizes, daily losses, and total exposure, as well as rules for automated trading. These are your financial safety nets."
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Risk Limits
            <TooltipExplainer 
              term="Risk Limits" 
              explanation="Hard caps on how much money can be risked in trades. These act as circuit breakers to prevent catastrophic losses. Once a limit is hit, trading stops automatically until you reset it or the next trading period begins."
            />
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field
              label="Max Trade (USD)"
              value={String(draft.risk.max_trade_usd)}
              onChange={(value) => handleNumberChange(["risk", "max_trade_usd"], value)}
              explanation="The maximum dollar amount for any single trade. For example, $1000 means no individual trade can be larger than $1000 regardless of strategy confidence. This prevents oversized bets from a single strategy."
            />
            <Field
              label="Max Daily Loss (USD)"
              value={String(draft.risk.max_daily_loss_usd)}
              onChange={(value) => handleNumberChange(["risk", "max_daily_loss_usd"], value)}
              explanation="The maximum total loss allowed in one day across all trades. If losses reach this amount, all trading stops until the next day. For example, $500 means trading halts after losing $500 in a day, protecting you from runaway losses."
            />
            <Field
              label="Max Open Exposure (USD)"
              value={String(draft.risk.max_open_exposure_usd)}
              onChange={(value) => handleNumberChange(["risk", "max_open_exposure_usd"], value)}
              explanation="The maximum total value of all open positions at any time. This is like the total amount of money 'in play' across all active trades. For example, $5000 means you can't have more than $5000 worth of open positions, even if individual trades are smaller."
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Auto Mode
            <TooltipExplainer 
              term="Auto Mode" 
              explanation="Controls fully autonomous trading where the system can execute trades without your approval. When enabled, strategies that meet the confidence threshold can trade automatically up to the specified limits. This is the highest level of automation - use with caution."
            />
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ToggleField
              label="Auto Mode Enabled"
              checked={draft.auto_mode.enabled}
              onChange={(checked) => handleToggle(["auto_mode", "enabled"], checked)}
              explanation="Master switch for fully autonomous trading. When on, the system can execute trades without asking you first (subject to other limits). When off, all trades require your approval. Start with this OFF until you're confident in your strategies."
            />
            <Field
              label="Confidence Threshold"
              value={String(draft.auto_mode.confidence_threshold)}
              onChange={(value) => handleNumberChange(["auto_mode", "confidence_threshold"], value)}
              explanation="The minimum confidence score (0.0 to 1.0) a strategy must have before it can auto-trade. 0.65 means only strategies that are 65% confident or higher can trade automatically. Higher values (0.7-0.9) are safer but trade less frequently. Lower values (0.5-0.6) trade more but with less certainty."
            />
            <Field
              label="Auto Max Trade (USD)"
              value={String(draft.auto_mode.max_trade_usd)}
              onChange={(value) => handleNumberChange(["auto_mode", "max_trade_usd"], value)}
              explanation="The maximum size for any auto-executed trade. This is usually set lower than the overall Max Trade limit as an extra safety measure for autonomous trades. For example, $100 means auto-trades can't exceed $100 even if your general Max Trade is $1000."
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Alert Channels
            <TooltipExplainer 
              term="Alert Channels" 
              explanation="Where to send notifications about trades, errors, and important events. Multiple channels ensure you stay informed about what the system is doing. Configure at least one channel so you're aware of trades and can intervene if needed."
            />
          </h3>
          <div className="grid gap-2">
            <Label>
              Channels (comma separated)
              <TooltipExplainer 
                term="Alert Channels List" 
                explanation="List notification methods separated by commas. Options include 'email' (sends to your email), 'sms' (text messages), 'slack' (posts to Slack), 'discord' (Discord webhook), 'telegram' (Telegram bot). Each requires additional setup in your notification provider. Example: 'email, slack, sms'."
              />
            </Label>
            <Input value={channelsText} onChange={(event) => handleChannelsChange(event.target.value)} />
          </div>
        </section>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function Field({ label, value, onChange, explanation }: { label: string; value: string; onChange: (value: string) => void; explanation?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {explanation && <TooltipExplainer term={label} explanation={explanation} />}
      </Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ToggleField({ label, checked, onChange, explanation }: { label: string; checked: boolean; onChange: (value: boolean) => void; explanation?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
      <span className="text-sm font-medium">
        {label}
        {explanation && <TooltipExplainer term={label} explanation={explanation} />}
      </span>
      <button
        type="button"
        className={`h-6 w-12 rounded-full transition ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`m-1 block h-4 w-4 rounded-full bg-background transition ${checked ? "translate-x-6" : ""}`}
        />
      </button>
    </div>
  );
}

function updateNested<T extends Record<string, any>>(object: T, path: string[], value: unknown): T {
  const clone = structuredClone(object);
  let cursor: any = clone;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    cursor[key] = cursor[key] ?? {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
  return clone;
}

