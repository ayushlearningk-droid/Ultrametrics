/**
 * Ask Ultrametrics — unified opportunity scoring (AI-010 Phase 1).
 *
 * Single source of truth for the business-impact priority score (0..ceiling).
 * Before AI-010 the math was duplicated in two shapes that must stay byte-for-
 * byte identical:
 *
 *   Conversion engine (recommendations.ts):
 *     ceiling 100, weights revenue 0.45 / spend 0.30 / severity 0.25
 *     score = round(100 · confidenceWeight · (0.45·rev + 0.30·spend + 0.25·sev))
 *
 *   Objective engines (traffic / engagement / messaging):
 *     ceiling 85, weights revenue 0 / spend 0.50 / severity 0.50 (no revenue term)
 *     score = round(85 · confidenceWeight · (0.50·spend + 0.50·sev))
 *
 * Both are the same formula `round(ceiling · cw · Σ wᵢ·clamp01(factorᵢ))`,
 * parameterized by `ceiling` + `weights`. The objective engines simply pass
 * revenueImpact = 0 with a 0 revenue weight, so the revenue term vanishes.
 *
 * clamp01 on severity is a no-op for every current caller (conversion severities
 * come from a 0..1 table; objective severities are 0..1 literals), so unifying
 * the clamp does not move any existing score.
 *
 * Pure data + arithmetic — type-only imports (erased at build), no I/O.
 */

import type { Confidence } from "@/lib/ai/reasoning/types";

/** Single shared confidence union (canonical source: reasoning/types). */
export type { Confidence };

/** Confidence dampening multiplier (not zeroing). Shared by every engine. */
export const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

/** Composite weights — must sum to 1 for a given scoring profile. */
export interface ScoreWeights {
  revenue: number;
  spend: number;
  severity: number;
}

/** The 0..1 inputs (clamped) plus the confidence multiplier, exposed for "why". */
export interface OpportunityFactors {
  revenueImpact: number;
  spendShare: number;
  severity: number;
  confidenceWeight: number;
}

/** Attachable explanation of a score: its factors and the ceiling it scaled to. */
export interface OpportunityBreakdown {
  factors: OpportunityFactors;
  ceiling: number;
}

/** Full result: the integer score plus its decomposition. */
export interface OpportunityScore {
  score: number;
  factors: OpportunityFactors;
  ceiling: number;
}

/** Conversion-engine profile (AI-007): three-term, ceiling 100. */
export const CONVERSION_SCORING = {
  ceiling: 100,
  weights: { revenue: 0.45, spend: 0.3, severity: 0.25 } as ScoreWeights,
} as const;

/** Objective-engine profile (AI-009): no revenue term, ceiling 85. */
export const OBJECTIVE_SCORING = {
  ceiling: 85,
  weights: { revenue: 0, spend: 0.5, severity: 0.5 } as ScoreWeights,
} as const;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export interface ScoreInput {
  ceiling: number;
  weights: ScoreWeights;
  confidence: Confidence;
  spendShare: number;
  severity: number;
  /** Optional — omitted (0) by objective engines that carry no revenue term. */
  revenueImpact?: number;
}

/**
 * Compute the opportunity score and its breakdown. The score is identical to the
 * pre-AI-010 inline formulas for matching ceiling/weights (see module header).
 */
export function computeOpportunityScore(input: ScoreInput): OpportunityScore {
  const revenueImpact = clamp01(input.revenueImpact ?? 0);
  const spendShare = clamp01(input.spendShare);
  const severity = clamp01(input.severity);
  const confidenceWeight = CONFIDENCE_WEIGHT[input.confidence];

  const composite =
    input.weights.revenue * revenueImpact +
    input.weights.spend * spendShare +
    input.weights.severity * severity;

  const score = Math.round(input.ceiling * confidenceWeight * composite);

  return {
    score,
    factors: { revenueImpact, spendShare, severity, confidenceWeight },
    ceiling: input.ceiling,
  };
}
