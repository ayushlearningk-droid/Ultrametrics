/**
 * AI-010A — Opportunity Intelligence orchestrator.
 *
 * Enriches an already-serialized recommendation with the four additive,
 * post-hoc intelligence fields (#1 breakdown contributions, #2 why,
 * #3 evidence strength) and builds the explicit ranked-opportunities index (#6)
 * over the EXISTING rank order. Reads only — never recomputes opportunityScore
 * and never re-sorts the input list, so scores and ranking are preserved exactly.
 */

import type { Recommendation } from "@/lib/ai/recommendations";
import { detailBreakdown, contributions } from "@/lib/ai/intelligence/opportunity-breakdown";
import { evidenceStrength } from "@/lib/ai/intelligence/evidence-strength";
import { buildWhy } from "@/lib/ai/intelligence/rationale";

/** A compact, ordered index entry for the ranked-opportunities surface (#6). */
export interface RankedOpportunityEntry {
  rank: number;
  kind: Recommendation["kind"];
  level: Recommendation["level"];
  entity_name: string;
  opportunity_score: number;
  evidence: string;
}

/**
 * Add the intelligence fields to a serialized recommendation. `base` is the
 * existing serializeRecommendation output; this overlays:
 *   - opportunity_score_breakdown → detailed (with contributions)  (#1)
 *   - evidence_strength                                            (#3)
 *   - why (only when a breakdown exists to ground it)              (#2)
 * Non-breakdown recs still get evidence_strength (via label fallback).
 */
export function enrichSerialized<T extends Record<string, unknown>>(
  base: T,
  rec: Recommendation
): T & Record<string, unknown> {
  const evidence = evidenceStrength(rec);
  const out: Record<string, unknown> = {
    ...base,
    evidence_strength: evidence,
  };

  if (rec.scoreBreakdown) {
    out.opportunity_score_breakdown = detailBreakdown(rec.scoreBreakdown);
    out.why = buildWhy(rec, contributions(rec.scoreBreakdown), evidence);
  }

  return out as T & Record<string, unknown>;
}

/**
 * Build the explicit ranked-opportunities index from a list that is ALREADY in
 * rank order (rankRecs output). Order is preserved 1:1 — no re-sorting.
 */
export function rankedOpportunities(
  recs: Recommendation[]
): RankedOpportunityEntry[] {
  return recs.map((r, i) => ({
    rank: i + 1,
    kind: r.kind,
    level: r.level,
    entity_name: r.entityName,
    opportunity_score: r.opportunityScore,
    evidence: evidenceStrength(r).level,
  }));
}
