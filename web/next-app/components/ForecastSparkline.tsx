import { memo } from "react";

type Props = {
  values: number[];
  height?: number;
  width?: number;
};

function normalize(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min === 0) {
    return values.map(() => 0.5);
  }
  return values.map((value) => (value - min) / (max - min));
}

export const ForecastSparkline = memo(function ForecastSparkline({
  values,
  height = 36,
  width = 120,
}: Props) {
  if (!values.length) {
    return <div className="text-xs text-muted-foreground">—</div>;
  }

  const normalized = normalize(values);
  const step = width / Math.max(values.length - 1, 1);
  const points = normalized
    .map((value, index) => {
      const x = index * step;
      const y = (1 - value) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const latest = values[values.length - 1];
  const latestColor = latest >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="flex items-center gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="sparklineGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.8)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.4)" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="url(#sparklineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          points={points}
        />
      </svg>
      <span className="text-xs font-medium" style={{ color: latestColor }}>
        {(latest * 100).toFixed(2)}%
      </span>
    </div>
  );
});

