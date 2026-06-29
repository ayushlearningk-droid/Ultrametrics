"use client";

/**
 * Creative Workflow Engine — context menu (Sprint 63F).
 *
 * Foundation context menu: node actions (duplicate/copy/delete), graph actions
 * (paste/auto-layout), and an "Add node" section driven by the node registry —
 * so adding a node type to the catalog adds it here automatically. Presentation
 * + interaction only; no business logic.
 */

import { useEffect } from "react";
import { Copy, CopyPlus, Trash2, ClipboardPaste, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "./canvas-context";
import { snapToGrid, type CanvasNode } from "./canvas-model";
import { NODE_TYPE_LIST, NODE_TYPES } from "./node-types";

function MenuItem({
  label,
  icon,
  onClick,
  disabled,
  shortcut,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "studio-focusable flex w-full items-center gap-2 rounded-[var(--studio-radius-sm)] px-2.5 py-1.5 text-left transition-colors",
        disabled
          ? "cursor-default text-foreground-muted/40"
          : "text-foreground/90 hover:bg-white/[0.05] hover:text-foreground"
      )}
    >
      {icon && <span className="text-foreground-muted">{icon}</span>}
      <span className="flex-1 type-caption">{label}</span>
      {shortcut && <span className="type-caption text-foreground-muted">{shortcut}</span>}
    </button>
  );
}

export function CanvasContextMenu({
  x,
  y,
  nodeId,
  onClose,
}: {
  x: number;
  y: number;
  nodeId: string | null;
  onClose: () => void;
}) {
  const c = useCanvas();
  const hasSelection = c.state.selectedIds.length > 0;
  const canPaste = (c.state.clipboard?.nodes.length ?? 0) > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const addNodeAt = (type: CanvasNode["type"]) => {
    const vp = c.activeTab.viewport;
    const def = NODE_TYPES[type];
    const wx = snapToGrid((x - vp.x) / vp.scale);
    const wy = snapToGrid((y - vp.y) / vp.scale);
    c.addNode({
      id: `n-${Date.now().toString(36)}`,
      type,
      x: wx,
      y: wy,
      width: def.width,
      height: def.height,
      status: "idle",
      groupId: null,
    });
    onClose();
  };

  return (
    <>
      {/* click-away backdrop */}
      <div className="fixed inset-0 z-30" onPointerDown={onClose} aria-hidden />
      <div
        role="menu"
        className="studio-surface-raised absolute z-40 flex max-h-[70vh] w-52 flex-col gap-0.5 overflow-y-auto p-1.5"
        style={{ left: x, top: y }}
      >
        {nodeId && (
          <>
            <MenuItem label="Duplicate" icon={<CopyPlus className="h-3.5 w-3.5" />} shortcut="⌘D" onClick={() => run(c.duplicateSelected)} />
            <MenuItem label="Copy" icon={<Copy className="h-3.5 w-3.5" />} shortcut="⌘C" onClick={() => run(c.copy)} disabled={!hasSelection} />
            <MenuItem label="Delete" icon={<Trash2 className="h-3.5 w-3.5" />} shortcut="⌫" onClick={() => run(c.deleteSelected)} />
            <div className="my-1 h-px bg-white/[0.06]" />
          </>
        )}
        <MenuItem label="Paste" icon={<ClipboardPaste className="h-3.5 w-3.5" />} shortcut="⌘V" onClick={() => run(c.paste)} disabled={!canPaste} />
        <MenuItem label="Auto-layout" icon={<LayoutGrid className="h-3.5 w-3.5" />} onClick={() => run(c.autoLayout)} />
        <div className="my-1 h-px bg-white/[0.06]" />
        <p className="px-2.5 py-1 type-eyebrow text-foreground-muted">Add node</p>
        {NODE_TYPE_LIST.map((def) => (
          <MenuItem
            key={def.type}
            label={def.label}
            icon={<def.icon className="h-3.5 w-3.5" />}
            onClick={() => addNodeAt(def.type)}
          />
        ))}
      </div>
    </>
  );
}
