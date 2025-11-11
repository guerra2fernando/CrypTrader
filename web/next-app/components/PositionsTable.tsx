/* eslint-disable */
// @ts-nocheck
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMode } from "@/lib/mode-context";
import { formatNumber } from "@/lib/utils";

type Position = {
  symbol: string;
  side?: string;
  quantity: number;
  avg_entry_price?: number;
  mode?: string;
  realized_pnl?: number;
  unrealized_pnl?: number;
  updated_at?: string;
};

type PositionsTableProps = {
  positions: Position[];
  mode: string;
};

export function PositionsTable({ positions, mode }: PositionsTableProps) {
  const { isEasyMode } = useMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions — {mode.toUpperCase()}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {positions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              variant="trading"
              title={isEasyMode ? "No Open Positions" : "No Open Positions"}
              description={
                isEasyMode
                  ? `You don't have any open positions in ${mode} mode. Place a buy or sell order to open a position.`
                  : `No open positions in ${mode} mode.`
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Avg Price</TableHead>
                <TableHead>Unrealized PnL</TableHead>
                <TableHead>Realized PnL</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              positions.map((position) => (
                <TableRow key={`${position.symbol}-${position.mode ?? mode}`}>
                  <TableCell className="font-medium">{position.symbol}</TableCell>
                  <TableCell>{(position.side ?? "long").toUpperCase()}</TableCell>
                  <TableCell>{formatNumber(position.quantity, 4)}</TableCell>
                  <TableCell>${formatNumber(position.avg_entry_price ?? 0, 2)}</TableCell>
                  <TableCell className={position.unrealized_pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                    {formatPnL(position.unrealized_pnl)}
                  </TableCell>
                  <TableCell className={position.realized_pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                    {formatPnL(position.realized_pnl)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {position.updated_at ? new Date(position.updated_at).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function formatPnL(value?: number) {
  if (value === undefined || value === null) {
    return "—";
  }
  const formatted = formatNumber(value, 2);
  return `$${formatted}`;
}

