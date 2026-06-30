"use client";

/** Production Approval Center — ApprovalStatus pill (Sprint 63). */

import { cn } from "@/lib/utils";
import type { ApprovalStatus as ApprovalStatusId } from "./approval-data";

const META: Record<ApprovalStatusId, { label: string; dot: string; chip: string }> = {
  pending: { label: "Pending", dot: "bg-amber-400", chip: "chip-slate" },
  approved: { label: "Approved", dot: "bg-brand", chip: "chip-emerald" },
  rejected: { label: "Rejected", dot: "bg-red-400", chip: "chip-red" },
  "needs-changes": { label: "Needs changes", dot: "bg-amber-400", chip: "chip-slate" },
  scheduled: { label: "Scheduled", dot: "bg-foreground-muted/50", chip: "chip-slate" },
  expired: { label: "Expired", dot: "bg-foreground-muted/30", chip: "chip-slate" },
};

export function ApprovalStatus({ status, className }: { status: ApprovalStatusId; className?: string }) {
  const m = META[status];
  return (
    <span className={cn("chip gap-1.5", m.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
