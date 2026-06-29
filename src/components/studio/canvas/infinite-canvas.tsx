"use client";

/**
 * Infinite Creative Canvas — the surface (Sprint 63E).
 *
 * Pan + zoom workspace with a depth grid, node rendering, selection, and
 * drag-ready nodes. Figma / Apple Freeform feel. Uses Studio 2.0 tokens for all
 * materials; numeric canvas constants are centralized in canvas-model.
 *
 * SCOPE: foundation only — no AI, no generation, no business logic. Nodes are
 * inert placeholders. Region-virtualization is wired (only visible nodes render).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCanvas } from "./canvas-context";
import {
  GRID_SIZE,
  ZOOM_STEP,
  snapToGrid,
  visibleWorldRect,
  isNodeVisible,
  computeFitViewport,
  type CanvasNode,
} from "./canvas-model";

/** Imperative drag state (in a ref to avoid re-renders mid-gesture). */
interface DragState {
  kind: "pan" | "node";
  nodeId?: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

export function InfiniteCanvas() {
  const reduce = useReducedMotion();
  const { activeTab, state, pan, zoomAtPoint, setViewport, select, clearSelection, moveNode } =
    useCanvas();
  const vp = activeTab.viewport;

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Latest viewport / nodes mirrored to refs so the global pointer handlers can
  // stay stable (no listener churn during a gesture).
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const nodesRef = useRef(activeTab.nodes);
  nodesRef.current = activeTab.nodes;

  // Measure the container (for fit + virtualization). ResizeObserver, no polling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-fit content once the container is first measured (opens fitted).
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || size.width === 0) return;
    didInit.current = true;
    setViewport(computeFitViewport(nodesRef.current, size.width, size.height));
  }, [size, setViewport]);

  /* ── Stable pointer handlers (added/removed by identity) ─────────────────── */
  const handleMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (drag.kind === "pan") {
        setViewport({ scale: vpRef.current.scale, x: drag.originX + dx, y: drag.originY + dy });
      } else if (drag.nodeId) {
        const node = nodesRef.current.find((n) => n.id === drag.nodeId);
        if (node) {
          const targetX = drag.originX + dx / vpRef.current.scale;
          const targetY = drag.originY + dy / vpRef.current.scale;
          moveNode(node.id, targetX - node.x, targetY - node.y);
        }
      }
    },
    [setViewport, moveNode]
  );

  const handleUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag?.kind === "node" && drag.nodeId) {
      // Snap to grid on release (snap-grid foundation).
      const node = nodesRef.current.find((n) => n.id === drag.nodeId);
      if (node) {
        const sx = snapToGrid(node.x);
        const sy = snapToGrid(node.y);
        if (sx !== node.x || sy !== node.y) moveNode(node.id, sx - node.x, sy - node.y);
      }
    }
    dragRef.current = null;
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
  }, [handleMove, moveNode]);

  // Native wheel listener (passive:false) so we can preventDefault for zoom/pan.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      if (e.ctrlKey || e.metaKey) {
        zoomAtPoint(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, px, py);
      } else {
        pan(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [pan, zoomAtPoint]);

  const beginPan = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    clearSelection();
    dragRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      originX: vp.x,
      originY: vp.y,
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const beginNodeDrag = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    select(node.id, e.shiftKey);
    dragRef.current = {
      kind: "node",
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: node.x,
      originY: node.y,
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  /* ── Keyboard shortcuts (canvas-scoped; container is focusable) ──────────── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const px = size.width / 2;
    const py = size.height / 2;
    switch (e.key) {
      case "=":
      case "+":
        e.preventDefault();
        zoomAtPoint(ZOOM_STEP, px, py);
        break;
      case "-":
      case "_":
        e.preventDefault();
        zoomAtPoint(1 / ZOOM_STEP, px, py);
        break;
      case "0":
        e.preventDefault();
        setViewport(computeFitViewport([], size.width, size.height));
        break;
      case "1":
      case "f":
      case "F":
        e.preventDefault();
        setViewport(computeFitViewport(activeTab.nodes, size.width, size.height));
        break;
      case "Escape":
        clearSelection();
        break;
    }
  };

  // Region virtualization: only render nodes intersecting the visible world.
  const rect = visibleWorldRect(vp, size.width, size.height);
  const visibleNodes = activeTab.nodes.filter((n) => isNodeVisible(n, rect));

  // Depth grid: dot spacing/offset follow the viewport.
  const cell = GRID_SIZE * vp.scale;
  const gridStyle: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
    backgroundSize: `${cell}px ${cell}px`,
    backgroundPosition: `${vp.x}px ${vp.y}px`,
  };

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Infinite creative canvas. Scroll to pan, ctrl-scroll to zoom, F to fit, 0 to reset, plus and minus to zoom."
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={beginPan}
      data-canvas-bg
      className="studio-focusable absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={gridStyle} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, hsl(240 30% 1% / 0.5) 100%)",
        }}
      />

      {/* World layer (transformed) */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})` }}
      >
        {visibleNodes.map((node) => {
          const selected = state.selectedIds.includes(node.id);
          return (
            <div
              key={node.id}
              role="button"
              tabIndex={-1}
              aria-pressed={selected}
              aria-label={node.label ?? "Canvas node"}
              onPointerDown={(e) => beginNodeDrag(e, node)}
              className={cn(
                "studio-card absolute flex select-none cursor-grab flex-col gap-1 p-3 active:cursor-grabbing",
                selected && "studio-glow",
                !reduce && "transition-shadow"
              )}
              style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
            >
              <span className="type-eyebrow text-foreground-muted">Node</span>
              <span className="type-body font-semibold text-foreground">
                {node.label ?? "Untitled"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
