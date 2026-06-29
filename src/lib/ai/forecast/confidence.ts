/**
 * Forecast confidence model (Sprint 62A).
 *
 * A small, PURE, deterministic mapping between evidence strength and the reused
 * qualitative confidence band, plus a builder for ForecastConfidence. This is
 * the confidence MODEL — not a forecasting algorithm. No I/O.
 */

import type { Confidence, EvidenceLevel, ForecastConfidence } from "./types";

/** Deterministic evidence → confidence mapping (pure lookup). */
export function confidenceFromEvidence(evidence: EvidenceLevel): Confidence {
  switch (evidence) {
    case "strong":
      return "high";
    case "moderate":
      return "medium";
    case "limited":
      return "low";
  }
}

/**
 * Build a ForecastConfidence from an evidence grade + a grounded rationale.
 * Deterministic; the level is derived from evidence via confidenceFromEvidence.
 */
export function buildForecastConfidence(
  evidence: EvidenceLevel,
  rationale: string
): ForecastConfidence {
  return { level: confidenceFromEvidence(evidence), evidence, rationale };
}
