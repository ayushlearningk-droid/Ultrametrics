/**
 * AI-010A — Evidence Strength (#3).
 *
 * Reframes the existing (already-computed) confidence signal as the STRENGTH OF
 * EVIDENCE behind a recommendation — NOT a probability or a `confidence_score`.
 * The numeric is read from the score breakdown's confidenceWeight (1.0 / 0.75 /
 * 0.5), which the engines already derived from data volume vs. the qualification
 * floors; when a recommendation carries no breakdown (funnel/pixel/budget recs),
 * it falls back to mapping the rec's categorical `confidence` label.
 *
 * This module derives nothing new and changes no score. Additive, pure, no I/O.
 */

import type { Recommendation, Confidence } from "@/lib/ai/recommendations";

export type EvidenceLevel = "strong" | "moderate" | "limited";

export interface EvidenceStrength {
  /** Qualitative evidence tier (NOT a confidence probability). */
  level: EvidenceLevel;
  /** The 0.5/0.75/1.0 dampening weight the score already used. */
  weight: number;
  /** Short, non-fabricated explanation of the evidence tier. */
  drivers: string[];
}

const LABEL_WEIGHT: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

function levelFor(weight: number): EvidenceLevel {
  if (weight >= 1.0) return "strong";
  if (weight >= 0.75) return "moderate";
  return "limited";
}

/**
 * Derive the evidence strength for a recommendation. Prefers the breakdown's
 * confidenceWeight (the value actually used in scoring); else maps the label.
 */
export function evidenceStrength(rec: Recommendation): EvidenceStrength {
  const weight =
    rec.scoreBreakdown?.factors.confidenceWeight ?? LABEL_WEIGHT[rec.confidence];
  const level = levelFor(weight);
  return {
    level,
    weight,
    drivers: [
      `Evidence tier "${level}" — derived from the data volume behind this recommendation (confidence weight ${weight}).`,
    ],
  };
}
