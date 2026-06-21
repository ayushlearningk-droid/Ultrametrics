/**
 * AI-010A — Why This Recommendation (#2).
 *
 * Composes a structured, grounded rationale from data the recommendation ALREADY
 * carries: its kind, its largest score contribution, the grounded `impact`
 * string, and its evidence strength. No new numbers, no forecasting, no impact
 * estimation — purely a post-hoc explanation of an existing recommendation.
 *
 * Additive, pure, no I/O.
 */

import type { Recommendation } from "@/lib/ai/recommendations";
import {
  dominantFactor,
  type FactorContribution,
} from "@/lib/ai/intelligence/opportunity-breakdown";
import type { EvidenceStrength } from "@/lib/ai/intelligence/evidence-strength";

export interface Why {
  /** One-line explanation of why this ranked where it did. */
  summary: string;
  /** Grounding bullets (factor shares + the verbatim impact line). */
  factors: string[];
}

/** Build the "why" for a recommendation given its contributions + evidence. */
export function buildWhy(
  rec: Recommendation,
  contribs: FactorContribution[],
  evidence: EvidenceStrength
): Why {
  const top = dominantFactor(contribs);

  const summary =
    `Prioritized mainly by ${top.label}; ${evidence.level} supporting evidence. ` +
    `Opportunity score ${rec.opportunityScore}/${rec.scoreBreakdown?.ceiling ?? 100}.`;

  const factors = contribs
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .map(
      (c) =>
        `${c.label}: value ${c.value.toFixed(2)} × weight ${c.weight} = ${c.contribution.toFixed(3)}`
    );

  // The grounded numbers already authored by the engine — relayed verbatim.
  factors.push(`Grounding: ${rec.impact}`);

  return { summary, factors };
}
