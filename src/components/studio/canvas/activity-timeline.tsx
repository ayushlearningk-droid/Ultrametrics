"use client";

/**
 * Living Canvas — activity timeline foundation (Sprint 63G).
 *
 * A slim, collapsible bottom-center strip reserving the live activity stream
 * (what the AI did / is doing). Foundation only — reserved placeholder entries,
 * no data, no logic. Studio 2.0 tokens; reduced-motion safe.
 */

import { useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const RESERVED_ENTRIES = [
  "Activity stream",
  "Execution events",
  "Approvals",
];

export function ActivityTimeline() {
  const [open, setOpen] = useState(false);

  return (
    <div className="studio-glass pointer-events-auto absolute bottom-3 left-1/2 z-20 -translate-x-1/2 p-1.5">
      <div className="flex items-center gap-2 px-1.5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Activity className="h-3.5 w-3.5 text-brand" />
          Activity
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-pressed={open}
          aria-label={open ? "Collapse activity" : "Expand activity"}
          className="studio-focusable flex h-6 w-6 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div
        className={cn(
          "grid overflow-hidden transition-all",
          open ? "mt-1.5 max-h-40 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 px-1.5 pb-1">
          {RESERVED_ENTRIES.map((e) => (
            <div
              key={e}
              className="studio-reserved flex items-center gap-2 px-2.5 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted/40" />
              <span className="type-caption text-foreground-muted">{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
