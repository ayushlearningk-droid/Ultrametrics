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
  Sparkles,
  Plus,
  Minus,
  Maximize2,
  Undo2,
  Redo2,
  LayoutGrid,
  Trash2,
  CopyPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReservedSlot } from "@/components/studio/shell/shell-region";
import { useCanvas } from "./canvas-context";
import {
  computeFitViewport,
  nodeBounds,
  visibleWorldRect,
  type CanvasTool,
} from "./canvas-model";
import { NODE_TYPES, STATUS_META, type NodeStatus } from "./node-types";

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
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "studio-focusable flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] transition-colors",
        disabled
          ? "cursor-default text-foreground-muted/40"
          : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
      )}
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
      {/* nodes (running nodes pulse) */}
      {activeTab.nodes.map((n) => {
        const p = toMap(n.x, n.y);
        const running = n.status === "running";
        return (
          <span
            key={n.id}
            className={cn(
              "absolute rounded-[2px]",
              running ? "anim-pulse bg-brand" : "bg-foreground-muted/50"
            )}
            style={{ left: p.x, top: p.y, width: Math.max(2, n.width * sx), height: Math.max(2, n.height * sy) }}
          />
        );
      })}
      {/* viewport rectangle (eased) */}
      <span
        className="absolute rounded-[3px] border border-brand/70 bg-brand/10 transition-all duration-200 ease-out motion-reduce:transition-none"
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

/* ── History + graph controls (top-left) ─────────────────────────────────── */
export function HistoryControls() {
  const { canUndo, canRedo, undo, redo, autoLayout } = useCanvas();
  return (
    <div className="studio-glass pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-1 p-1.5">
      <IconBtn label="Undo" onClick={undo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Redo" onClick={redo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </IconBtn>
      <span className="mx-0.5 h-5 w-px bg-white/[0.08]" />
      <IconBtn label="Auto-layout" onClick={autoLayout}>
        <LayoutGrid className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

/* ── Inspector (right) — property panel + AI inspector hooks ──────────────── */
export function CanvasInspector() {
  const { state, activeTab, setStatus, duplicateSelected, deleteSelected } = useCanvas();
  const selected = activeTab.nodes.filter((n) => state.selectedIds.includes(n.id));

  return (
    <aside
      aria-label="Inspector"
      className="studio-surface-raised pointer-events-auto absolute right-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-64 flex-col overflow-y-auto p-3"
    >
      <span className="flex items-center gap-2 type-eyebrow text-foreground-muted">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        Inspector
      </span>

      {selected.length === 0 ? (
        <p className="mt-3 type-caption text-foreground-muted">
          Select a node to inspect its properties.
        </p>
      ) : selected.length === 1 ? (
        <SingleNodeInspector node={selected[0]} onStatus={setStatus} />
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="type-body font-semibold text-foreground">
            {selected.length} nodes selected
          </p>
          <div className="flex gap-2">
            <InspectorAction icon={<CopyPlus className="h-3.5 w-3.5" />} label="Duplicate" onClick={duplicateSelected} />
            <InspectorAction icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" onClick={deleteSelected} />
          </div>
        </div>
      )}

      {/* Reserved future module mounts (no logic this sprint). */}
      <div className="mt-4 flex flex-col gap-3">
        <ReservedSlot label="AI Inspector" hint="Reserved" />
        <ReservedSlot label="Provider settings" hint="Reserved" />
      </div>
    </aside>
  );
}

const STATUS_ORDER: NodeStatus[] = ["idle", "running", "complete", "failed"];

function SingleNodeInspector({
  node,
  onStatus,
}: {
  node: ReturnType<typeof useCanvas>["activeTab"]["nodes"][number];
  onStatus: (id: string, status: NodeStatus) => void;
}) {
  const def = NODE_TYPES[node.type];
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="studio-tile flex h-8 w-8 items-center justify-center text-foreground-muted">
          <def.icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate type-body font-semibold text-foreground">{node.title ?? def.label}</p>
          <p className="type-caption text-foreground-muted">{def.label}</p>
        </div>
      </div>

      <Row label="Position" value={`${Math.round(node.x)}, ${Math.round(node.y)}`} />
      <Row label="Size" value={`${node.width} × ${node.height}`} />

      <div className="flex flex-col gap-1.5">
        <span className="type-caption text-foreground-muted">Status</span>
        <div className="grid grid-cols-2 gap-1.5">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatus(node.id, s)}
              aria-pressed={node.status === s}
              className={cn(
                "studio-focusable rounded-[var(--studio-radius-sm)] px-2 py-1 type-caption transition-colors",
                node.status === s
                  ? "bg-brand/10 text-brand"
                  : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="type-caption text-foreground-muted">{label}</span>
      <span className="type-caption tabular-nums text-foreground/90">{value}</span>
    </div>
  );
}

function InspectorAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="studio-focusable flex flex-1 items-center justify-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
    >
      {icon}
      {label}
    </button>
  );
}
