"use client";

/**
 * Unified Workspace — panel chrome (Sprint 63K).
 *
 * One reusable panel for every region: collapsible, floatable (draggable +
 * resizable), dockable, closable. Studio 2.0 tokens; reduced-motion safe.
 */

import { useCallback, useRef } from "react";
import { ChevronDown, ChevronUp, PictureInPicture2, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RegionContent } from "./region-content";
import { useRegions, type RegionState } from "./region-manager";

export function WorkspacePanel({ region }: { region: RegionState }) {
  const { defOf, toggleCollapse, toggleVisible, setZone, setFloat } = useRegions();
  const def = defOf(region.id);
  const Icon = def.icon;
  const floating = region.zone === "float";
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; ow: number; oh: number } | null>(null);

  /* ── Floating drag ── */
  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setFloat(region.id, { x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
    },
    [region.id, setFloat]
  );
  const onDragUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
  }, [onDragMove]);
  const startDrag = (e: React.PointerEvent) => {
    if (!floating) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: region.float.x, oy: region.float.y };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp);
  };

  /* ── Floating resize ── */
  const onResizeMove = useCallback(
    (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      setFloat(region.id, {
        w: Math.max(280, r.ow + (e.clientX - r.x)),
        h: Math.max(200, r.oh + (e.clientY - r.y)),
      });
    },
    [region.id, setFloat]
  );
  const onResizeUp = useCallback(() => {
    resizeRef.current = null;
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", onResizeUp);
  }, [onResizeMove]);
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeRef.current = { x: e.clientX, y: e.clientY, ow: region.float.w, oh: region.float.h };
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", onResizeUp);
  };

  return (
    <section
      aria-label={def.title}
      className={cn(
        "studio-surface-raised flex flex-col overflow-hidden",
        floating && "shadow-floating absolute z-30"
      )}
      style={floating ? { left: region.float.x, top: region.float.y, width: region.float.w, height: region.float.h } : undefined}
    >
      {/* Header */}
      <header
        onPointerDown={startDrag}
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2",
          floating && "cursor-grab active:cursor-grabbing"
        )}
      >
        <Icon className="h-3.5 w-3.5 text-brand" />
        <span className="flex-1 type-eyebrow text-foreground-muted">{def.title}</span>

        <PanelBtn label={region.collapsed ? "Expand" : "Collapse"} onClick={() => toggleCollapse(region.id)}>
          {region.collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </PanelBtn>
        <PanelBtn
          label={floating ? "Dock" : "Float"}
          onClick={() => setZone(region.id, floating ? "center" : "float")}
        >
          {floating ? <Pin className="h-3.5 w-3.5" /> : <PictureInPicture2 className="h-3.5 w-3.5" />}
        </PanelBtn>
        <PanelBtn label="Close" onClick={() => toggleVisible(region.id)}>
          <X className="h-3.5 w-3.5" />
        </PanelBtn>
      </header>

      {/* Body */}
      {!region.collapsed && (
        <div className={cn("min-h-0 flex-1 overflow-auto p-2", !floating && "max-h-[72vh]")}>
          <RegionContent id={region.id} />
        </div>
      )}

      {/* Floating resize handle */}
      {floating && !region.collapsed && (
        <button
          type="button"
          aria-label="Resize panel"
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        >
          <span className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-white/30" />
        </button>
      )}
    </section>
  );
}

function PanelBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="studio-focusable flex h-6 w-6 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
    >
      {children}
    </button>
  );
}
