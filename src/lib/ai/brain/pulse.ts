/**
 * Daily Marketing Pulse (Sprint 39).
 *
 * A reusable five-section daily digest (wins / problems / opportunities / risks
 * / recommendations) composed from the health report + graphs + reasoning.
 * Pure; grounded.
 */

import type { CreativeSignals } from "@/lib/ai/creative/types";
import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type { HealthReport, Opportunity, Risk, DailyPulse } from "./types";

export function buildPulse(
  health: HealthReport,
  opportunities: Opportunity[],
  risks: Risk[],
  signals: CreativeSignals,
  reasoning: ReasoningResult
): DailyPulse {
  return {
    wins: health.dimensions
      .filter((d) => d.severity === "low")
      .map((d) => `${d.key}: ${d.explanation}`),
    problems:
      signals.messagingProblems.length > 0
        ? signals.messagingProblems
        : reasoning.risks.slice(0, 3),
    opportunities: opportunities.slice(0, 3).map((o) => o.title),
    risks: risks.slice(0, 3).map((r) => `${r.type} (${r.severity})`),
    recommendations: reasoning.prioritizedActions.slice(0, 3).map((a) => a.action),
  };
}
