import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricItem {
  label: string;
  value: string;
  trend?: number | null;
  mono?: boolean;
}

interface ConnectorMetricsStripProps {
  metrics: MetricItem[];
  loading?: boolean;
}

function TrendBadge({ trend }: { trend: number }) {
  const abs = Math.abs(trend);
  if (abs < 0.5) {
    return (
      <span className="mt-2 flex items-center gap-1 text-[11px] text-white/25">
        <Minus className="h-3 w-3" />
        Flat
      </span>
    );
  }
  const up = trend > 0;
  return (
    <span
      className={cn(
        "mt-2 flex items-center gap-1 font-mono text-[11px] font-medium",
        up ? "text-emerald-400/75" : "text-red-400/70"
      )}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : "−"}
      {abs.toFixed(1)}%
    </span>
  );
}

export function ConnectorMetricsStrip({
  metrics,
  loading,
}: ConnectorMetricsStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-6 px-6 py-6 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2.5">
            <div
              className="h-2.5 w-16 animate-pulse rounded bg-white/[0.06]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
            <div
              className="h-9 w-28 animate-pulse rounded-md bg-white/[0.08]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
            <div
              className="h-2.5 w-12 animate-pulse rounded bg-white/[0.04]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 px-6 py-6 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
            {m.label}
          </p>
          <p
            className={cn(
              "mt-2 text-[28px] font-semibold leading-none tracking-tight text-foreground/90 lg:text-[32px]",
              m.mono !== false && "font-mono tabular-nums"
            )}
          >
            {m.value}
          </p>
          {m.trend != null ? (
            <TrendBadge trend={m.trend} />
          ) : (
            <span className="mt-2 block h-[18px]" />
          )}
        </div>
      ))}
    </div>
  );
}
