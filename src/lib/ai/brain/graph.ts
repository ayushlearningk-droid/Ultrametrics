/**
 * AI Knowledge Graph (Sprint 39).
 *
 * A pure-TypeScript relationship graph (no graph DB) linking the brain's
 * entities along the chain Performance → Risk/Opportunity → Recommendation →
 * Action → Expected Outcome. Every edge references an existing node (consistent
 * by construction). Deterministic.
 */

import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type {
  Opportunity,
  Risk,
  KnowledgeGraph,
  GraphNode,
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
