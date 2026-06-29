/**
 * Campaign subgraph (Sprint 61A — Knowledge Graph).
 *
 * Pure, deterministic builder. Derives a single Campaign entity node from the
 * SAME grounded inputs the Marketing Brain already has (account-level metrics +
 * reasoning) and links it to the shared "performance" anchor. No new data
 * source, no I/O, no fabricated names — the label reflects real grounded
 * signals only. The composer (buildMarketingGraph) merges this into the brain's
 * existing Knowledge Graph.
 */

import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type { CreativeInput } from "@/lib/ai/creative/types";
import type { GraphNode, GraphEdge, KnowledgeGraph } from "./types";

/** Shared anchor id added by buildKnowledgeGraph (the account performance node). */
const PERFORMANCE_ID = "performance";
/** Stable id so cross-entity edges can reference the campaign deterministically. */
export const CAMPAIGN_ID = "campaign";

/**
 * Build the campaign subgraph. The label is grounded in real metrics (ROAS /
 * CTR trend) when available, otherwise a neutral "Campaign". The edge to
 * performance expresses that the campaign drives the account's results.
 */
export function buildCampaignGraph(
  input: CreativeInput,
  reasoning: ReasoningResult
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const parts: string[] = [];
  if (typeof input.roas === "number") parts.push(`ROAS ${input.roas.toFixed(2)}`);
  if (input.ctrTrend) parts.push(`CTR ${input.ctrTrend}`);
  const label = parts.length ? `Campaign · ${parts.join(" · ")}` : "Campaign";

  nodes.push({ id: CAMPAIGN_ID, type: "Campaign", label });
  edges.push({ from: CAMPAIGN_ID, to: PERFORMANCE_ID, relation: "drives" });

  // When the brain has a top recommendation, the campaign is what it optimizes.
  // The "recommendation" node is added by buildKnowledgeGraph; the composer only
  // keeps this edge when that node exists, so it is never dangling.
  if (reasoning.prioritizedActions[0]) {
    edges.push({ from: "recommendation", to: CAMPAIGN_ID, relation: "optimizes" });
  }

  return { nodes, edges };
}
