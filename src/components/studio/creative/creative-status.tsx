"use client";

/**
 * Production Creative Browser — CreativeStatus (Sprint 63).
 * A real status pill (generated / pending / approved / archived). Token-based.
 */

import { cn } from "@/lib/utils";
import type { CreativeStatusId } from "./creative-data";

const STATUS: Record<CreativeStatusId, { label: string; dot: string; chip: string }> = {
  generated: { label: "Generated", dot: "bg-foreground-muted/50", chip: "chip-slate" },
  pending: { label: "Pending", dot: "bg-amber-400", chip: "chip-slate" },
  approved: { label: "Approved", dot: "bg-brand", chip: "chip-emerald" },
  archived: { label: "Archived", dot: "bg-foreground-muted/30", chip: "chip-slate" },
};

export function CreativeStatus({ status, className }: { status: CreativeStatusId; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("chip gap-1.5", s.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
