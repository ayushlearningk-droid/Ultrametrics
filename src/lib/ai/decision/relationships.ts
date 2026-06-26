/**
 * AI Decision Center — relationship integrity (Sprint 45).
 *
 * Pure helpers to validate and traverse a decision graph. The graph is
 * consistent by construction, but these guards let the (future) UI and the eval
 * suite assert integrity and walk relationships. No I/O.
 */

import type {
  DecisionGraph,
  DecisionNode,
  DecisionNodeType,
  DecisionEdge,
} from "./types";

export interface GraphIntegrity {
  ok: boolean;
  danglingEdges: DecisionEdge[];
  orphanNodes: DecisionNode[];
}

/** Every edge must reference existing nodes; report any violations. */
export function validateGraph(graph: DecisionGraph): GraphIntegrity {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const danglingEdges = graph.edges.filter(
    (e) => !ids.has(e.from) || !ids.has(e.to)
  );
  const connected = new Set<string>();
  for (const e of graph.edges) {
    connected.add(e.from);
    connected.add(e.to);
  }
  const orphanNodes = graph.nodes.filter((n) => !connected.has(n.id));
  return { ok: danglingEdges.length === 0, danglingEdges, orphanNodes };
}

export function nodesOfType(
  graph: DecisionGraph,
  type: DecisionNodeType
): DecisionNode[] {
  return graph.nodes.filter((n) => n.type === type);
}

export function outgoing(graph: DecisionGraph, nodeId: string): DecisionEdge[] {
  return graph.edges.filter((e) => e.from === nodeId);
}

export function incoming(graph: DecisionGraph, nodeId: string): DecisionEdge[] {
  return graph.edges.filter((e) => e.to === nodeId);
}

/** True when a directed path Performance → … → ExpectedOutcome exists. */
export function hasFullChain(graph: DecisionGraph): boolean {
  const start = graph.nodes.find((n) => n.type === "Performance");
  const goalIds = new Set(
    nodesOfType(graph, "ExpectedOutcome").map((n) => n.id)
  );
  if (!start || goalIds.size === 0) return false;

  const seen = new Set<string>();
  const stack = [start.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (goalIds.has(id)) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of outgoing(graph, id)) stack.push(e.to);
  }
  return false;
}
