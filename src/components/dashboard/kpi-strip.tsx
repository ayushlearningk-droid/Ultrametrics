/**
 * Morning Brief — KPI Strip (Sprint 4 Phase B).
 *
 * Presentational row of headline KPIs with optional trend arrows (from the
 * AI-013A trend engine). Dark cinematic surface, emerald accent; status colours
 * for the trend (improving=emerald, declining=red, stable=slate). No hooks.
 */

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BriefKpi } from "@/lib/ai/brief/compose-brief";

// Strict 3-colour status scale: emerald = positive, muted red = negative,
// slate = neutral. (--danger is the muted red; brand is the emerald accent.)
const STATUS_STYLE: Record<string, string> = {
  improving: "text-brand",
  declining: "text-red-400/80",
  stable: "text-slate-300",
};

export function KpiStrip({ kpis }: { kpis: BriefKpi[] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4">
      {kpis.map((k, i) => {
        const up = k.changeLabel?.startsWith("+");
        const Arrow =
          k.changeLabel === "+0%" || k.changeLabel === "0%"
            ? Minus
            : up
              ? TrendingUp
              : TrendingDown;
        const statusColor = k.status ? STATUS_STYLE[k.status] : undefined;
        return (
          <div
            key={i}
            className="card flex h-full flex-col justify-between gap-2 px-4 py-3"
          >
            <div className="truncate type-eyebrow text-foreground-muted">
              {k.label}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="type-body font-semibold tabular-nums text-foreground">
                {k.value}
              </span>
              {k.changeLabel && (
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-0.5 type-caption font-semibold tabular-nums",
                    statusColor ?? "text-foreground-muted"
                  )}
                >
                  <Arrow className="h-3 w-3" />
                  {k.changeLabel}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
