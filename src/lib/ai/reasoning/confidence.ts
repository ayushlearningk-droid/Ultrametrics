/**
 * Confidence Engine (Sprint 34).
 *
 * Maps grounded evidence quality to a High/Medium/Low confidence label. Pure;
 * never a probability or forecast — purely a reflection of how strong the
 * supporting data is.
 */

import type { Confidence, EvidenceLevel, RecInput, CauseInput } from "./types";

/** Evidence strength → confidence (the engine's primary signal). */
export function evidenceConfidence(level: EvidenceLevel | undefined): Confidence {
  if (level === "strong") return "high";
  if (level === "moderate") return "medium";
  return "low";
}

/** A root cause's stated confidence, normalized. */
export function causeConfidence(c: CauseInput): Confidence {
  const v = (c.confidence ?? "").toLowerCase();
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  return "low";
}

/** Per-recommendation confidence from its evidence level. */
export function recommendationConfidence(r: RecInput): Confidence {
  return evidenceConfidence(r.evidenceLevel);
}

/**
 * Overall confidence for the analysis: the strongest available signal across
 * the top recommendation and the top cause, tempered by data completeness
 * (no recommendations AND no causes ⇒ low). Deterministic.
 */
export function overallConfidence(
  recs: RecInput[],
  causes: CauseInput[]
): Confidence {
  const rank: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };
  let best: Confidence = "low";
  if (recs[0]) best = max(best, recommendationConfidence(recs[0]), rank);
  if (causes[0]) best = max(best, causeConfidence(causes[0]), rank);
  // No grounded signals at all → low.
  if (recs.length === 0 && causes.length === 0) return "low";
  return best;
}

function max(a: Confidence, b: Confidence, rank: Record<Confidence, number>): Confidence {
  return rank[b] > rank[a] ? b : a;
}
