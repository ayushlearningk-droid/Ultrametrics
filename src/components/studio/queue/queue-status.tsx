"use client";

/** Production Generation Queue — QueueStatus pill (Sprint 63). */

import { cn } from "@/lib/utils";
import type { QueueStatus as QueueStatusId } from "./queue-data";

const META: Record<QueueStatusId, { label: string; dot: string; chip: string; pulse?: boolean }> = {
  running: { label: "Running", dot: "bg-brand", chip: "chip-emerald", pulse: true },
  queued: { label: "Queued", dot: "bg-foreground-muted/50", chip: "chip-slate" },
  paused: { label: "Paused", dot: "bg-amber-400", chip: "chip-slate" },
  completed: { label: "Completed", dot: "bg-brand", chip: "chip-emerald" },
  failed: { label: "Failed", dot: "bg-red-400", chip: "chip-red" },
  cancelled: { label: "Cancelled", dot: "bg-foreground-muted/30", chip: "chip-slate" },
};

export function QueueStatus({ status, className }: { status: QueueStatusId; className?: string }) {
  const m = META[status];
  return (
    <span className={cn("chip gap-1.5", m.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot, m.pulse && "anim-pulse")} />
      {m.label}
    </span>
  );
}
