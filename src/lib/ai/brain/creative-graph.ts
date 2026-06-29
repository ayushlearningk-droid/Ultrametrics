/**
 * Creative subgraph (Sprint 61A — Knowledge Graph).
 *
 * Pure, deterministic builder. Derives a single Creative entity node from the
 * existing CreativeSignals (the brain already computes these) and links it to
 * the shared "performance" anchor. No new data source, no I/O, no fabricated
 * content — the label reflects the grounded hook-quality signal only.
 */

import type { CreativeSignals } from "@/lib/ai/creative/types";
import type { GraphNode, GraphEdge, KnowledgeGraph } from "./types";

const PERFORMANCE_ID = "performance";
export const CREATIVE_ID = "creative";

/**
 * Build the creative subgraph. The label is grounded in the derived hook
 * quality; the edge to performance expresses that the creative influences the
 * account's results.
 */
export function buildCreativeGraph(signals: CreativeSignals): KnowledgeGraph {
  const nodes: GraphNode[] = [
    { id: CREATIVE_ID, type: "Creative", label: `Creative · ${signals.hookQuality} hook` },
  ];
  const edges: GraphEdge[] = [
    { from: CREATIVE_ID, to: PERFORMANCE_ID, relation: "influences" },
  ];
  return { nodes, edges };
}
