"use client";

/**
 * Production Creative Browser — CreativeMetadata + forecast chip (Sprint 63).
 *
 * Reuses PlatformBadge, the Employees registry, and the Forecast Foundation
 * (forecast → buildForecastSummary) for a deterministic per-creative forecast.
 */

import { Layers, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/components/studio/media";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { forecast, buildForecastSummary, type ForecastInput } from "@/lib/ai/forecast";
import { forecastSeed, FORECAST_METRIC, FORECAST_HORIZON } from "@/components/studio/composer/composer-data";
import type { CreativeItem } from "./creative-data";

const TONE_CHIP: Record<"positive" | "neutral" | "negative", string> = {
  positive: "chip-emerald",
  neutral: "chip-slate",
  negative: "chip-red",
};

export function CreativeForecastChip({ budget }: { budget: number }) {
  const input: ForecastInput = {
    metric: FORECAST_METRIC,
    horizon: FORECAST_HORIZON,
    history: forecastSeed(budget),
  };
  const s = buildForecastSummary(forecast(input, "trend-projection"));
  return (
    <span className={cn("chip", TONE_CHIP[s.trend.tone])} title={`Forecast ${s.metricLabel} (${s.horizonLabel})`}>
      {s.endValueLabel} {s.changeLabel}
    </span>
  );
}

export function CreativeMetadata({ item, compact = false }: { item: CreativeItem; compact?: boolean }) {
  const OwnerIcon = EMPLOYEE_ICON[item.ownerId];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!compact && <PlatformBadge platform={item.platform} className="bg-white/[0.05]" />}
      <span className="inline-flex items-center gap-1 rounded-[var(--studio-radius-sm)] bg-white/[0.04] px-1.5 py-0.5 type-caption text-foreground-muted">
        <OwnerIcon className="h-3 w-3" />
        {employeeName(item.ownerId)}
      </span>
      <span className="inline-flex items-center gap-1 type-caption text-foreground-muted">
        <GitBranch className="h-3 w-3" /> v{item.version}
      </span>
      <span className="inline-flex items-center gap-1 type-caption text-foreground-muted">
        <Layers className="h-3 w-3" /> {item.variants}
      </span>
      <CreativeForecastChip budget={item.budget} />
    </div>
  );
}
