/* eslint-disable */
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";

const SETTINGS_STORAGE_KEY = "lenxys-settings-v1";

type AutoRefreshSettings = {
  enabled: boolean;
  intervalSeconds: number;
};

type LocalSettings = {
  autoRefresh: AutoRefreshSettings;
};

const DEFAULT_SETTINGS: LocalSettings = {
  autoRefresh: {
    enabled: false,
    intervalSeconds: 60,
  },
};

const STATUS_ENDPOINTS = [
  { key: "status", label: "API Health", path: "/api/status" },
  { key: "overview", label: "Admin Overview", path: "/api/admin/overview" },
  { key: "reports", label: "Recent Reports", path: "/api/reports?limit=3" },
  { key: "runs", label: "Simulation Runs", path: "/api/run/sim?limit=3" },
] as const;

type EndpointKey = (typeof STATUS_ENDPOINTS)[number]["key"];

type EndpointState = "ok" | "warning" | "error";

type EndpointStatus = {
  key: EndpointKey;
  label: string;
  path: string;
  state: EndpointState;
  message: string;
};

const extractEndpointStatus = (endpoint: (typeof STATUS_ENDPOINTS)[number], response: unknown): EndpointStatus => {
  if (endpoint.key === "status") {
    const statusResponse = response as { status?: string };
    const state = statusResponse?.status === "ok" ? "ok" : "warning";
    return {
      ...endpoint,
      state,
      message: statusResponse?.status ? statusResponse.status.toUpperCase() : "Unknown status response",
    };
  }

  if (endpoint.key === "overview") {
    const overview = response as { inventory?: Array<unknown>; available_symbols?: Array<string> };
    const inventoryCount = overview?.inventory?.length ?? 0;
    const symbolCount = overview?.available_symbols?.length ?? 0;
    const state: EndpointState = inventoryCount > 0 ? "ok" : "warning";
    const message =
      inventoryCount > 0
        ? `${inventoryCount} inventory rows • ${symbolCount} symbols`
        : "No inventory rows returned";
    return { ...endpoint, state, message };
  }

  if (endpoint.key === "reports") {
    const reports = response as { reports?: Array<unknown> };
    const count = reports?.reports?.length ?? 0;
    const state: EndpointState = count > 0 ? "ok" : "warning";
    const message = count > 0 ? `${count} recent reports` : "No reports available";
    return { ...endpoint, state, message };
  }

  if (endpoint.key === "runs") {
    const runs = response as { runs?: Array<unknown> };
    const count = runs?.runs?.length ?? 0;
    const state: EndpointState = count > 0 ? "ok" : "warning";
    const message = count > 0 ? `${count} recorded runs` : "No simulation runs returned";
    return { ...endpoint, state, message };
  }

  return {
    ...endpoint,
    state: "warning",
    message: "Unhandled endpoint response",
  };
};

const loadEndpointStatuses = async (): Promise<EndpointStatus[]> => {
  const results = await Promise.allSettled(
    STATUS_ENDPOINTS.map(async (endpoint) => {
      const response = await fetcher(endpoint.path);
      return extractEndpointStatus(endpoint, response);
    }),
  );

  return results.map((result, index) => {
    const endpoint = STATUS_ENDPOINTS[index];
    if (result.status === "fulfilled") {
      return result.value;
    }

    const error = result.reason;
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ...endpoint,
      state: "error" as const,
      message,
    };
  });
};

const loadInitialSettings = (): LocalSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      autoRefresh: {
        enabled: parsed.autoRefresh?.enabled ?? DEFAULT_SETTINGS.autoRefresh.enabled,
        intervalSeconds: parsed.autoRefresh?.intervalSeconds ?? DEFAULT_SETTINGS.autoRefresh.intervalSeconds,
      },
    };
  } catch (error) {
    console.warn("Failed to read stored settings", error);
    return DEFAULT_SETTINGS;
  }
};

export default function SettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const refreshIntervalMs = useMemo(
    () => (settings.autoRefresh.enabled ? Math.max(settings.autoRefresh.intervalSeconds, 5) * 1000 : 0),
    [settings.autoRefresh.enabled, settings.autoRefresh.intervalSeconds],
  );

  useEffect(() => {
    const initial = loadInitialSettings();
    setSettings(initial);
  }, []);

  const persistSettings = (nextSettings: LocalSettings) => {
    setSettings(nextSettings);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    }
  };

  const handleAutoRefreshEnabledChange = (enabled: boolean) => {
    persistSettings({
      autoRefresh: {
        enabled,
        intervalSeconds: settings.autoRefresh.intervalSeconds,
      },
    });
  };

  const handleIntervalChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    const clamped = Math.min(Math.max(parsed, 5), 600);
    persistSettings({
      autoRefresh: {
        enabled: settings.autoRefresh.enabled,
        intervalSeconds: clamped,
      },
    });
  };

  const handleResetSettings = () => {
    persistSettings(DEFAULT_SETTINGS);
  };

  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const currentTheme = themeMounted ? theme ?? "system" : "system";

  const {
    data: statuses,
    error: statusError,
    isLoading: statusesLoading,
    mutate: mutateStatuses,
  } = useSWR(
    "lenxys.settings.endpoint-status",
    loadEndpointStatuses,
    {
      refreshInterval: refreshIntervalMs,
      revalidateOnFocus: false,
      onSuccess: () => setLastChecked(new Date()),
    },
  );

  const renderEndpointBadge = (state: EndpointState) => {
    if (state === "ok") {
      return (
        <Badge variant="success" className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          OK
        </Badge>
      );
    }
    if (state === "warning") {
      return (
        <Badge variant="warning" className="inline-flex items-center gap-1">
          <TriangleAlert className="h-3.5 w-3.5" />
          Check
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="inline-flex items-center gap-1">
        <TriangleAlert className="h-3.5 w-3.5" />
        Error
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferences are stored locally for now and will sync with backend settings in Phase 2.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Theme & Appearance</CardTitle>
            <CardDescription>Switch between light, dark, or system-based themes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["light", "dark", "system"].map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={currentTheme === option ? "default" : "outline"}
                  onClick={() => setTheme(option)}
                  disabled={!themeMounted}
                >
                  {option === "system" ? "System" : option === "dark" ? "Dark" : "Light"}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Theme preference persists in your browser via `next-themes`. The header toggle mirrors this selection.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-refresh</CardTitle>
            <CardDescription>Control how often dashboards poll the API for fresh data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Enable auto-refresh</p>
                <p className="text-xs text-muted-foreground">
                  Applies to overview widgets and report summaries in this session.
                </p>
              </div>
              <Checkbox
                checked={settings.autoRefresh.enabled}
                onCheckedChange={(value) => handleAutoRefreshEnabledChange(value === true)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="refresh-interval">Refresh interval (seconds)</Label>
              <Input
                id="refresh-interval"
                type="number"
                min={5}
                max={600}
                step={5}
                value={settings.autoRefresh.intervalSeconds}
                onChange={(event) => handleIntervalChange(event.target.value)}
                disabled={!settings.autoRefresh.enabled}
              />
              <p className="text-xs text-muted-foreground">Allowed range: 5s - 10m. Stored per browser.</p>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={handleResetSettings} type="button">
                Reset to defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>API Endpoint Status</CardTitle>
              <CardDescription>Live snapshot of key Phase 0 services queried directly from FastAPI.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {refreshIntervalMs > 0 ? (
                <Badge variant="secondary">{`Auto-refresh: ${Math.round(refreshIntervalMs / 1000)}s`}</Badge>
              ) : (
                <Badge variant="secondary">Manual refresh</Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void mutateStatuses();
                }}
              >
                Refresh now
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusesLoading && !statuses ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking endpoints&hellip;
              </div>
            ) : null}

            {statusError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                Failed to load endpoint statuses. {statusError instanceof Error ? statusError.message : "Unknown error"}
              </div>
            ) : null}

            {statuses?.length ? (
              <ul className="space-y-3">
                {statuses.map((endpoint) => (
                  <li
                    key={endpoint.key}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border bg-muted/30 p-4 transition-colors md:flex-row md:items-center md:justify-between",
                      endpoint.state === "error" && "border-destructive/60 bg-destructive/10",
                      endpoint.state === "ok" && "border-emerald-200/80 bg-emerald-100/10 dark:border-emerald-900/40",
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{endpoint.label}</p>
                      <p className="text-xs text-muted-foreground">{endpoint.message}</p>
                    </div>
                    {renderEndpointBadge(endpoint.state)}
                  </li>
                ))}
              </ul>
            ) : null}

            {lastChecked ? (
              <p className="text-xs text-muted-foreground">Last checked: {lastChecked.toLocaleString()}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


