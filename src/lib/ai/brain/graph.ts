/**
 * AI Knowledge Graph (Sprint 39).
 *
 * A pure-TypeScript relationship graph (no graph DB) linking the brain's
 * entities along the chain Performance → Risk/Opportunity → Recommendation →
 * Action → Expected Outcome. Every edge references an existing node (consistent
 * by construction). Deterministic.
 */

import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type { CreativeInput, CreativeSignals } from "@/lib/ai/creative/types";
import { validateGraph } from "@/lib/ai/decision/relationships";
import type { DecisionGraph } from "@/lib/ai/decision/types";
import { buildCampaignGraph, CAMPAIGN_ID } from "./campaign-graph";
import { buildCreativeGraph, CREATIVE_ID } from "./creative-graph";
import { buildAudienceGraph, AUDIENCE_ID } from "./audience-graph";
import type {
  Opportunity,
  Risk,
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
} from "./types";

export function buildKnowledgeGraph(
  opportunities: Opportunity[],
  risks: Risk[],
  reasoning: ReasoningResult
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: KnowledgeGraph["edges"] = [];
  const add = (n: GraphNode) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
  };

  add({ id: "performance", type: "Performance", label: "Account performance" });

  risks.forEach((r, i) => {
    const id = `risk-${i}`;
    add({ id, type: "Risk", label: r.type });
    edges.push({ from: "performance", to: id, relation: "exhibits" });
  });

  opportunities.forEach((o, i) => {
    const id = `opp-${i}`;
    add({ id, type: "Opportunity", label: o.title });
    edges.push({ from: "performance", to: id, relation: "enables" });
  });

  const rec = reasoning.prioritizedActions[0];
  if (rec) {
    add({ id: "recommendation", type: "Recommendation", label: rec.action });
    risks.forEach((_, i) =>
      edges.push({ from: `risk-${i}`, to: "recommendation", relation: "mitigated by" })
    );
    opportunities.forEach((_, i) =>
      edges.push({ from: `opp-${i}`, to: "recommendation", relation: "realized by" })
    );

    add({ id: "action", type: "Action", label: `Approve: ${rec.action}` });
    edges.push({ from: "recommendation", to: "action", relation: "proposes" });

    add({
      id: "outcome",
      type: "ExpectedOutcome",
      label: reasoning.expectedOutcome ?? "Improved performance",
    });
    edges.push({ from: "action", to: "outcome", relation: "expected" });
  }

  return { nodes, edges };
}

/**
 * Marketing Graph (Sprint 61A) — the unified Knowledge Graph.
 *
 * Composes the existing reasoning-chain graph (buildKnowledgeGraph) with the
 * Campaign / Creative / Audience entity subgraphs and adds the structural
 * cross-entity edges (campaign uses creative, campaign targets audience). Pure
 * and deterministic. Reuses the existing Decision-graph integrity check
 * (validateGraph) to guarantee no dangling edges — consistent by construction,
 * but any edge whose endpoints are missing is dropped defensively.
 *
 * This REPLACES the base graph as the brain's `graph` (same KnowledgeGraph
 * shape, same anchor nodes) — no new field, no new store.
 */
export function buildMarketingGraph(
  opportunities: Opportunity[],
  risks: Risk[],
  reasoning: ReasoningResult,
  creativeInput: CreativeInput,
  signals: CreativeSignals
): KnowledgeGraph {
  const base = buildKnowledgeGraph(opportunities, risks, reasoning);

  const nodes: GraphNode[] = [...base.nodes];
  const edges: GraphEdge[] = [...base.edges];
  const add = (n: GraphNode) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
  };

  for (const sub of [
    buildCampaignGraph(creativeInput, reasoning),
    buildCreativeGraph(signals),
    buildAudienceGraph(creativeInput, signals),
  ]) {
    sub.nodes.forEach(add);
    edges.push(...sub.edges);
  }

  // Structural cross-entity relationships (added only when both ends exist).
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.has(CAMPAIGN_ID) && ids.has(CREATIVE_ID)) {
    edges.push({ from: CAMPAIGN_ID, to: CREATIVE_ID, relation: "uses" });
  }
  if (ids.has(CAMPAIGN_ID) && ids.has(AUDIENCE_ID)) {
    edges.push({ from: CAMPAIGN_ID, to: AUDIENCE_ID, relation: "targets" });
  }

  // Reuse the existing graph-integrity check. validateGraph is purely
  // structural (reads id / from / to), so the KnowledgeGraph is passed through
  // the structurally-identical DecisionGraph shape. Drop any dangling edge so
  // the returned graph is always consistent.
  const integrity = validateGraph({ nodes, edges } as unknown as DecisionGraph);
  const safeEdges = integrity.danglingEdges.length
    ? edges.filter((e) => ids.has(e.from) && ids.has(e.to))
    : edges;

  return { nodes, edges: safeEdges };
}
