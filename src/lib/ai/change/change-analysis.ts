/**
 * Ask Ultrametrics — Change Intelligence Engine (Sprint 12, Phase A).
 *
 * Grounded, arithmetic-only decomposition of WHY a headline metric changed
 * between two equal-length windows. Pure functions, no I/O, no model calls, no
 * heuristic "reasoning" — every number comes from the two real windows and the
 * attribution is an EXACT log-ratio identity, not an estimate.
 *
 * For a ratio R = N / D, the relative change decomposes additively and exactly:
 *
 *     ln(R_cur / R_prev) = ln(N_cur / N_prev) − ln(D_cur / D_prev)
 *                          └ numerator term ┘   └ denominator term ┘
 *
 * The two terms PROVABLY sum to the whole change, so the "primary driver" is
 * simply the larger-magnitude term — never invented. When neither term clearly
 * dominates, attribution is reported as "mixed" (both drivers cited, no single
 * cause). For the raw `conversions` count we decompose multiplicatively into
 * clicks × conversion_rate via the same log identity.
 *
 * Grounding guarantees:
 *  - insufficient_data (no numbers, no cause) when: windows aren't comparable,
 *    a window is below the volume floor, or any input ≤ 0 (logs/ratios undefined).
 *  - never a forecast, counterfactual, or single-window inference.
 *
 * Reuses trend-analysis.ts (analyzeAccountTrend) for the headline metric's
 * delta + volume gating; this module adds only the decomposition + confidence.
 */

import type { MetricTotals } from "@/lib/metrics/types";
import { MIN_IMPRESSIONS, MIN_CLICKS, MIN_SPEND } from "@/lib/ai/thresholds";
import {
  analyzeAccountTrend,
  type TrendMetric,
} from "@/lib/ai/trend/trend-analysis";

/* ── Public types ─────────────────────────────────────────────────────────── */

/** Headline metrics the engine can explain a change for. */
export type ChangeMetric = "roas" | "ctr" | "cpc" | "conversions";

export type ChangeStatus = "ok" | "insufficient_data";

export type ChangeConfidence = "high" | "medium" | "low";

export type ChangeDirection = "up" | "down" | "flat";

/** Whether one driver dominates the change, or it is split. */
export type Attribution = "primary" | "mixed";

/** One decomposition driver with its own grounded delta + contribution share. */
export interface ChangeDriver {
  /** "revenue" | "spend" | "clicks" | "impressions" | "conversion_rate". */
  name: string;
  current: number;
  previous: number;
  /** Fractional change vs previous (0.18 = +18%); null when not computable. */
  changePct: number | null;
  /** Share of the total |log change| attributable to this driver (0..1). */
  contributionShare: number;
}

export interface ChangeExplanation {
  status: ChangeStatus;
  metric: ChangeMetric;
  /** Present only when status === "ok". */
  direction?: ChangeDirection;
  current?: number;
  previous?: number;
  changePct?: number;
  /** Pre-formatted relay label, e.g. "+18%" / "-12%". */
  changeLabel?: string;
  /** Ordered (largest contribution first); present when status === "ok". */
  drivers?: ChangeDriver[];
  /** Driver name when one dominates; absent when "mixed". */
  primaryDriver?: string;
  attribution?: Attribution;
  confidence?: ChangeConfidence;
  /** e.g. "vs previous 7 days". */
  basis?: string;
  /** Plain-language, non-fabricated caveats (e.g. purchase-attribution lag). */
  caveats?: string[];
  /** Why no explanation was produced; present only on insufficient_data. */
  reason?: string;
}

/* ── Tuning constants ─────────────────────────────────────────────────────── */

/** |Δ| below this fraction = the metric barely moved (flat → low confidence). */
const STABLE_BAND = 0.05;

/** A driver's contribution share at/above this dominates → "primary". */
const DOMINANCE_SHARE = 0.6;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatChange(changePct: number): string {
  const pct = Math.round(Math.abs(changePct) * 100);
  return `${changePct >= 0 ? "+" : "-"}${pct}%`;
}

function pctChange(cur: number, prev: number): number {
  return (cur - prev) / prev;
}

function insufficient(metric: ChangeMetric, reason: string): ChangeExplanation {
  return { status: "insufficient_data", metric, reason };
}

/** Numerator/denominator field names for each ratio metric (for decomposition). */
interface RatioSpec {
  numerator: keyof MetricTotals;
  denominator: keyof MetricTotals;
}

const RATIO_SPEC: Record<"roas" | "ctr" | "cpc", RatioSpec> = {
  roas: { numerator: "revenue", denominator: "spend" },
  ctr: { numerator: "clicks", denominator: "impressions" },
  cpc: { numerator: "spend", denominator: "clicks" },
};

/** Confidence from the metric's volume basis (mirrors the trend volume floors). */
function confidenceFor(
  metric: ChangeMetric,
  cur: MetricTotals,
  prev: MetricTotals,
  changePct: number
): ChangeConfidence {
  // A barely-moved metric is noise-level — attribution is unstable.
  if (Math.abs(changePct) < STABLE_BAND) return "low";

  let basis: number;
  let floor: number;
  switch (metric) {
    case "ctr":
      basis = Math.min(cur.impressions, prev.impressions);
      floor = MIN_IMPRESSIONS;
      break;
    case "cpc":
    case "conversions":
      basis = Math.min(cur.clicks, prev.clicks);
      floor = MIN_CLICKS;
      break;
    case "roas":
      basis = Math.min(cur.spend, prev.spend);
      floor = MIN_SPEND;
      break;
  }
  // Below floor is already gated to insufficient_data upstream; here ≥2× floor
  // is "high" (well-powered), ≥1× is "medium".
  return basis >= 2 * floor ? "high" : "medium";
}

function directionOf(changePct: number): ChangeDirection {
  if (Math.abs(changePct) < STABLE_BAND) return "flat";
  return changePct > 0 ? "up" : "down";
}

/**
 * Build the ordered drivers + attribution from two signed log terms. The terms
 * already sum to ln(R_cur/R_prev); shares are |term| / Σ|term|.
 */
function attribute(
  driverDefs: Array<{ name: string; cur: number; prev: number; term: number }>
): { drivers: ChangeDriver[]; primaryDriver?: string; attribution: Attribution } {
  const totalAbs = driverDefs.reduce((acc, d) => acc + Math.abs(d.term), 0);
  const drivers: ChangeDriver[] = driverDefs
    .map((d) => ({
      name: d.name,
      current: d.cur,
      previous: d.prev,
      changePct: d.prev !== 0 ? pctChange(d.cur, d.prev) : null,
      contributionShare: totalAbs > 0 ? Math.abs(d.term) / totalAbs : 0,
    }))
    .sort((a, b) => b.contributionShare - a.contributionShare);

  const top = drivers[0];
  if (top && top.contributionShare >= DOMINANCE_SHARE) {
    return { drivers, primaryDriver: top.name, attribution: "primary" };
  }
  return { drivers, attribution: "mixed" };
}

/* ── Engine ───────────────────────────────────────────────────────────────── */

/**
 * Decompose the change in `metric` between `prev` and `cur`. Returns a fully
 * grounded ChangeExplanation, or insufficient_data (with a reason and no
 * numbers) when the comparison can't be trusted. `comparable` must reflect that
 * both windows are equal-length, "ok", and the same window mode (the caller's
 * gate — same contract as analyzeAccountTrend).
 */
export function explainChange(
  cur: MetricTotals | null,
  prev: MetricTotals | null,
  metric: ChangeMetric,
  opts: { comparable: boolean; lookbackDays: number }
): ChangeExplanation {
  if (!opts.comparable || !cur || !prev) {
    return insufficient(metric, "Windows are not comparable.");
  }

  // Reuse the trend engine for the headline delta + volume gating (incl. roas).
  const trend = analyzeAccountTrend(cur, prev, {
    comparable: true,
    lookbackDays: opts.lookbackDays,
    metrics: [metric as TrendMetric],
  });
  const headline = trend.metrics[0];
  if (!headline || headline.status === "insufficient_data" || headline.changePct === null) {
    return insufficient(
      metric,
      "Not enough volume in one or both windows to attribute the change."
    );
  }

  const changePct = headline.changePct;
  const basis = `vs previous ${opts.lookbackDays} days`;
  const caveats: string[] = [];
  if (metric === "roas" || metric === "conversions") {
    caveats.push(
      "Purchases/revenue are attribution-windowed and can lag, so a recent change may partly reflect attribution maturation rather than performance."
    );
  }

  let decomposed: {
    drivers: ChangeDriver[];
    primaryDriver?: string;
    attribution: Attribution;
  };

  if (metric === "conversions") {
    // conversions = clicks × conversion_rate (conversion_rate = conversions/clicks).
    // ln(conv↗) = ln(clicks↗) + ln(cr↗) — both terms ADD.
    if (cur.clicks <= 0 || prev.clicks <= 0 || cur.conversions <= 0 || prev.conversions <= 0) {
      return insufficient(
        metric,
        "Clicks or conversions are zero in a window, so the change can't be decomposed."
      );
    }
    const crCur = cur.conversions / cur.clicks;
    const crPrev = prev.conversions / prev.clicks;
    const clicksTerm = Math.log(cur.clicks / prev.clicks);
    const crTerm = Math.log(crCur / crPrev);
    decomposed = attribute([
      { name: "clicks", cur: cur.clicks, prev: prev.clicks, term: clicksTerm },
      { name: "conversion_rate", cur: crCur, prev: crPrev, term: crTerm },
    ]);
  } else {
    // Ratio metric: ln(R↗) = ln(N↗) − ln(D↗).
    const spec = RATIO_SPEC[metric];
    const nCur = cur[spec.numerator] as number;
    const nPrev = prev[spec.numerator] as number;
    const dCur = cur[spec.denominator] as number;
    const dPrev = prev[spec.denominator] as number;
    if (nCur <= 0 || nPrev <= 0 || dCur <= 0 || dPrev <= 0) {
      return insufficient(
        metric,
        "An input is zero in a window, so the ratio change can't be decomposed."
      );
    }
    const numTerm = Math.log(nCur / nPrev);
    const denTerm = -Math.log(dCur / dPrev); // denominator rise pushes the ratio down
    decomposed = attribute([
      { name: String(spec.numerator), cur: nCur, prev: nPrev, term: numTerm },
      { name: String(spec.denominator), cur: dCur, prev: dPrev, term: denTerm },
    ]);
  }

  return {
    status: "ok",
    metric,
    direction: directionOf(changePct),
    current: headline.current,
    previous: headline.previous,
    changePct,
    changeLabel: formatChange(changePct),
    drivers: decomposed.drivers,
    ...(decomposed.primaryDriver ? { primaryDriver: decomposed.primaryDriver } : {}),
    attribution: decomposed.attribution,
    confidence: confidenceFor(metric, cur, prev, changePct),
    basis,
    ...(caveats.length > 0 ? { caveats } : {}),
  };
}
