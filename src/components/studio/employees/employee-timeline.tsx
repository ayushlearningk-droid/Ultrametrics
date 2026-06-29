"use client";

/**
 * AI Employees Runtime — event timeline (Sprint 63H).
 *
 * Deterministic, timestamped record of runtime events (task start / complete /
 * run complete). Studio 2.0 tokens; reduced-motion safe.
 */

import { CircleDot, CheckCircle2, Flag } from "lucide-react";
import { useEmployees } from "./employees-context";
import type { TimelineKind } from "./types";

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour12: false });
}

function KindIcon({ kind }: { kind: TimelineKind }) {
  if (kind === "complete") return <CheckCircle2 className="h-3.5 w-3.5 text-brand" />;
  if (kind === "run-complete") return <Flag className="h-3.5 w-3.5 text-brand" />;
  return <CircleDot className="h-3.5 w-3.5 text-foreground-muted" />;
}

export function EmployeeTimeline() {
  const { timeline } = useEmployees();

  return (
    <div className="studio-glass flex max-h-44 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <span className="type-eyebrow text-foreground-muted">Timeline</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {timeline.length === 0 ? (
          <p className="px-2 py-1 type-caption text-foreground-muted">No events yet.</p>
        ) : (
          timeline.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 rounded-[var(--studio-radius-sm)] px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
            >
              <KindIcon kind={e.kind} />
              <span className="type-caption text-foreground/90">{e.text}</span>
              <span className="ml-auto rounded bg-white/[0.04] px-1.5 py-0.5 type-caption tabular-nums text-foreground-muted">
                {timeLabel(e.at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
