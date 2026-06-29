"use client";

/**
 * AI Studio Shell — Center Infinite Workspace container (Sprint 63I).
 *
 * The canvas-ready stage. Reserves the Infinite Canvas / Prompt Workspace /
 * Creative Timeline / Real-time Collaboration modules. Renders page content
 * (children) when present; otherwise shows reserved-module placeholders. L1.
 *
 * SCOPE: container only — NO canvas engine, no interactions. The dotted-grid
 * field signals the future infinite canvas; future modules mount here without a
 * shell change.
 */

import { LayoutGrid } from "lucide-react";
import { ShellRegion, ReservedSlot } from "./shell-region";
import { reservedModulesFor } from "./regions";

export function StudioWorkspaceRegion({ children }: { children?: React.ReactNode }) {
  const hasContent = Boolean(children);

  return (
    <ShellRegion
      id="workspace"
      depth="L1"
      as="main"
      ariaLabel="Workspace"
      className="relative flex-1 overflow-auto"
    >
      {/* Canvas-ready field: dotted grid signals the future infinite canvas. */}
      <div
        className="min-h-full w-full"
        style={
          hasContent
            ? undefined
            : {
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }
        }
      >
        {hasContent ? (
          children
        ) : (
          <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 py-16">
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {reservedModulesFor("workspace").map((m) => (
                <ReservedSlot
                  key={m.id}
                  label={m.label}
                  icon={<LayoutGrid className="h-4 w-4" />}
                  hint="Reserved"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ShellRegion>
  );
}
