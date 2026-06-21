/**
 * Ask Ultrametrics — Impact Estimation orchestrator (AI-014A.3).
 *
 * Bridges a Recommendation's engine-exposed `effect` (AI-014A.1) to the pure
 * Impact Estimation engine (AI-014A.2), supplying the recommendation's evidence
 * tier (AI-010A). Returns null when the recommendation carries no effect, so the
 * serializer can omit `estimated_impact` entirely.
 *
 * Read-only and additive: reads `rec.effect` + `evidenceStrength(rec)`, never
 * touches scoring, ranking, or any other field.
 */

import type { Recommendation } from "@/lib/ai/recommendations";
import { evidenceStrength } from "@/lib/ai/intelligence/evidence-strength";
import {
  estimateImpact,
  type ImpactEstimate,
} from "@/lib/ai/impact/impact-estimation";

/**
 * Build the impact estimate for a recommendation, or null when it has no
 * engine-exposed effect (only the AI-014A.1 kinds carry one).
 */
export function buildImpactEstimate(
  rec: Recommendation
): ImpactEstimate | null {
  if (!rec.effect) return null;
  return estimateImpact(rec.effect, evidenceStrength(rec).level);
}
