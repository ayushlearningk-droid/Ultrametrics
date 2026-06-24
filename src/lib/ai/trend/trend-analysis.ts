/**
 * Ask Ultrametrics — account-level trend context (AI-013A).
 *
 * Pure comparison of a provider's CURRENT-window account totals against the
 * PREVIOUS equal-length window. Produces per-metric trend (CTR / CPC / CPM /
 * conversions) with an Improving / Stable / Declining status. No I/O, no model
 * calls; the caller supplies both windows' already-derived totals.
 *
 * Scope (AI-013A): account-level only, fixed 30-day lookback, NO per-opportunity
 * / campaign matching, NO engagement trend, NO configurable lookback.
 *
 * Polarity matters: CTR and conversions are higher-is-better; CPC and CPM are
 * lower-is-better — status is derived from polarity, never the raw sign. Trend is
 * suppressed ("insufficient_data") when a window is below volume floors or the
 * two windows aren't comparable (e.g. a lifetime-fallback window), so noise and
 * apples-to-oranges comparisons never surface a misleading arrow.
 */

import type { MetricTotals } from "@/lib/metrics/types";
import { MIN_IMPRESSIONS, MIN_CLICKS, MIN_SPEND } from "@/lib/ai/thresholds";

export type TrendMetric =
  | "ctr"
  | "cpc"
  | "cpm"
  | "conversions"
  // Sprint 12 Phase A: headline ratio + raw drivers for change decomposition.
  // roas is a headline ratio; revenue/spend/clicks/impressions are the raw
  // inputs the Change Intelligence Engine decomposes a ratio change into.
  | "roas"
  | "revenue"
  | "spend"
  | "clicks"
  | "impressions";

export type TrendStatus =
  | "improving"
  | "stable"
  | "declining"
  | "insufficient_data";

type Polarity = "higher_better" | "lower_better" | "neutral";

export interface MetricTrend {
  metric: TrendMetric;
  current: number;
  previous: number;
  /** Fractional change vs previous (0.18 = +18%); null when not computable. */
  changePct: number | null;
  /** Pre-formatted relay label, e.g. "+18%" / "-12%" / "n/a". */
  changeLabel: string;
  status: TrendStatus;
  /** e.g. "vs previous 30 days". */
  basis: string;
}

export interface TrendContext {
  lookbackDays: number;
  /** False when the two windows can't be compared (then `metrics` is empty). */
  comparable: boolean;
  metrics: MetricTrend[];
}

/** |Δ| below this fraction is treated as flat ("stable"). */
const STABLE_BAND = 0.05;

const POLARITY: Record<TrendMetric, Polarity> = {
  ctr: "higher_better",
  cpc: "lower_better",
  cpm: "lower_better",
  conversions: "higher_better",
  roas: "higher_better",
  revenue: "higher_better",
  clicks: "higher_better",
  impressions: "higher_better",
  // spend carries no good/bad polarity on its own — a rise or fall is neither
  // "improving" nor "declining" without context. It exists here as a decomposition
  // driver; its magnitude lives in changePct, and statusFor returns a neutral
  // "stable" so spend is never surfaced as a misleading trend arrow.
  spend: "neutral",
};

function valueOf(metric: TrendMetric, t: MetricTotals): number {
  switch (metric) {
    case "ctr":
      return t.ctr;
    case "cpc":
      return t.cpc;
    case "cpm":
      return t.cpm;
    case "conversions":
      return t.conversions;
    case "roas":
      return t.roas;
    case "revenue":
      return t.revenue;
    case "spend":
      return t.spend;
    case "clicks":
      return t.clicks;
    case "impressions":
      return t.impressions;
  }
}

/**
 * Whether BOTH windows clear the volume floor for a metric's denominator, so the
 * comparison is trustworthy. CTR/CPM rest on impressions; CPC on clicks;
 * conversions just needs a non-zero previous to form a ratio.
 */
function hasVolume(
  metric: TrendMetric,
  cur: MetricTotals,
  prev: MetricTotals
): boolean {
  switch (metric) {
    case "ctr":
    case "cpm":
      return (
        cur.impressions >= MIN_IMPRESSIONS && prev.impressions >= MIN_IMPRESSIONS
      );
    case "cpc":
    case "clicks":
      return cur.clicks >= MIN_CLICKS && prev.clicks >= MIN_CLICKS;
    case "conversions":
      return prev.conversions > 0;
    case "roas":
    case "spend":
      // Ratio rests on spend; raw spend needs a non-zero previous to form a ratio.
      return cur.spend >= MIN_SPEND && prev.spend >= MIN_SPEND;
    case "revenue":
      return prev.revenue > 0;
    case "impressions":
      return (
        cur.impressions >= MIN_IMPRESSIONS && prev.impressions >= MIN_IMPRESSIONS
      );
  }
}

function statusFor(metric: TrendMetric, changePct: number): TrendStatus {
  if (Math.abs(changePct) < STABLE_BAND) return "stable";
  const polarity = POLARITY[metric];
  // Neutral metrics (spend) carry no good/bad direction — never assert an arrow.
  if (polarity === "neutral") return "stable";
  const up = changePct > 0;
  const improving = polarity === "higher_better" ? up : !up;
  return improving ? "improving" : "declining";
}

function formatChange(changePct: number | null): string {
  if (changePct === null) return "n/a";
  const pct = Math.round(Math.abs(changePct) * 100);
  return `${changePct >= 0 ? "+" : "-"}${pct}%`;
}

/** Compute one metric's trend between two windows. */
function computeMetricTrend(
  metric: TrendMetric,
  cur: MetricTotals,
  prev: MetricTotals,
  lookbackDays: number
): MetricTrend {
  const current = valueOf(metric, cur);
  const previous = valueOf(metric, prev);
  const basis = `vs previous ${lookbackDays} days`;

  if (!hasVolume(metric, cur, prev) || previous === 0) {
    return {
      metric,
      current,
      previous,
      changePct: null,
      changeLabel: "n/a",
      status: "insufficient_data",
      basis,
    };
  }

  const changePct = (current - previous) / previous;
  return {
    metric,
    current,
    previous,
    changePct,
    changeLabel: formatChange(changePct),
    status: statusFor(metric, changePct),
    basis,
  };
}

export interface AnalyzeTrendOptions {
  lookbackDays: number;
  /** Both windows comparable (status ok + same range mode). False → no metrics. */
  comparable: boolean;
  /** Which metrics the provider supports (capability-gated by the caller). */
  metrics: TrendMetric[];
}

/**
 * Build the account-level TrendContext. Returns an empty (non-comparable) context
 * when the windows can't be compared or either total is missing — never a
 * fabricated trend.
 */
export function analyzeAccountTrend(
  current: MetricTotals | null,
  previous: MetricTotals | null,
  opts: AnalyzeTrendOptions
): TrendContext {
  if (!opts.comparable || !current || !previous) {
    return { lookbackDays: opts.lookbackDays, comparable: false, metrics: [] };
  }
  return {
    lookbackDays: opts.lookbackDays,
    comparable: true,
    metrics: opts.metrics.map((m) =>
      computeMetricTrend(m, current, previous, opts.lookbackDays)
    ),
  };
}
