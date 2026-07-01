"use client";

/**
 * Infinite Creative Canvas — composition (Sprint 63E · generation-driven since 64U).
 *
 * The canvas is now part of the single asset lifecycle: it is seeded from the
 * active generation (the Generation Store — the one source of truth), so every
 * generated creative appears here as a live node. Layout: Prompt → one Image /
 * Video node per creative → Publish. Node status mirrors each asset's real
 * execution state (queued → running → completed / failed) via the existing
 * setStatus action, so the graph advances exactly as execution advances. Before
 * any generation the canvas is honestly empty — never a fake placeholder graph.
 * The canvas engine, reducer, and overlays are unchanged.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasProvider, useCanvas } from "./canvas-context";
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
import { DEFAULT_VIEWPORT, type CanvasEdge, type CanvasNode, type CanvasTab } from "./canvas-model";
import type { NodeStatus } from "./node-types";
import { useGeneration } from "@/components/studio/generation/generation-store";
import type { GenerationResult } from "@/components/studio/generation/generation-runtime";

/** Map an asset execution status to a canvas node status (one source of truth). */
function mapExecStatus(status: string | undefined): NodeStatus {
  switch (status) {
    case "running":
      return "running";
    case "completed":
      return "complete";
    case "failed":
      return "failed";
    default:
      // queued / cancelled / absent → not yet produced.
      return "idle";
  }
}

const nodeIdFor = (creativeId: string) => `gen-node-${creativeId}`;
const PROMPT_ID = "gen-prompt";
const PUBLISH_ID = "gen-publish";

/** Empty canvas before any generation — honest, no fake workflow. */
const EMPTY_TABS: CanvasTab[] = [
  { id: "tab-empty", name: "Workflow 1", viewport: { ...DEFAULT_VIEWPORT }, nodes: [], edges: [] },
];

/** Build a Prompt → creatives → Publish graph from the active generation. */
function buildGenerationTabs(gen: GenerationResult): CanvasTab[] {
  const creatives = gen.creatives;
  const rowH = 150;
  const colCreatives = 380;
  const spanY = Math.max(0, (creatives.length - 1) * rowH);
  const midY = 60 + spanY / 2;

  const prompt: CanvasNode = {
    id: PROMPT_ID,
    type: "prompt",
    x: 64,
    y: midY,
    width: 216,
    height: 116,
    title: gen.campaignPlan.name,
    status: "complete",
    groupId: null,
  };

  const creativeNodes: CanvasNode[] = creatives.map((c, i) => ({
    id: nodeIdFor(c.id),
    type: c.media.kind === "video" ? "video" : "image",
    x: colCreatives,
    y: 60 + i * rowH,
    width: 216,
    height: 116,
    title: c.title,
    status: mapExecStatus(c.execution?.status),
    groupId: creatives.length > 1 ? "g-creatives" : null,
  }));

  const publish: CanvasNode = {
    id: PUBLISH_ID,
    type: "publish",
    x: colCreatives + 320,
    y: midY,
    width: 216,
    height: 116,
    title: "Publish",
    status: gen.execution.status === "completed" ? "complete" : "idle",
    groupId: null,
  };

  const edges: CanvasEdge[] = [
    ...creativeNodes.map((n) => ({ id: `e-prompt-${n.id}`, source: PROMPT_ID, target: n.id })),
    ...creativeNodes.map((n) => ({ id: `e-${n.id}-publish`, source: n.id, target: PUBLISH_ID })),
  ];

  return [
    {
      id: `gen-${gen.id}`,
      name: "Workflow 1",
      viewport: { ...DEFAULT_VIEWPORT },
      nodes: [prompt, ...creativeNodes, publish],
      edges,
    },
  ];
}

/**
 * Mirror live execution status onto the generation nodes. Guarded: it only
 * dispatches when a node's status actually differs, so it converges to the store
 * state and never loops. User-added nodes and edits are left untouched.
 */
function CanvasGenerationSync({ gen }: { gen: GenerationResult }) {
  const { setStatus, activeTab } = useCanvas();

  useEffect(() => {
    for (const c of gen.creatives) {
      const id = nodeIdFor(c.id);
      const target = mapExecStatus(c.execution?.status);
      const node = activeTab.nodes.find((n) => n.id === id);
      if (node && node.status !== target) setStatus(id, target);
    }
    const publishTarget: NodeStatus = gen.execution.status === "completed" ? "complete" : "idle";
    const publishNode = activeTab.nodes.find((n) => n.id === PUBLISH_ID);
    if (publishNode && publishNode.status !== publishTarget) setStatus(PUBLISH_ID, publishTarget);
  }, [gen, activeTab, setStatus]);

  return null;
}

export function StudioCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const gen = useGeneration();

  // Seed tabs from the active generation; reseed only when the campaign changes
  // (a new gen.id), so live status updates flow through setStatus, not a remount.
  const tabs = useMemo(() => (gen ? buildGenerationTabs(gen) : EMPTY_TABS), [gen?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <CanvasProvider key={gen?.id ?? "empty"} initialTabs={tabs}>
      {gen && <CanvasGenerationSync gen={gen} />}
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
