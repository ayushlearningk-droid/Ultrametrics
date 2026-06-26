/**
 * AI Decision Center — confidence engine (Sprint 45).
 *
 * Breaks the single grounded confidence label into its contributing factors:
 * data quality, signal strength, evidence, and reasoning confidence — then a
 * deterministic overall. Every factor is derived from a real engine output;
 * nothing is fabricated and no value is presented as a probability/forecast. The
 * 0–100 scores are representative bands for the qualitative level only. Pure.
 */

import type { ReasoningResult, Confidence } from "@/lib/ai/reasoning/types";
import type { HealthReport } from "@/lib/ai/brain/types";
import type {
  ConfidenceBreakdown,
  ConfidenceFactor,
  ConfidenceFactorKey,
} from "./types";

const RANK: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };
/** Representative band per level (qualitative, not a probability). */
const BAND: Record<Confidence, number> = { low: 45, medium: 70, high: 92 };

function factor(
  key: ConfidenceFactorKey,
  level: Confidence,
  rationale: string
): ConfidenceFactor {
  return { key, level, score: BAND[level], rationale };
}

/** Data quality — how complete the grounded inputs behind the analysis are. */
function dataQuality(reasoning: ReasoningResult): ConfidenceFactor {
  const n = reasoning.evidence.length;
  const level: Confidence = n >= 3 ? "high" : n === 2 ? "medium" : "low";
  return factor(
    "dataQuality",
    level,
    `${n} grounded evidence point${n === 1 ? "" : "s"} available.`
  );
}

/** Signal strength — the health engine's own confidence in its signals. */
function signalStrength(health: HealthReport): ConfidenceFactor {
  return factor(
    "signalStrength",
    health.confidence,
    `Health engine signal confidence: ${health.confidence}.`
  );
}

/** Evidence — strongest when the business impact is quantified by the tool. */
function evidence(reasoning: ReasoningResult): ConfidenceFactor {
  const level: Confidence = reasoning.businessImpact.quantified
    ? "high"
    : reasoning.evidence.length >= 2
      ? "medium"
      : "low";
  return factor(
    "evidence",
    level,
    reasoning.businessImpact.quantified
      ? "Impact is quantified with grounded ranges."
      : "Impact is directional (no quantified ranges)."
  );
}

/** Reasoning confidence — propagated verbatim from the reasoning engine. */
function reasoningConfidence(reasoning: ReasoningResult): ConfidenceFactor {
  return factor(
    "reasoning",
    reasoning.confidence,
    `Reasoning engine overall confidence: ${reasoning.confidence}.`
  );
}

function levelFromScore(score: number): Confidence {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

/**
 * Compose the full breakdown. Overall is the deterministic mean of the four
 * factor bands, mapped back to a label — never higher than any single factor's
 * level by more than the averaging allows, and never fabricated.
 */
export function buildConfidenceBreakdown(
  reasoning: ReasoningResult,
  health: HealthReport
): ConfidenceBreakdown {
  const dq = dataQuality(reasoning);
  const ss = signalStrength(health);
  const ev = evidence(reasoning);
  const rc = reasoningConfidence(reasoning);
  const overallScore = Math.round(
    (dq.score + ss.score + ev.score + rc.score) / 4
  );
  return {
    dataQuality: dq,
    signalStrength: ss,
    evidence: ev,
    reasoning: rc,
    overall: levelFromScore(overallScore),
    overallScore,
  };
}

/** Expose the rank for ordering/tests. */
export function confidenceRank(c: Confidence): number {
  return RANK[c];
}
