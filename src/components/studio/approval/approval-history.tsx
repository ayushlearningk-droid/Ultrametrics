"use client";

/**
 * Production Approval Center — ApprovalHistory (Sprint 63).
 * The decision/audit trail for an item. Future audit-log seam.
 */

import { History, CircleDot } from "lucide-react";
import type { ApprovalItem } from "./approval-data";

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ApprovalHistory({ item }: { item: ApprovalItem }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="flex items-center gap-2 type-eyebrow text-foreground-muted">
        <History className="h-3.5 w-3.5 text-brand" /> Decision history
      </h4>
      <ol className="flex flex-col gap-1.5">
        {item.history.map((e) => (
          <li key={e.id} className="flex items-center gap-2">
            <CircleDot className="h-3 w-3 text-foreground-muted" />
            <span className="type-caption text-foreground/90">{e.text}</span>
            <span className="ml-auto type-caption tabular-nums text-foreground-muted">{timeLabel(e.at)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
