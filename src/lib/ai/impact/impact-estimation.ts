/**
 * Ask Ultrametrics — Impact Estimation engine (AI-014A.2).
 *
 * Converts an engine-exposed `RecEffect` (AI-014A.1) into a bounded, read-only
 * "potential impact" estimate. Pure arithmetic over already-computed gap inputs —
 * no I/O, no model calls, and NO forecasting: every estimate is the effect of
 * CLOSING AN OBSERVED GAP to the benchmark (or redeploying recoverable spend),
 * expressed as a [low, high] RANGE with explicit assumptions.
 *
 * Hard contract (requirements 6 & 7):
 *  - Never a single point — always a range bounded by a gap-closure fraction.
 *  - Never a guarantee/forecast — vocabulary is "potential / could / estimated".
 *  - Below volume floors or with no positive gap → "insufficient_data", no numbers.
 *
 * Does NOT serialize, surface, or touch scoring/ranking — A.2 builds the engine
 * only; wiring (A.3) and UI are later phases.
 */

import type { RecEffect } from "@/lib/ai/recommendations";
import type { EvidenceLevel } from "@/lib/ai/intelligence/evidence-strength";
import { MIN_IMPRESSIONS, MIN_CLICKS, MIN_SPEND } from "@/lib/ai/thresholds";

/* ── Output types ─────────────────────────────────────────────────────────── */

/** What the metric does if the action is taken. */
export type ImpactDirection = "increase" | "decrease" | "recover";

/** One bounded impact range (e.g. "+4% to +8% clicks"). */
export interface ImpactRange {
  /** The affected metric label, e.g. "clicks" | "cost" | "engagements" | "spend". */
  metric: string;
  direction: ImpactDirection;
  /** Lower bound, whole-number percent (e.g. 4 = 4%). */
  lowPct: number;
  /** Upper bound, whole-number percent. */
  highPct: number;
  /** Human description of what the range represents. */
  basis: string;
}

export interface ImpactEstimate {
  status: "ok" | "insufficient_data";
  ranges: ImpactRange[];
  /** Plain-language caveats; always present (read-only, not-guaranteed framing). */
  assumptions: string[];
  /** Evidence tier carried from the recommendation (caller-supplied). */
  evidence: EvidenceLevel;
}

/* ── Bounds ───────────────────────────────────────────────────────────────── */

/** Gap-closure fractions → the low/high bounds. You rarely fully close a gap. */
const CLOSURE_LOW = 0.5;
const CLOSURE_HIGH = 1.0;

/** Universal caveat appended to every estimate. */
const GLOBAL_CAVEAT =
  "Estimates are directional ranges from closing the observed gap to your benchmark — potential outcomes, not forecasts or guarantees.";

function pct(ratio: number, closure: number): number {
  return Math.round(closure * ratio * 100);
}

/** Build a [low, high] range from a positive ratio (Δ relative to a base). */
function rangeFor(
  metric: string,
  direction: ImpactDirection,
  ratio: number,
  basis: string
): ImpactRange {
  return {
    metric,
    direction,
    lowPct: pct(ratio, CLOSURE_LOW),
    highPct: pct(ratio, CLOSURE_HIGH),
    basis,
  };
}

function insufficient(evidence: EvidenceLevel): ImpactEstimate {
  return {
    status: "insufficient_data",
    ranges: [],
    assumptions: [
      "Not enough volume, or no positive gap to the benchmark, to estimate impact.",
    ],
    evidence,
  };
}

function ok(
  ranges: ImpactRange[],
  assumptions: string[],
  evidence: EvidenceLevel
): ImpactEstimate {
  return {
    status: "ok",
    ranges,
    assumptions: [...assumptions, GLOBAL_CAVEAT],
    evidence,
  };
}

/* ── Engine ───────────────────────────────────────────────────────────────── */

/**
 * Estimate the potential impact of acting on a recommendation, from its
 * engine-exposed effect. `evidence` is the recommendation's evidence tier
 * (AI-010A), passed through to the estimate.
 */
export function estimateImpact(
  effect: RecEffect,
  evidence: EvidenceLevel
): ImpactEstimate {
  switch (effect.metric) {
    case "ctr": {
      // Incremental clicks if CTR rises toward the benchmark (impressions held).
      const gap = effect.benchmark - effect.current;
      if (
        effect.impressions < MIN_IMPRESSIONS ||
        effect.clicks <= 0 ||
        gap <= 0
      ) {
        return insufficient(evidence);
      }
      const deltaClicks = effect.impressions * gap;
      const ratio = deltaClicks / effect.clicks;
      return ok(
        [
          rangeFor(
            "clicks",
            "increase",
            ratio,
            "Additional clicks if CTR reaches the benchmark"
          ),
        ],
        ["Assumes CTR rises toward the account benchmark with impressions held constant."],
        evidence
      );
    }

    case "cpc": {
      // Cost saved if CPC falls toward the benchmark (click volume held).
      const excess = effect.current - effect.benchmark;
      if (effect.clicks < MIN_CLICKS || effect.spend <= 0 || excess <= 0) {
        return insufficient(evidence);
      }
      const saved = effect.clicks * excess;
      const ratio = saved / effect.spend;
      return ok(
        [
          rangeFor(
            "cost",
            "decrease",
            ratio,
            "Spend saved if CPC reaches the benchmark"
          ),
        ],
        ["Assumes CPC falls toward the benchmark at constant click volume."],
        evidence
      );
    }

    case "engagement_rate": {
      // Incremental engagements if the rate rises toward the benchmark.
      const gap = effect.benchmark - effect.current;
      if (
        effect.impressions < MIN_IMPRESSIONS ||
        effect.engagements <= 0 ||
        gap <= 0
      ) {
        return insufficient(evidence);
      }
      const deltaEng = effect.impressions * gap;
      const ratio = deltaEng / effect.engagements;
      return ok(
        [
          rangeFor(
            "engagements",
            "increase",
            ratio,
            "Additional engagements if the rate reaches the benchmark"
          ),
        ],
        [
          "Assumes engagement rate rises toward the benchmark with impressions held constant.",
        ],
        evidence
      );
    }

    case "cpe": {
      // Cost saved if cost-per-engagement falls toward the benchmark.
      const excess = effect.current - effect.benchmark;
      if (effect.engagements <= 0 || effect.spend <= 0 || excess <= 0) {
        return insufficient(evidence);
      }
      const saved = effect.engagements * excess;
      const ratio = saved / effect.spend;
      return ok(
        [
          rangeFor(
            "cost",
            "decrease",
            ratio,
            "Spend saved if CPE reaches the benchmark"
          ),
        ],
        ["Assumes CPE falls toward the benchmark at constant engagement volume."],
        evidence
      );
    }

    case "recoverable_spend": {
      // Spend that could be redeployed (range = the closure band of the fraction).
      if (effect.spend < MIN_SPEND || effect.fraction <= 0) {
        return insufficient(evidence);
      }
      return ok(
        [
          rangeFor(
            "spend",
            "recover",
            effect.fraction,
            "Share of this spend that could be redeployed"
          ),
        ],
        [
          "Reallocatable spend; the actual outcome depends on where the budget is moved.",
        ],
        evidence
      );
    }
  }
}
