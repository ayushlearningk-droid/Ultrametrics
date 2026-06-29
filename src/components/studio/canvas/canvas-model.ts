/**
 * Infinite Creative Canvas — model, constants & pure math (Sprint 63E).
 *
 * Types + deterministic, side-effect-free geometry helpers shared by the canvas
 * surface, overlays, and state. No React, no I/O, no business logic.
 *
 * Coordinate model: a world point (wx, wy) maps to screen as
 *   sx = wx * scale + viewport.x
 *   sy = wy * scale + viewport.y
 */

/* ── Tunable canvas constants (centralized — never scattered/hardcoded) ────── */
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 1.2;
/** World units per grid cell (the snap grid + background spacing). */
export const GRID_SIZE = 24;
/** Fraction of the viewport kept as padding when fitting to content. */
export const FIT_PADDING = 0.16;
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export type CanvasNodeKind = "note" | "placeholder";

/** A node lives in world coordinates. Node-ready: future kinds extend this. */
export interface CanvasNode {
  id: string;
  kind: CanvasNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

/** A workspace tab = one independent canvas (viewport + nodes). */
export interface CanvasTab {
  id: string;
  name: string;
  viewport: Viewport;
  nodes: CanvasNode[];
}

export type CanvasTool = "select" | "pan";

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ── Pure helpers ────────────────────────────────────────────────────────────*/

export function clampZoom(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

/** Snap a world value to the grid. */
export function snapToGrid(value: number, size: number = GRID_SIZE): number {
  return Math.round(value / size) * size;
}

/** Screen → world. */
export function screenToWorld(
  px: number,
  py: number,
  vp: Viewport
): { x: number; y: number } {
  return { x: (px - vp.x) / vp.scale, y: (py - vp.y) / vp.scale };
}

/**
 * Zoom by `factor` keeping the world point under (px, py) fixed on screen.
 * Returns a new viewport (clamped). Pure.
 */
export function zoomAt(
  vp: Viewport,
  factor: number,
  px: number,
  py: number
): Viewport {
  const scale = clampZoom(vp.scale * factor);
  const wx = (px - vp.x) / vp.scale;
  const wy = (py - vp.y) / vp.scale;
  return { scale, x: px - wx * scale, y: py - wy * scale };
}

/** Bounding box of nodes in world space, or null when empty. */
export function nodeBounds(nodes: CanvasNode[]): WorldRect | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** The world rectangle currently visible in a container of (cw, ch) pixels. */
export function visibleWorldRect(
  vp: Viewport,
  cw: number,
  ch: number
): WorldRect {
  const topLeft = screenToWorld(0, 0, vp);
  return { x: topLeft.x, y: topLeft.y, width: cw / vp.scale, height: ch / vp.scale };
}

/**
 * Compute a viewport that fits `nodes` (or recenters when empty) inside a
 * container of (cw, ch) pixels, with FIT_PADDING margin. Pure.
 */
export function computeFitViewport(
  nodes: CanvasNode[],
  cw: number,
  ch: number
): Viewport {
  const bounds = nodeBounds(nodes);
  if (!bounds || bounds.width === 0 || bounds.height === 0) {
    // Empty canvas → center the world origin at the container's middle.
    return { x: cw / 2, y: ch / 2, scale: 1 };
  }
  const pad = 1 - FIT_PADDING;
  const scale = clampZoom(
    Math.min((cw * pad) / bounds.width, (ch * pad) / bounds.height)
  );
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return { scale, x: cw / 2 - centerX * scale, y: ch / 2 - centerY * scale };
}

/** Whether a node intersects the visible world rect (region-virtualization ready). */
export function isNodeVisible(node: CanvasNode, rect: WorldRect): boolean {
  return !(
    node.x > rect.x + rect.width ||
    node.x + node.width < rect.x ||
    node.y > rect.y + rect.height ||
    node.y + node.height < rect.y
  );
}
