"use client";

/**
 * Creative Workflow Engine — node renderer (Sprint 63F).
 *
 * Renders one typed workflow node: header (icon + title + status), and input /
 * output ports for drag-and-drop connections. Driven by the node registry;
 * styled with Studio 2.0 tokens. Presentation only — no business logic.
 */

import { cn } from "@/lib/utils";
import type { CanvasNode } from "./canvas-model";
import { NODE_TYPES, STATUS_META } from "./node-types";

/** AI "thinking" indicator — three staggered pulsing dots (token motion). */
function ThinkingDots() {
  return (
    <span className="flex items-center gap-0.5" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="anim-pulse h-1.5 w-1.5 rounded-full bg-amber-400"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

const STATUS_DOT: Record<string, string> = {
  neutral: "bg-foreground-muted/50",
  positive: "bg-brand",
  running: "bg-amber-400",
  negative: "bg-red-400",
};
const STATUS_CHIP: Record<string, string> = {
  neutral: "chip-slate",
  positive: "chip-emerald",
  running: "chip-slate",
  negative: "chip-red",
};

export function CanvasNodeView({
  node,
  selected,
  onNodePointerDown,
  onPortPointerDown,
  onPortPointerUp,
  onContextMenu,
}: {
  node: CanvasNode;
  selected: boolean;
  onNodePointerDown: (e: React.PointerEvent, node: CanvasNode) => void;
  onPortPointerDown: (e: React.PointerEvent, node: CanvasNode) => void;
  onPortPointerUp: (e: React.PointerEvent, node: CanvasNode) => void;
  onContextMenu: (e: React.MouseEvent, node: CanvasNode) => void;
}) {
  const def = NODE_TYPES[node.type];
  const Icon = def.icon;
  const status = STATUS_META[node.status];
  const running = node.status === "running";

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-pressed={selected}
      aria-label={`${def.label} node${node.title ? `: ${node.title}` : ""}, ${status.label}`}
      onPointerDown={(e) => onNodePointerDown(e, node)}
      onContextMenu={(e) => onContextMenu(e, node)}
      className={cn(
        "studio-card absolute flex cursor-grab select-none flex-col gap-2 p-3 active:cursor-grabbing",
        selected && "studio-glow studio-elevated",
        running && "studio-breathe"
      )}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
    >
      <div className="flex items-center gap-2">
        <div className="studio-tile flex h-7 w-7 items-center justify-center text-foreground-muted">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 truncate type-body font-semibold text-foreground">
          {node.title ?? def.label}
        </span>
        {running ? (
          <ThinkingDots />
        ) : (
          <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status.tone])} aria-hidden />
        )}
      </div>

      <span className="type-eyebrow text-foreground-muted">{def.label}</span>

      <span className={cn("chip mt-auto w-fit", STATUS_CHIP[status.tone])}>{status.label}</span>

      {/* Input port */}
      {def.hasInput && (
        <button
          type="button"
          aria-label="Input port"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => onPortPointerUp(e, node)}
          data-port="in"
          className="studio-focusable absolute left-0 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[hsl(222_44%_6%)] transition-colors hover:border-brand hover:bg-brand/30"
        />
      )}
      {/* Output port */}
      {def.hasOutput && (
        <button
          type="button"
          aria-label="Output port — drag to connect"
          onPointerDown={(e) => onPortPointerDown(e, node)}
          data-port="out"
          className="studio-focusable absolute right-0 top-1/2 h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[hsl(222_44%_6%)] transition-colors hover:border-brand hover:bg-brand/30"
        />
      )}
    </div>
  );
}
