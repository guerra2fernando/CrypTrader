import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { Badge } from "@/components/ui/badge";
import { ForecastSparkline } from "@/components/ForecastSparkline";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ForecastModelBreakdown = {
  model_id: string;
  prediction?: number;
  weight?: number;
  rmse?: number;
};

export type ForecastRow = {
  symbol: string;
  horizon: string;
  timestamp: string;
  pred_return?: number;
  confidence?: number;
  models?: ForecastModelBreakdown[];
  error?: string;
};

type Props = {
  data: ForecastRow[];
  isLoading?: boolean;
  lastUpdated?: Date | null;
  history?: Record<string, number[]>;
};

export function ForecastTable({ data, isLoading, lastUpdated, history }: Props) {
  return (
    <Card className="border">
      <CardContent className="-mx-4 -mb-4 px-0 pb-0">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Predicted Return</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Models</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5}>
                <div className="animate-pulse py-6 text-sm text-muted-foreground">Loading forecasts…</div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-sm text-muted-foreground">
                No forecasts available for the selected horizon.
              </TableCell>
            </TableRow>
          )}

          {data.map((row) => {
            const pred = row.pred_return ?? null;
            const confidence = row.confidence ?? null;
            const timestamp = new Date(row.timestamp);
            const formattedTimestamp =
              Number.isNaN(timestamp.getTime()) === false
                ? timestamp.toLocaleString()
                : row.timestamp || "—";

            return (
              <TableRow key={`${row.symbol}-${row.timestamp}`} className={cn(row.error && "bg-destructive/10")}>
                <TableCell className="font-medium">{row.symbol}</TableCell>
                <TableCell>
                  {row.error ? (
                    <span className="text-sm text-destructive">{row.error}</span>
                  ) : pred !== null ? (
                    <span className={pred >= 0 ? "text-emerald-500" : "text-destructive"}>
                      {(pred * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ConfidenceIndicator value={confidence} />
                </TableCell>
                <TableCell>
                  <ForecastSparkline values={history?.[row.symbol] ?? []} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{formattedTimestamp}</span>
                </TableCell>
                <TableCell>
                  {row.models && row.models.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {row.models.map((model) => (
                        <Badge key={model.model_id} variant="outline">
                          <span className="font-medium">{model.model_id}</span>
                          {model.prediction !== undefined && (
                            <span className="ml-1 text-muted-foreground">
                              {(model.prediction * 100).toFixed(2)}%
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableCaption>
          {lastUpdated ? `Last refreshed ${lastUpdated.toLocaleTimeString()}` : "Forecasts refresh every 30s."}
        </TableCaption>
        </Table>
      </CardContent>
    </Card>
  );
}

