"use client";

/**
 * Creative Workflow Engine — the surface (Sprint 63F).
 *
 * Pan + zoom graph workspace: typed nodes, drag-and-drop edge connections,
 * marquee + multi-select, multi-move with snap, undo/redo + clipboard keyboard,
 * and a context menu. Figma-like. Studio 2.0 tokens; numeric constants live in
 * canvas-model. Foundation only — no AI, no generation, no business logic.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useCanvas } from "./canvas-context";
import { CanvasNodeView } from "./canvas-node-view";
import { CanvasContextMenu } from "./canvas-context-menu";
import { PresenceLayer } from "./presence-layer";
import { computeAlignment, type Guide } from "./alignment";
import {
  GRID_SIZE,
  ZOOM_STEP,
  screenToWorld,
  visibleWorldRect,
  isNodeVisible,
  computeFitViewport,
  portPosition,
  nodeBounds,
  type CanvasNode,
  type Viewport,
} from "./canvas-model";

type Gesture =
  | { kind: "pan"; lastX: number; lastY: number }
  | { kind: "move"; lastX: number; lastY: number }
  | { kind: "connect"; sourceId: string }
  | { kind: "marquee"; startX: number; startY: number }
  | null;

interface ScreenRect { x: number; y: number; w: number; h: number }

export function InfiniteCanvas() {
  const c = useCanvas();
  const { activeTab, state } = c;
  const vp = activeTab.viewport;

  const containerRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture>(null);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  // Stable handle to the latest context so global pointer handlers never churn.
  const cRef = useRef(c);
  cRef.current = c;

  const reduce = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [marquee, setMarquee] = useState<ScreenRect | null>(null);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  /* ── Camera smoothing (inertia / smooth zoom / elastic pan) ─────────────── */
  const [displayVp, setDisplayVp] = useState<Viewport>(vp);
  const displayRef = useRef(displayVp);
  displayRef.current = displayVp;
  useEffect(() => {
    if (reduce) {
      setDisplayVp(vp);
      return;
    }
    let raf = 0;
    const k = 0.24; // easing factor toward the target viewport
    const tick = () => {
      const d = displayRef.current;
      const nx = d.x + (vp.x - d.x) * k;
      const ny = d.y + (vp.y - d.y) * k;
      const ns = d.scale + (vp.scale - d.scale) * k;
      if (Math.abs(vp.x - nx) < 0.4 && Math.abs(vp.y - ny) < 0.4 && Math.abs(vp.scale - ns) < 0.0008) {
        setDisplayVp(vp);
      } else {
        setDisplayVp({ x: nx, y: ny, scale: ns });
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vp, reduce]);
  const dvp = displayVp;

  /* ── Measure + auto-fit on first paint ──────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || size.width === 0) return;
    didInit.current = true;
    c.setViewport(computeFitViewport(activeTab.nodes, size.width, size.height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const containerPoint = useCallback((clientX: number, clientY: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) };
  }, []);

  /* ── Stable global pointer handlers (read latest via cRef) ──────────────── */
  const handleMove = useCallback(
    (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      const ctx = cRef.current;
      if (g.kind === "pan") {
        ctx.pan(e.movementX, e.movementY);
      } else if (g.kind === "move") {
        const scale = vpRef.current.scale;
        const rawDx = e.movementX / scale;
        const rawDy = e.movementY / scale;
        const sel = ctx.state.selectedIds;
        if (sel.length === 1) {
          const node = ctx.activeTab.nodes.find((n) => n.id === sel[0]);
          if (node) {
            const moving = { ...node, x: node.x + rawDx, y: node.y + rawDy };
            const others = ctx.activeTab.nodes.filter((n) => n.id !== sel[0]);
            const { dx, dy, guides: g2 } = computeAlignment(moving, others, 6 / scale);
            setGuides(g2);
            ctx.moveSelected(rawDx + dx, rawDy + dy);
            return;
          }
        }
        ctx.moveSelected(rawDx, rawDy);
      } else if (g.kind === "connect") {
        const p = containerPoint(e.clientX, e.clientY);
        setPending(screenToWorld(p.x, p.y, vpRef.current));
      } else if (g.kind === "marquee") {
        const p = containerPoint(e.clientX, e.clientY);
        setMarquee({
          x: Math.min(g.startX, p.x),
          y: Math.min(g.startY, p.y),
          w: Math.abs(p.x - g.startX),
          h: Math.abs(p.y - g.startY),
        });
      }
    },
    [containerPoint]
  );

  const handleUp = useCallback(() => {
    const g = gestureRef.current;
    const ctx = cRef.current;
    if (g?.kind === "move") ctx.snapSelected();
    if (g?.kind === "marquee") {
      setMarquee((m) => {
        if (m) {
          const vpc = vpRef.current;
          const hit = ctx.activeTab.nodes
            .filter((n) => {
              const sx = n.x * vpc.scale + vpc.x;
              const sy = n.y * vpc.scale + vpc.y;
              const sw = n.width * vpc.scale;
              const sh = n.height * vpc.scale;
              return !(sx > m.x + m.w || sx + sw < m.x || sy > m.y + m.h || sy + sh < m.y);
            })
            .map((n) => n.id);
          ctx.setSelection(hit);
        }
        return null;
      });
    }
    gestureRef.current = null;
    setPending(null);
    setGuides([]);
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
  }, [handleMove]);

  const startGesture = useCallback(
    (g: Gesture) => {
      gestureRef.current = g;
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [handleMove, handleUp]
  );

  // Wheel: pan / ctrl-zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = containerPoint(e.clientX, e.clientY);
      const ctx = cRef.current;
      if (e.ctrlKey || e.metaKey) ctx.zoomAtPoint(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, p.x, p.y);
      else ctx.pan(-e.deltaX, -e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerPoint]);

  /* ── Background / node / port gestures ──────────────────────────────────── */
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (menu) setMenu(null);
    if (e.button === 1 || state.tool === "pan") {
      startGesture({ kind: "pan", lastX: e.clientX, lastY: e.clientY });
      return;
    }
    if (!e.shiftKey) c.clearSelection();
    const p = containerPoint(e.clientX, e.clientY);
    startGesture({ kind: "marquee", startX: p.x, startY: p.y });
  };

  const onNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (menu) setMenu(null);
    if (!state.selectedIds.includes(node.id)) c.select(node.id, e.shiftKey);
    else if (e.shiftKey) c.select(node.id, true);
    c.pushHistory();
    startGesture({ kind: "move", lastX: e.clientX, lastY: e.clientY });
  };

  const onPortPointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    const out = portPosition(node, "out");
    setPending(out);
    startGesture({ kind: "connect", sourceId: node.id });
  };

  const onPortPointerUp = (_e: React.PointerEvent, node: CanvasNode) => {
    const g = gestureRef.current;
    if (g?.kind === "connect" && g.sourceId !== node.id) c.connect(g.sourceId, node.id);
  };

  const onNodeContextMenu = (e: React.MouseEvent, node: CanvasNode) => {
    e.preventDefault();
    if (!state.selectedIds.includes(node.id)) c.select(node.id);
    const p = containerPoint(e.clientX, e.clientY);
    setMenu({ x: p.x, y: p.y, nodeId: node.id });
  };

  const onBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = containerPoint(e.clientX, e.clientY);
    setMenu({ x: p.x, y: p.y, nodeId: null });
  };

  /* ── Keyboard ───────────────────────────────────────────────────────────── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    const px = size.width / 2;
    const py = size.height / 2;
    if (mod) {
      switch (e.key.toLowerCase()) {
        case "z":
          e.preventDefault();
          if (e.shiftKey) c.redo();
          else c.undo();
          return;
        case "y":
          e.preventDefault();
          c.redo();
          return;
        case "c":
          e.preventDefault();
          c.copy();
          return;
        case "v":
          e.preventDefault();
          c.paste();
          return;
        case "d":
          e.preventDefault();
          c.duplicateSelected();
          return;
        case "a":
          e.preventDefault();
          c.setSelection(activeTab.nodes.map((n) => n.id));
          return;
      }
      return;
    }
    switch (e.key) {
      case "=":
      case "+":
        e.preventDefault();
        c.zoomAtPoint(ZOOM_STEP, px, py);
        break;
      case "-":
      case "_":
        e.preventDefault();
        c.zoomAtPoint(1 / ZOOM_STEP, px, py);
        break;
      case "0":
        e.preventDefault();
        c.setViewport(computeFitViewport([], size.width, size.height));
        break;
      case "1":
      case "f":
      case "F":
        e.preventDefault();
        c.setViewport(computeFitViewport(activeTab.nodes, size.width, size.height));
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        c.deleteSelected();
        break;
      case "Escape":
        c.clearSelection();
        setMenu(null);
        break;
    }
  };

  /* ── Render (uses the eased display viewport) ───────────────────────────── */
  const rect = visibleWorldRect(vp, size.width, size.height);
  const visibleNodes = activeTab.nodes.filter((n) => isNodeVisible(n, rect));
  const nodeById = new Map(activeTab.nodes.map((n) => [n.id, n]));
  const runningIds = new Set(activeTab.nodes.filter((n) => n.status === "running").map((n) => n.id));
  const selectedNodes = activeTab.nodes.filter((n) => state.selectedIds.includes(n.id));
  const selFrame = selectedNodes.length > 1 ? nodeBounds(selectedNodes) : null;

  // Group frames (node grouping visuals).
  const groupMap = new Map<string, CanvasNode[]>();
  for (const n of activeTab.nodes) {
    if (n.groupId) {
      const arr = groupMap.get(n.groupId) ?? [];
      arr.push(n);
      groupMap.set(n.groupId, arr);
    }
  }

  const cell = GRID_SIZE * dvp.scale;
  const gridStyle: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
    backgroundSize: `${cell}px ${cell}px`,
    backgroundPosition: `${dvp.x}px ${dvp.y}px`,
  };

  const edgePath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const off = Math.max(40, Math.abs(b.x - a.x) * 0.5);
    return `M ${a.x} ${a.y} C ${a.x + off} ${a.y}, ${b.x - off} ${b.y}, ${b.x} ${b.y}`;
  };

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Creative workflow canvas. Scroll to pan, ctrl-scroll to zoom, F to fit, drag node ports to connect. Cmd/Ctrl+Z undo."
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onBackgroundPointerDown}
      onContextMenu={onBackgroundContextMenu}
      data-canvas-bg
      className="studio-focusable studio-stage-in absolute inset-0 touch-none overflow-hidden"
      style={{ cursor: state.tool === "pan" ? "grab" : "default" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={gridStyle} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, hsl(240 30% 1% / 0.5) 100%)" }}
      />

      {/* World layer (eased transform) */}
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${dvp.x}px, ${dvp.y}px) scale(${dvp.scale})` }}>
        {/* Group frames (behind everything) */}
        {Array.from(groupMap.entries()).map(([gid, gNodes]) => {
          const b = nodeBounds(gNodes);
          if (!b) return null;
          const pad = 16;
          return (
            <div
              key={gid}
              aria-hidden
              className="absolute rounded-[var(--studio-radius-lg)] border border-dashed border-brand/25 bg-brand/[0.04]"
              style={{ left: b.x - pad, top: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 }}
            >
              <span className="absolute -top-2.5 left-3 bg-[hsl(222_44%_6%)] px-1.5 type-caption text-foreground-muted">
                Group
              </span>
            </div>
          );
        })}

        {/* Edges */}
        <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible">
          {activeTab.edges.map((edge) => {
            const s = nodeById.get(edge.source);
            const t = nodeById.get(edge.target);
            if (!s || !t) return null;
            const active = runningIds.has(s.id) || runningIds.has(t.id);
            return (
              <path
                key={edge.id}
                className={active ? "studio-edge-flow" : undefined}
                d={edgePath(portPosition(s, "out"), portPosition(t, "in"))}
                fill="none"
                stroke={active ? "hsl(var(--brand) / 0.85)" : "hsl(var(--brand) / 0.45)"}
                strokeWidth={active ? 2 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {pending && gestureRef.current?.kind === "connect" && (() => {
            const s = nodeById.get(gestureRef.current.sourceId);
            if (!s) return null;
            return (
              <path
                d={edgePath(portPosition(s, "out"), pending)}
                fill="none"
                stroke="hsl(var(--brand) / 0.6)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            );
          })()}
        </svg>

        {/* Multi-select bounding frame */}
        {selFrame && (
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-[var(--studio-radius-md)] border border-brand/50"
            style={{ left: selFrame.x - 8, top: selFrame.y - 8, width: selFrame.width + 16, height: selFrame.height + 16 }}
          />
        )}

        {/* Nodes */}
        {visibleNodes.map((node) => (
          <CanvasNodeView
            key={node.id}
            node={node}
            selected={state.selectedIds.includes(node.id)}
            onNodePointerDown={onNodePointerDown}
            onPortPointerDown={onPortPointerDown}
            onPortPointerUp={onPortPointerUp}
            onContextMenu={onNodeContextMenu}
          />
        ))}

        {/* AI presence cursors */}
        <PresenceLayer />
      </div>

      {/* Alignment / snap guides (screen space) */}
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div
            key={`gx-${i}`}
            aria-hidden
            className="pointer-events-none absolute top-0 h-full w-px bg-brand/60"
            style={{ left: g.pos * dvp.scale + dvp.x }}
          />
        ) : (
          <div
            key={`gy-${i}`}
            aria-hidden
            className="pointer-events-none absolute left-0 h-px w-full bg-brand/60"
            style={{ top: g.pos * dvp.scale + dvp.y }}
          />
        )
      )}

      {/* Marquee */}
      {marquee && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[var(--studio-radius-sm)] border border-brand/50 bg-brand/10"
          style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
        />
      )}

      {/* Context menu */}
      {menu && <CanvasContextMenu x={menu.x} y={menu.y} nodeId={menu.nodeId} onClose={() => setMenu(null)} />}
    </div>
  );
}
