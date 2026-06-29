/**
 * Living Canvas — alignment & snap guides (Sprint 63G).
 *
 * Pure: given a moving node and the others, find the nearest edge/center
 * alignments within a threshold and return the snap delta + guide lines (world
 * coordinates). Deterministic, no I/O, no React.
 */

import type { CanvasNode } from "./canvas-model";

export interface Guide {
  axis: "x" | "y";
  /** World coordinate of the guide line. */
  pos: number;
}

export interface AlignmentResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

/** Candidate alignment positions for a node along one axis. */
function edgesX(n: CanvasNode): number[] {
  return [n.x, n.x + n.width / 2, n.x + n.width];
}
function edgesY(n: CanvasNode): number[] {
  return [n.y, n.y + n.height / 2, n.y + n.height];
}

/**
 * Compute alignment snap for `moving` against `others`. `threshold` is in world
 * units. Returns the smallest snapping dx/dy and the guide lines to draw.
 */
export function computeAlignment(
  moving: CanvasNode,
  others: CanvasNode[],
  threshold: number
): AlignmentResult {
  let bestDx = 0;
  let bestDistX = threshold;
  let guideX: number | null = null;
  let bestDy = 0;
  let bestDistY = threshold;
  let guideY: number | null = null;

  const mx = edgesX(moving);
  const my = edgesY(moving);

  for (const o of others) {
    for (const ox of edgesX(o)) {
      for (const m of mx) {
        const d = ox - m;
        if (Math.abs(d) < bestDistX) {
          bestDistX = Math.abs(d);
          bestDx = d;
          guideX = ox;
        }
      }
    }
    for (const oy of edgesY(o)) {
      for (const m of my) {
        const d = oy - m;
        if (Math.abs(d) < bestDistY) {
          bestDistY = Math.abs(d);
          bestDy = d;
          guideY = oy;
        }
      }
    }
  }

  const guides: Guide[] = [];
  if (guideX !== null) guides.push({ axis: "x", pos: guideX });
  if (guideY !== null) guides.push({ axis: "y", pos: guideY });
  return { dx: bestDx, dy: bestDy, guides };
}
