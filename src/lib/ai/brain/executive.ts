/**
 * Executive Brain (Sprint 39).
 *
 * Composes one reusable Executive Intelligence object from health + the ranked
 * opportunity/risk graphs + the reasoning engine. Pure; grounded.
 */

import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type {
  HealthReport,
  Opportunity,
  Risk,
  ExecutiveIntelligence,
} from "./types";

export function buildExecutive(
  health: HealthReport,
  opportunities: Opportunity[],
  risks: Risk[],
  reasoning: ReasoningResult
): ExecutiveIntelligence {
  return {
    executiveSummary: reasoning.executiveSummary,
    healthScore: health.overall,
    topOpportunity: opportunities[0] ?? null,
    biggestRisk: risks[0] ?? null,
    immediateActions: reasoning.prioritizedActions.slice(0, 3).map((a) => a.action),
    expectedOutcome: reasoning.expectedOutcome,
    confidence: reasoning.confidence,
  };
}
