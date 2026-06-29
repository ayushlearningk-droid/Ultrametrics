"use client";

/**
 * AI Studio Shell — Right Activity & Approval Rail (Sprint 63I).
 *
 * Reserves Activity Stream · Approval Workflow · Version History · Asset
 * Inspector · Brand Knowledge · Workspace Memory · AI Employees. Collapsible;
 * persistent on ultra-wide, slide-over on smaller (handled by the shell grid).
 * L2 panel. SCOPE: container + reserved slots only — no data, no business logic.
 */

import { Activity, X } from "lucide-react";
import { ShellRegion, ReservedSlot } from "./shell-region";
import { reservedModulesFor } from "./regions";
import { useStudioShell } from "./shell-context";

export function StudioActivityRail() {
  const { toggleRegion } = useStudioShell();

  return (
    <ShellRegion
      id="activity"
      depth="L2"
      as="aside"
      ariaLabel="Activity and approvals"
      className="surface-glass flex h-full w-full flex-col border-l border-white/[0.06]"
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-4">
        <span className="flex items-center gap-2 type-eyebrow text-foreground-muted">
          <Activity className="h-3.5 w-3.5 text-brand" />
          Activity
        </span>
        <button
          type="button"
          onClick={() => toggleRegion("activity")}
          aria-label="Hide activity rail"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {reservedModulesFor("activity").map((m) => (
          <ReservedSlot
            key={m.id}
            label={m.label}
            icon={<Activity className="h-4 w-4" />}
            hint="Reserved"
          />
        ))}
      </div>
    </ShellRegion>
  );
}
