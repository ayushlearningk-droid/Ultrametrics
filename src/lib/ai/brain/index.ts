/**
 * Marketing Brain (Sprint 39) — the reusable intelligence layer.
 *
 * `buildMarketingBrain` composes every existing engine (creative signals +
 * reasoning) into one grounded intelligence object: health, opportunity graph,
 * risk graph, executive intelligence, daily pulse, and knowledge graph.
 * Reasoning only — no execution. Pure + deterministic; the single entry point
 * future AI features render through.
 */

import { computeCreativeSignals } from "@/lib/ai/creative/intelligence";
import { reason } from "@/lib/ai/reasoning/engine";
import type { CreativeInput } from "@/lib/ai/creative/types";
import type { ReasoningInput } from "@/lib/ai/reasoning/types";
import { scoreHealth } from "./health";
import { detectOpportunities } from "./opportunity";
import { detectRisks } from "./risk";
import { buildExecutive } from "./executive";
import { buildPulse } from "./pulse";
import { buildMarketingGraph } from "./graph";
import type { MarketingBrain } from "./types";

export function buildMarketingBrain(
  creativeInput: CreativeInput,
  reasoningInput: ReasoningInput
): MarketingBrain {
  const signals = computeCreativeSignals(creativeInput);
  const reasoning = reason(reasoningInput);

  const health = scoreHealth(creativeInput, signals);
  const opportunities = detectOpportunities(creativeInput, signals, reasoning);
  const risks = detectRisks(creativeInput, signals);
  const executive = buildExecutive(health, opportunities, risks, reasoning);
  const pulse = buildPulse(health, opportunities, risks, signals, reasoning);
  // Sprint 61A: the brain's graph is now the unified Marketing Graph (reasoning
  // chain + Campaign / Creative / Audience entities), same KnowledgeGraph shape.
  const graph = buildMarketingGraph(
    opportunities,
    risks,
    reasoning,
    creativeInput,
    signals
  );

  return { health, opportunities, risks, executive, pulse, graph };
}

export * from "./types";
