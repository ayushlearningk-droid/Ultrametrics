"use client";

/**
 * Production Asset Inspector — InspectorForecast (Sprint 63).
 * Reuses the Forecast Foundation (forecast → buildForecastSummary).
 */

import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { forecast, buildForecastSummary, type ForecastInput } from "@/lib/ai/forecast";
import { forecastSeed, FORECAST_METRIC, FORECAST_HORIZON } from "@/components/studio/composer/composer-data";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection, InspectorRow } from "./inspector-section";

const TONE_CHIP: Record<"positive" | "neutral" | "negative", string> = {
  positive: "chip-emerald",
  neutral: "chip-slate",
  negative: "chip-red",
};

export function InspectorForecast({ item }: { item: CreativeItem }) {
  const input: ForecastInput = { metric: FORECAST_METRIC, horizon: FORECAST_HORIZON, history: forecastSeed(item.budget) };
  const s = buildForecastSummary(forecast(input, "trend-projection"));
  return (
    <InspectorSection icon={<TrendingUp className="h-3.5 w-3.5 text-brand" />} title="Forecast summary">
      <div className="flex items-end gap-2">
        <span className="type-display text-2xl tabular-nums text-foreground">{s.endValueLabel}</span>
        <span className="mb-1 type-caption text-foreground-muted">{s.metricLabel} ({s.horizonLabel})</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("chip", TONE_CHIP[s.trend.tone])}>{s.trend.label} {s.changeLabel}</span>
        <span className={cn("chip", TONE_CHIP[s.confidence.tone])}>{s.confidence.label}</span>
        <span className={cn("chip", TONE_CHIP[s.risk.tone])}>{s.risk.label}</span>
      </div>
      <InspectorRow label="Window" value={s.dateRange} />
      <p className="type-caption text-foreground-muted">{s.basis}</p>
    </InspectorSection>
  );
}
