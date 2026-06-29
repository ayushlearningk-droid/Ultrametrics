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
import {
  ToolPalette,
  ZoomControls,
  Minimap,
  CanvasTabs,
  HistoryControls,
  CanvasInspector,
} from "./canvas-overlays";
import { ActivityTimeline } from "./activity-timeline";
import { DEFAULT_VIEWPORT, type CanvasTab } from "./canvas-model";

/**
 * Seed: a small Prompt → Storyboard → Scene → Video → Publish workflow so the
 * engine reads as alive. Inert placeholders — no AI, no generation.
 */
const INITIAL_TABS: CanvasTab[] = [
  {
    id: "tab-1",
    name: "Workflow 1",
    viewport: { ...DEFAULT_VIEWPORT },
    nodes: [
      { id: "n-prompt", type: "prompt", x: 80, y: 120, width: 216, height: 116, status: "complete", groupId: null },
      { id: "n-story", type: "storyboard", x: 380, y: 120, width: 216, height: 116, status: "running", groupId: null },
      { id: "n-scene", type: "scene", x: 680, y: 60, width: 216, height: 116, status: "idle", groupId: "g-shots" },
      { id: "n-video", type: "video", x: 680, y: 220, width: 216, height: 116, status: "idle", groupId: "g-shots" },
      { id: "n-publish", type: "publish", x: 980, y: 140, width: 216, height: 116, status: "idle", groupId: null },
    ],
    edges: [
      { id: "e-prompt-story", source: "n-prompt", target: "n-story" },
      { id: "e-story-scene", source: "n-story", target: "n-scene" },
      { id: "e-story-video", source: "n-story", target: "n-video" },
      { id: "e-video-publish", source: "n-video", target: "n-publish" },
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
        <HistoryControls />
        <ToolPalette />
        <CanvasInspector />
        <ActivityTimeline />
        <Minimap size={size} />
        <ZoomControls size={size} />
      </div>
    </CanvasProvider>
  );
}
