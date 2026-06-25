/**
 * Opportunity Graph (Sprint 39).
 *
 * Detects upside opportunities across Scaling / Creative / Budget / Audience /
 * Placement / Campaign from the grounded signals + reasoning, ranked by
 * priority. Pure; grounded; no invented impact (uses the reasoning engine's
 * business-impact line or an explicit "directional" note).
 */

import type { CreativeInput, CreativeSignals } from "@/lib/ai/creative/types";
import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type { Opportunity, Priority } from "./types";

const RANK: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };

export function detectOpportunities(
  _input: CreativeInput,
  signals: CreativeSignals,
  reasoning: ReasoningResult
): Opportunity[] {
  const impact = reasoning.businessImpact.quantified
    ? reasoning.businessImpact.summary
    : "Directional — validate with a controlled test.";
  const out: Opportunity[] = [];

  const stable = signals.fatigueScore < 40 && signals.hookQuality !== "weak";
  if (stable)
    out.push({
      type: "Scaling",
      title: "Scale proven winners in 15–20% steps.",
      expectedImpact: impact,
      confidence: signals.confidence,
      priority: "High",
    });

  const creWeak = signals.hookQuality === "weak" || signals.fatigueScore >= 60;
  out.push({
    type: "Creative",
    title: creWeak
      ? "Refresh creative (new hook + angle)."
      : "Queue fresh variants to pre-empt fatigue.",
    expectedImpact: "Higher CTR / lower CPC as fresh creative re-engages.",
    confidence: signals.confidence,
    priority: creWeak ? "High" : "Medium",
  });

  if (signals.ctaQuality === "weak" || signals.offerMatch === "weak")
    out.push({
      type: "Budget",
      title: "Reallocate budget toward converting campaigns.",
      expectedImpact: impact,
      confidence: signals.confidence,
      priority: "High",
    });

  if (signals.audienceMatch === "weak" || signals.fatigueScore >= 60)
    out.push({
      type: "Audience",
      title: "Expand/refresh audiences to lower frequency.",
      expectedImpact: "Lower frequency and renewed reach.",
      confidence: signals.confidence,
      priority: "Medium",
    });

  out.push({
    type: "Placement",
    title: "Shift spend toward best-ROAS placements.",
    expectedImpact: "Directional — review the placement breakdown.",
    confidence: "medium",
    priority: "Medium",
  });

  if (reasoning.prioritizedActions[0])
    out.push({
      type: "Campaign",
      title: reasoning.prioritizedActions[0].action,
      expectedImpact: impact,
      confidence: reasoning.confidence,
      priority: reasoning.prioritizedActions[0].priority,
    });

  return out.sort((a, b) => RANK[b.priority] - RANK[a.priority]);
}
