/**
 * Forecast formatting helpers (Sprint 62C).
 *
 * Pure, deterministic, locale-stable formatters. Metric-aware value formatting
 * (CTR as %, ROAS as ×, counts as integers, monetary/raw as separated numbers —
 * no currency symbol, since the series carries no currency). No I/O.
 */

import type { ForecastMetric, ForecastHorizon } from "../types";
import { horizonDays } from "../horizons";

/** Display labels for each forecast metric. */
export const METRIC_LABELS: Record<ForecastMetric, string> = {
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  conversions: "Conversions",
  roas: "ROAS",
  revenue: "Revenue",
  spend: "Spend",
  clicks: "Clicks",
  impressions: "Impressions",
};

/** Human label for a metric. */
export function metricLabel(metric: ForecastMetric): string {
  return METRIC_LABELS[metric];
}

/** Group integer part with thousands separators (locale-stable, en-US). */
function withThousands(n: number, dp: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Format a metric value for display (metric-aware). */
export function formatValue(metric: ForecastMetric, value: number): string {
  switch (metric) {
    case "ctr":
      return `${(value * 100).toFixed(2)}%`;
    case "roas":
      return `${value.toFixed(2)}x`;
    case "conversions":
    case "clicks":
    case "impressions":
      return withThousands(Math.round(value), 0);
    case "cpc":
    case "cpm":
    case "spend":
    case "revenue":
      return withThousands(value, 2);
  }
}

/** Format a fractional change with an explicit sign, e.g. "+18.0%" / "n/a". */
export function formatPercent(frac: number | null): string {
  if (frac === null || !Number.isFinite(frac)) return "n/a";
  const sign = frac > 0 ? "+" : "";
  return `${sign}${(frac * 100).toFixed(1)}%`;
}

/** "7 days" / "14 days" / … from the horizon. */
export function formatHorizon(horizon: ForecastHorizon): string {
  const d = horizonDays(horizon);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/** ISO date span "first → last" for a list of dated points. */
export function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "—";
  if (dates.length === 1) return dates[0];
  return `${dates[0]} → ${dates[dates.length - 1]}`;
}
