"use client";

/**
 * AI Studio Shell — Bottom AI Dock (Sprint 63I).
 *
 * Reserves the Live Generation Queue + Multi-provider Generation surfaces and
 * future quick-create affordances. Slim, collapsible. L3 AI surface. SCOPE:
 * container + reserved slots only — NO generation, no providers, no business
 * logic. Distinct from the global Ask command bar (no duplication of function).
 */

import { Layers, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShellRegion, ReservedSlot } from "./shell-region";
import { reservedModulesFor } from "./regions";
import { useStudioShell } from "./shell-context";

export function StudioAiDock() {
  const { toggleRegion, isCollapsed } = useStudioShell();
  const collapsed = isCollapsed("dock");

  return (
    <ShellRegion
      id="dock"
      depth="L3"
      as="footer"
      ariaLabel="AI dock"
      className="surface-ai shrink-0 border-t border-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <span className="flex items-center gap-2 type-eyebrow text-foreground-muted">
          <Layers className="h-3.5 w-3.5 text-brand" />
          AI Dock
        </span>
        <button
          type="button"
          onClick={() => toggleRegion("dock")}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand AI dock" : "Collapse AI dock"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={cn(
          "grid gap-3 overflow-hidden px-4 transition-all",
          collapsed ? "max-h-0 pb-0 opacity-0" : "max-h-40 pb-3 opacity-100",
          "grid-cols-1 sm:grid-cols-2"
        )}
      >
        {reservedModulesFor("dock").map((m) => (
          <ReservedSlot
            key={m.id}
            label={m.label}
            icon={<Layers className="h-4 w-4" />}
            hint="Reserved"
            className="py-4"
          />
        ))}
      </div>
    </ShellRegion>
  );
}
