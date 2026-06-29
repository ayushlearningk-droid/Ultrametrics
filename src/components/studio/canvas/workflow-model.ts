/**
 * Creative Workflow Engine — graph helpers (Sprint 63F).
 *
 * Pure, deterministic operations over the node/edge graph: connection validity,
 * edge mutation, auto-layout, and node duplication. No React, no I/O, no
 * business logic.
 */

import type { CanvasNode, CanvasEdge } from "./canvas-model";
import { NODE_TYPES } from "./node-types";

/** Whether a connection source→target is allowed (registry + graph rules). */
export function canConnect(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  source: string,
  target: string
): boolean {
  if (source === target) return false;
  const s = nodes.find((n) => n.id === source);
  const t = nodes.find((n) => n.id === target);
  if (!s || !t) return false;
  if (!NODE_TYPES[s.type].hasOutput || !NODE_TYPES[t.type].hasInput) return false;
  // No duplicate edge.
  if (edges.some((e) => e.source === source && e.target === target)) return false;
  return true;
}

/** Add an edge if valid; returns the (possibly unchanged) edge list. */
export function addEdge(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  source: string,
  target: string
): CanvasEdge[] {
  if (!canConnect(nodes, edges, source, target)) return edges;
  return [...edges, { id: `e-${source}-${target}`, source, target }];
}

/** Remove all edges touching any of the given node ids. */
export function pruneEdges(edges: CanvasEdge[], nodeIds: Set<string>): CanvasEdge[] {
  return edges.filter((e) => !nodeIds.has(e.source) && !nodeIds.has(e.target));
}

/* ── Auto-layout (layered left→right by graph depth) ─────────────────────── */
const COL_GAP = 300;
const ROW_GAP = 160;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;

/** Compute a layered layout. Pure — returns nodes with new x/y. */
export function autoLayout(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasNode[] {
  if (nodes.length === 0) return nodes;
  const incoming = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    adjacency.set(n.id, []);
  }
  for (const e of edges) {
    if (incoming.has(e.target) && adjacency.has(e.source)) {
      incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
      adjacency.get(e.source)!.push(e.target);
    }
  }

  // Depth = longest path from a root; BFS over a Kahn-style traversal.
  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) {
    if ((incoming.get(n.id) ?? 0) === 0) {
      depth.set(n.id, 0);
      queue.push(n.id);
    }
  }
  const remaining = new Map(incoming);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const next of adjacency.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, d + 1));
      remaining.set(next, (remaining.get(next) ?? 1) - 1);
      if ((remaining.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  // Stack nodes within each column.
  const rowByCol = new Map<number, number>();
  return nodes.map((n) => {
    const col = depth.get(n.id) ?? 0;
    const row = rowByCol.get(col) ?? 0;
    rowByCol.set(col, row + 1);
    return { ...n, x: ORIGIN_X + col * COL_GAP, y: ORIGIN_Y + row * ROW_GAP };
  });
}

/* ── Duplication (copy/paste/duplicate) ──────────────────────────────────── */
export interface DuplicateResult {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  newIds: string[];
}

/**
 * Duplicate the given node ids (and edges fully internal to the selection),
 * offset by (dx, dy). Returns the NEW nodes/edges + their ids. Pure (ids derived
 * from a caller-supplied seed so it stays deterministic/testable).
 */
export function duplicateNodes(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  ids: string[],
  offset: { dx: number; dy: number },
  seed: string
): DuplicateResult {
  const idSet = new Set(ids);
  const idMap = new Map<string, string>();
  const newNodes: CanvasNode[] = [];
  let i = 0;
  for (const n of nodes) {
    if (!idSet.has(n.id)) continue;
    const newId = `${n.id}-${seed}-${i++}`;
    idMap.set(n.id, newId);
    newNodes.push({ ...n, id: newId, x: n.x + offset.dx, y: n.y + offset.dy });
  }
  const newEdges: CanvasEdge[] = [];
  for (const e of edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      const s = idMap.get(e.source)!;
      const t = idMap.get(e.target)!;
      newEdges.push({ id: `e-${s}-${t}`, source: s, target: t });
    }
  }
  return { nodes: newNodes, edges: newEdges, newIds: Array.from(idMap.values()) };
}
