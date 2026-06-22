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

const STATUS_STYLE: Record<string, string> = {
  improving: "text-emerald-300",
  declining: "text-red-300",
  stable: "text-slate-300",
};

export function KpiStrip({ kpis }: { kpis: BriefKpi[] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              {k.label}
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[18px] font-semibold tabular-nums text-foreground">
                {k.value}
              </span>
              {k.changeLabel && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
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
