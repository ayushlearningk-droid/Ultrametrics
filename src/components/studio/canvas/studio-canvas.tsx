"use client";

/**
 * Infinite Creative Canvas — composition (Sprint 63E).
 *
 * Wires the provider, the surface, and the floating overlays into a full-bleed
 * canvas that fills the shell's Workspace Region. Foundation only — seeded with
 * a few inert placeholder nodes; no AI, no generation, no business logic.
 */

import { useEffect, useRef, useState } from "react";
import { CanvasProvider } from "./canvas-context";
import { InfiniteCanvas } from "./infinite-canvas";
import { ToolPalette, ZoomControls, Minimap, CanvasTabs } from "./canvas-overlays";
import { DEFAULT_VIEWPORT, type CanvasTab } from "./canvas-model";

/** Seed: one tab + a few placeholder nodes so the canvas reads as alive. */
const INITIAL_TABS: CanvasTab[] = [
  {
    id: "tab-1",
    name: "Canvas 1",
    viewport: { ...DEFAULT_VIEWPORT },
    nodes: [
      { id: "n1", kind: "note", x: 96, y: 96, width: 216, height: 132, label: "Idea" },
      { id: "n2", kind: "note", x: 384, y: 216, width: 216, height: 132, label: "Reference" },
      { id: "n3", kind: "note", x: 168, y: 396, width: 216, height: 132, label: "Draft" },
    ],
  },
];

export function StudioCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <CanvasProvider initialTabs={INITIAL_TABS}>
      <div ref={ref} className="absolute inset-0 overflow-hidden">
        <InfiniteCanvas />
        {/* Floating overlays (L4-style, over the surface) */}
        <CanvasTabs />
        <ToolPalette />
        <Minimap size={size} />
        <ZoomControls size={size} />
      </div>
    </CanvasProvider>
  );
}
