/**
 * Forecast badge + risk helpers (Sprint 62C).
 *
 * Pure, deterministic derivation of trend / confidence / risk view-models from a
 * ForecastSeries. Polarity-aware trend status mirrors the Trend Engine (CTR/ROAS
 * higher-is-better, CPC/CPM lower-is-better, spend neutral). No I/O.
 */

import type { ForecastMetric, ForecastSeries, ForecastConfidence } from "../types";
import type { TrendStatus } from "@/lib/ai/trend/trend-analysis";
import { formatPercent } from "./format";
import type {
  ForecastTrendBadge,
  ForecastConfidenceBadge,
  ForecastRiskBadge,
  ForecastDirection,
  ForecastTone,
} from "./types";

/** |Δ| below this fraction is treated as flat ("stable"). Mirrors Trend Engine. */
const STABLE_BAND = 0.05;

type Polarity = "higher_better" | "lower_better" | "neutral";

/** Metric polarity — mirrors the (module-private) Trend Engine polarity map. */
const POLARITY: Record<ForecastMetric, Polarity> = {
  ctr: "higher_better",
  cpc: "lower_better",
  cpm: "lower_better",
  conversions: "higher_better",
  roas: "higher_better",
  revenue: "higher_better",
  spend: "neutral",
  clicks: "higher_better",
  impressions: "higher_better",
};

/** The raw projected change (start→end) of a series, before polarity. */
function projectedChange(series: ForecastSeries): {
  changePct: number | null;
  direction: ForecastDirection;
} {
  const pts = series.points;
  if (pts.length < 2) return { changePct: null, direction: "flat" };
  const start = pts[0].value;
  const end = pts[pts.length - 1].value;
  if (start === 0) return { changePct: null, direction: end > 0 ? "up" : "flat" };
  const changePct = (end - start) / start;
  const direction: ForecastDirection =
    Math.abs(changePct) < STABLE_BAND ? "flat" : changePct > 0 ? "up" : "down";
  return { changePct, direction };
}

/** Map a raw direction + polarity to a polarity-aware TrendStatus. */
function statusFor(direction: ForecastDirection, polarity: Polarity): TrendStatus {
  if (direction === "flat" || polarity === "neutral") return "stable";
  const good =
    (direction === "up" && polarity === "higher_better") ||
    (direction === "down" && polarity === "lower_better");
  return good ? "improving" : "declining";
}

function trendTone(status: TrendStatus): ForecastTone {
  if (status === "improving") return "positive";
  if (status === "declining") return "negative";
  return "neutral";
}

function trendLabel(status: TrendStatus): string {
  switch (status) {
    case "improving":
      return "Improving";
    case "declining":
      return "Declining";
    case "stable":
      return "Stable";
    case "insufficient_data":
      return "Insufficient data";
  }
}

/** Build the trend badge from a forecast series. */
export function trendBadge(series: ForecastSeries): ForecastTrendBadge {
  if (series.points.length === 0) {
    return {
      status: "insufficient_data",
      direction: "flat",
      changePct: null,
      changeLabel: "n/a",
      tone: "neutral",
      label: trendLabel("insufficient_data"),
    };
  }
  const { changePct, direction } = projectedChange(series);
  const status =
    changePct === null && direction === "flat"
      ? "insufficient_data"
      : statusFor(direction, POLARITY[series.metric]);
  return {
    status,
    direction,
    changePct,
    changeLabel: formatPercent(changePct),
    tone: trendTone(status),
    label: trendLabel(status),
  };
}

/** Build the confidence badge from forecast confidence. */
export function confidenceBadge(
  confidence: ForecastConfidence
): ForecastConfidenceBadge {
  const tone: ForecastTone =
    confidence.level === "high"
      ? "positive"
      : confidence.level === "low"
        ? "negative"
        : "neutral";
  return { level: confidence.level, tone, label: `${confidence.level} confidence` };
}

/**
 * Derive a risk badge from the polarity-aware trend + confidence. A projected
 * decline with weak confidence is the highest risk; an improving/stable outlook
 * with strong confidence is the lowest. Deterministic.
 */
export function riskLevel(series: ForecastSeries): ForecastRiskBadge {
  if (series.points.length === 0) {
    return { level: "medium", tone: "neutral", label: "Unknown risk" };
  }
  const status = trendBadge(series).status;
  const conf = series.confidence.level;
  const declining = status === "declining";

  let level: ForecastRiskBadge["level"];
  if (declining && conf === "low") level = "critical";
  else if (declining && conf === "medium") level = "high";
  else if (declining) level = "medium";
  else if (conf === "low") level = "medium";
  else level = "low";

  const tone: ForecastTone =
    level === "critical" || level === "high"
      ? "negative"
      : level === "medium"
        ? "neutral"
        : "positive";
  return { level, tone, label: `${level} risk` };
}
