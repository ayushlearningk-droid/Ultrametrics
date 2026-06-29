"use client";

/**
 * Unified Workspace — dock (Sprint 63K).
 *
 * Splits regions across left / center / right zones with resizable side widths,
 * a floating layer, a region toolbar, and keyboard toggles. Drag a panel header
 * to float it; pin it to dock. Studio 2.0 tokens; reduced-motion safe.
 */

import { useCallback, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspacePanel } from "./workspace-panel";
import { REGION_DEFS, useRegions, type RegionState, type Zone } from "./region-manager";

function ResizeHandle({ onResize, side }: { onResize: (dx: number) => void; side: "left" | "right" }) {
  const active = useRef(false);
  const onMove = useCallback((e: PointerEvent) => {
    if (active.current) onResize(e.movementX);
  }, [onResize]);
  const onUp = useCallback(() => {
    active.current = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }, [onMove]);
  const onDown = () => {
    active.current = true;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return (
    <div
      role="separator"
      aria-label={`Resize ${side} panel`}
      onPointerDown={onDown}
      className="group flex w-2 shrink-0 cursor-col-resize items-center justify-center"
    >
      <span className="h-10 w-px rounded bg-white/[0.08] transition-colors group-hover:bg-brand/50" />
    </div>
  );
}

function ZoneColumn({ regions, width }: { regions: RegionState[]; width?: number }) {
  return (
    <div className="flex shrink-0 flex-col gap-3 overflow-y-auto" style={width ? { width } : undefined}>
      {regions.map((r) => (
        <WorkspacePanel key={r.id} region={r} />
      ))}
    </div>
  );
}

export function WorkspaceDock() {
  const { regions, leftW, rightW, setLeftW, setRightW, toggleVisible, reset } = useRegions();
  const leftWRef = useRef(leftW);
  leftWRef.current = leftW;
  const rightWRef = useRef(rightW);
  rightWRef.current = rightW;

  const byZone = (z: Zone) => regions.filter((r) => r.zone === z).sort((a, b) => a.order - b.order);
  const left = byZone("left");
  const center = byZone("center");
  const right = byZone("right");
  const floating = byZone("float");

  // Keyboard: Cmd/Ctrl + 1..8 toggle regions; Cmd/Ctrl + 0 resets layout.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "0") {
        e.preventDefault();
        reset();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= REGION_DEFS.length) {
        e.preventDefault();
        toggleVisible(REGION_DEFS[n - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleVisible, reset]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar — region toggles + reset */}
      <div className="studio-glass flex flex-wrap items-center gap-1.5 p-1.5">
        {REGION_DEFS.map((d) => {
          const r = regions.find((x) => x.id === d.id)!;
          const visible = r.zone !== "hidden";
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleVisible(d.id)}
              aria-pressed={visible}
              className={cn(
                "studio-focusable flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] px-2.5 py-1.5 type-caption transition-colors",
                visible ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {d.title}
            </button>
          );
        })}
        <button
          type="button"
          onClick={reset}
          className="studio-focusable ml-auto flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2.5 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset layout
        </button>
      </div>

      {/* Dock body */}
      <div className="relative flex min-h-[78vh] gap-0">
        {left.length > 0 && <ZoneColumn regions={left} width={leftW} />}
        {left.length > 0 && <ResizeHandle side="left" onResize={(dx) => setLeftW(leftWRef.current + dx)} />}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {center.map((r) => (
            <WorkspacePanel key={r.id} region={r} />
          ))}
          {center.length === 0 && (
            <div className="studio-reserved flex flex-1 items-center justify-center p-8">
              <span className="type-caption text-foreground-muted">Empty zone — toggle a region above.</span>
            </div>
          )}
        </div>

        {right.length > 0 && <ResizeHandle side="right" onResize={(dx) => setRightW(rightWRef.current - dx)} />}
        {right.length > 0 && <ZoneColumn regions={right} width={rightW} />}

        {/* Floating layer */}
        {floating.map((r) => (
          <WorkspacePanel key={r.id} region={r} />
        ))}
      </div>
    </div>
  );
}
