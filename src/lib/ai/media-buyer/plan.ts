/**
 * AI Media Buyer — Optimization Plan assembler (Sprint 38).
 *
 * Ties the existing reasoning engine (executive summary, risks, opportunities,
 * grounded business impact, confidence) to the optimization engine's six
 * category recommendations. Pure; planning only — nothing is executed.
 */

import { computeCreativeSignals } from "@/lib/ai/creative/intelligence";
import { reason } from "@/lib/ai/reasoning/engine";
import type { ReasoningInput } from "@/lib/ai/reasoning/types";
import type { CreativeInput } from "@/lib/ai/creative/types";
import { generateOptimizations } from "./engine";
import type { OptimizationPlan } from "./types";

export function buildOptimizationPlan(
  creativeInput: CreativeInput,
  reasoningInput: ReasoningInput
): OptimizationPlan {
  const signals = computeCreativeSignals(creativeInput);
  const reasoning = reason(reasoningInput);
  const impactHint = reasoning.businessImpact.quantified
    ? reasoning.businessImpact.summary
    : undefined;

  const recommendations = generateOptimizations(creativeInput, signals, {
    impactHint,
  });

  const problemsFound = Array.from(
    new Set([...signals.messagingProblems, ...reasoning.risks])
  );

  return {
    executiveSummary: reasoning.executiveSummary,
    problemsFound,
    opportunities: reasoning.opportunities,
    recommendations,
    confidence: reasoning.confidence,
  };
}
