"use client";

/**
 * Infinite Creative Canvas — floating overlays (Sprint 63E).
 *
 * Tool palette · zoom controls · minimap · workspace tabs. Floating glass
 * surfaces (Studio 2.0 tokens) layered over the canvas. Foundation only — pan
 * tool + comments/AI-employee tools are reserved (inert) placeholders.
 */

import {
  MousePointer2,
  Hand,
  StickyNote,
  MessageSquare,
  Bot,
  Plus,
  Minus,
  Maximize2,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "./canvas-context";
import {
  computeFitViewport,
  nodeBounds,
  visibleWorldRect,
  type CanvasTool,
} from "./canvas-model";

/* ── Tool palette (left) ─────────────────────────────────────────────────── */
interface ToolDef {
  id: CanvasTool | "note" | "comment" | "employee";
  label: string;
  icon: LucideIcon;
  active?: boolean;
  reserved?: boolean;
}

export function ToolPalette() {
  const { state, setTool } = useCanvas();
  const tools: ToolDef[] = [
    { id: "select", label: "Select", icon: MousePointer2, active: state.tool === "select" },
    { id: "pan", label: "Pan", icon: Hand, active: state.tool === "pan" },
    { id: "note", label: "Add note", icon: StickyNote, reserved: true },
    { id: "comment", label: "Comment", icon: MessageSquare, reserved: true },
    { id: "employee", label: "AI employee", icon: Bot, reserved: true },
  ];

  return (
    <div className="studio-glass pointer-events-auto absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 p-1.5">
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            aria-label={t.reserved ? `${t.label} (coming soon)` : t.label}
            aria-pressed={t.active ?? undefined}
            aria-disabled={t.reserved || undefined}
            title={t.reserved ? "Coming soon" : t.label}
            onClick={() => {
              if (t.reserved) return;
              if (t.id === "select" || t.id === "pan") setTool(t.id);
            }}
            className={cn(
              "studio-focusable flex h-9 w-9 items-center justify-center rounded-[var(--studio-radius-sm)] transition-colors",
              t.active
                ? "bg-brand/10 text-brand"
                : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground",
              t.reserved && "cursor-default opacity-50"
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>
        );
      })}
    </div>
  );
}

/* ── Zoom controls (bottom-right) ────────────────────────────────────────── */
export function ZoomControls({ size }: { size: { width: number; height: number } }) {
  const { activeTab, zoomBy, setViewport } = useCanvas();
  const pct = Math.round(activeTab.viewport.scale * 100);

  return (
    <div className="studio-glass pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-1 p-1.5">
      <IconBtn label="Zoom out" onClick={() => zoomBy(1 / 1.2, size)}>
        <Minus className="h-4 w-4" />
      </IconBtn>
      <span className="min-w-[3.25rem] text-center type-caption tabular-nums text-foreground-muted">
        {pct}%
      </span>
      <IconBtn label="Zoom in" onClick={() => zoomBy(1.2, size)}>
        <Plus className="h-4 w-4" />
      </IconBtn>
      <IconBtn
        label="Fit to screen"
        onClick={() => setViewport(computeFitViewport(activeTab.nodes, size.width, size.height))}
      >
        <Maximize2 className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="studio-focusable flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
    >
      {children}
    </button>
  );
}

/* ── Minimap (bottom-left) ───────────────────────────────────────────────── */
const MINIMAP_W = 168;
const MINIMAP_H = 112;

export function Minimap({ size }: { size: { width: number; height: number } }) {
  const { activeTab } = useCanvas();
  const vp = activeTab.viewport;
  if (size.width === 0) return null;

  const view = visibleWorldRect(vp, size.width, size.height);
  const bounds = nodeBounds(activeTab.nodes);

  // World extent = union of node bounds and the current view, padded.
  const minX = Math.min(view.x, bounds?.x ?? view.x);
  const minY = Math.min(view.y, bounds?.y ?? view.y);
  const maxX = Math.max(view.x + view.width, bounds ? bounds.x + bounds.width : view.x + view.width);
  const maxY = Math.max(view.y + view.height, bounds ? bounds.y + bounds.height : view.y + view.height);
  const extentW = Math.max(1, maxX - minX);
  const extentH = Math.max(1, maxY - minY);
  const sx = MINIMAP_W / extentW;
  const sy = MINIMAP_H / extentH;

  const toMap = (wx: number, wy: number) => ({ x: (wx - minX) * sx, y: (wy - minY) * sy });
  const viewTL = toMap(view.x, view.y);

  return (
    <div
      aria-hidden
      className="studio-glass pointer-events-none absolute bottom-3 left-3 z-20 overflow-hidden p-0"
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
    >
      {/* nodes */}
      {activeTab.nodes.map((n) => {
        const p = toMap(n.x, n.y);
        return (
          <span
            key={n.id}
            className="absolute rounded-[2px] bg-foreground-muted/50"
            style={{ left: p.x, top: p.y, width: Math.max(2, n.width * sx), height: Math.max(2, n.height * sy) }}
          />
        );
      })}
      {/* viewport rectangle */}
      <span
        className="absolute rounded-[3px] border border-brand/70 bg-brand/10"
        style={{ left: viewTL.x, top: viewTL.y, width: view.width * sx, height: view.height * sy }}
      />
    </div>
  );
}

/* ── Workspace tabs (top) ────────────────────────────────────────────────── */
export function CanvasTabs() {
  const { state, switchTab, addTab, closeTab } = useCanvas();
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1">
      <div className="studio-glass flex items-center gap-1 p-1.5">
        {state.tabs.map((tab) => {
          const active = tab.id === state.activeTabId;
          return (
            <div
              key={tab.id}
              className={cn(
                "group flex items-center gap-1 rounded-[var(--studio-radius-sm)] pl-2.5 pr-1 transition-colors",
                active ? "bg-brand/10" : "hover:bg-white/[0.05]"
              )}
            >
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => switchTab(tab.id)}
                className={cn(
                  "studio-focusable py-1.5 type-caption font-semibold",
                  active ? "text-brand" : "text-foreground-muted hover:text-foreground"
                )}
              >
                {tab.name}
              </button>
              {state.tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={`Close ${tab.name}`}
                  onClick={() => closeTab(tab.id)}
                  className="flex h-5 w-5 items-center justify-center rounded text-foreground-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          aria-label="New canvas tab"
          onClick={addTab}
          className="studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
