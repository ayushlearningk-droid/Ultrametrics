/**
 * Audience subgraph (Sprint 61A — Knowledge Graph).
 *
 * Pure, deterministic builder. Derives a single Audience entity node from the
 * existing CreativeSignals + grounded frequency, linking it to the shared
 * "performance" anchor. No new data source, no I/O, no fabricated segments — the
 * label reflects the grounded audience-match signal (and saturation when the
 * frequency metric is known).
 */

import type { CreativeInput, CreativeSignals } from "@/lib/ai/creative/types";
import type { GraphNode, GraphEdge, KnowledgeGraph } from "./types";

const PERFORMANCE_ID = "performance";
export const AUDIENCE_ID = "audience";

/** Frequency at/above which an audience is considered saturated (grounded). */
const SATURATION_FREQUENCY = 4;

/**
 * Build the audience subgraph. The label reflects the derived audience match;
 * when frequency indicates saturation, that is appended (grounded in the real
 * frequency metric). The edge to performance expresses that the audience shapes
 * the account's results.
 */
export function buildAudienceGraph(
  input: CreativeInput,
  signals: CreativeSignals
): KnowledgeGraph {
  const saturated =
    typeof input.frequency === "number" && input.frequency >= SATURATION_FREQUENCY;
  const label = saturated
    ? `Audience · ${signals.audienceMatch} match · saturated`
    : `Audience · ${signals.audienceMatch} match`;

  const nodes: GraphNode[] = [{ id: AUDIENCE_ID, type: "Audience", label }];
  const edges: GraphEdge[] = [
    { from: AUDIENCE_ID, to: PERFORMANCE_ID, relation: "shapes" },
  ];
  return { nodes, edges };
}
