/**
 * AI-010A — Opportunity Breakdown (#1).
 *
 * Pure re-expression of a recommendation's already-computed score breakdown
 * (AI-010 Phase 1) into per-factor CONTRIBUTIONS: weightᵢ · clamp01(valueᵢ).
 * The weights are READ (never modified) from the frozen scoring presets,
 * selected by the breakdown's ceiling (100 → conversion profile, 85 → objective
 * profile). No new scoring: Σ contributions === composite, and
 * round(ceiling · confidenceWeight · composite) reconstructs the existing
 * opportunityScore. The displayed score is never recomputed from contributions.
 *
 * Additive, pure, no I/O.
 */

import {
  CONVERSION_SCORING,
  OBJECTIVE_SCORING,
  type OpportunityBreakdown,
  type ScoreWeights,
} from "@/lib/ai/scoring/opportunity-score";

/** A single factor's share of the composite: weight · value. */
export interface FactorContribution {
  /** Raw factor key as stored on OpportunityFactors. */
  name: "revenueImpact" | "spendShare" | "severity";
  /** Human-readable label for relay. */
  label: string;
  /** The clamped 0..1 factor value (as scored). */
  value: number;
  /** The profile weight applied to this factor. */
  weight: number;
  /** weight · value — this factor's additive share of the composite. */
  contribution: number;
}

/** OpportunityBreakdown extended with its per-factor contributions. */
export interface OpportunityBreakdownDetailed extends OpportunityBreakdown {
  contributions: FactorContribution[];
}

const FACTOR_LABELS: Record<FactorContribution["name"], string> = {
  revenueImpact: "revenue impact",
  spendShare: "budget exposure",
  severity: "issue severity",
};

/** Select the (read-only) profile weights for a breakdown by its ceiling. */
function weightsFor(ceiling: number): ScoreWeights {
  return ceiling === OBJECTIVE_SCORING.ceiling
    ? OBJECTIVE_SCORING.weights
    : CONVERSION_SCORING.weights;
}

/** Compute the three per-factor contributions for a score breakdown. */
export function contributions(b: OpportunityBreakdown): FactorContribution[] {
  const w = weightsFor(b.ceiling);
  const f = b.factors;
  return [
    {
      name: "revenueImpact",
      label: FACTOR_LABELS.revenueImpact,
      value: f.revenueImpact,
      weight: w.revenue,
      contribution: w.revenue * f.revenueImpact,
    },
    {
      name: "spendShare",
      label: FACTOR_LABELS.spendShare,
      value: f.spendShare,
      weight: w.spend,
      contribution: w.spend * f.spendShare,
    },
    {
      name: "severity",
      label: FACTOR_LABELS.severity,
      value: f.severity,
      weight: w.severity,
      contribution: w.severity * f.severity,
    },
  ];
}

/** Attach contributions to a breakdown (additive; original fields preserved). */
export function detailBreakdown(
  b: OpportunityBreakdown
): OpportunityBreakdownDetailed {
  return { ...b, contributions: contributions(b) };
}

/** The single largest-contribution factor (drives the "why"). Ties: first wins. */
export function dominantFactor(
  contribs: FactorContribution[]
): FactorContribution {
  return contribs.reduce((top, c) =>
    c.contribution > top.contribution ? c : top
  );
}
