"use client";

/**
 * Production Approval Center — ApprovalTimeline (Sprint 63).
 * The approval stage trail, derived from the item status.
 */

import { Check, X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApprovalItem } from "./approval-context";
import type { ApprovalStatus } from "./approval-data";

const STEPS = ["Submitted", "Brand check", "Review", "Decision"];

function doneCount(status: ApprovalStatus): number {
  switch (status) {
    case "approved":
    case "rejected":
      return 4;
    case "needs-changes":
    case "pending":
    case "expired":
      return 2;
    case "scheduled":
      return 1;
    default:
      return 0;
  }
}

export function ApprovalTimeline({ id }: { id: string }) {
  const item = useApprovalItem(id);
  if (!item) return null;
  const done = doneCount(item.status);
  const rejected = item.status === "rejected";

  return (
    <ol className="flex flex-col gap-1.5">
      {STEPS.map((label, i) => {
        const complete = i < done;
        const isDecision = i === 3;
        const current = i === done && (item.status === "pending" || item.status === "needs-changes");
        const failed = isDecision && rejected;
        return (
          <li key={label} className="flex items-center gap-2">
            {failed ? (
              <X className="h-3.5 w-3.5 text-red-400" />
            ) : complete ? (
              <Check className="h-3.5 w-3.5 text-brand" />
            ) : (
              <Circle className={cn("h-3.5 w-3.5", current ? "text-amber-400" : "text-foreground-muted/40")} />
            )}
            <span className={cn("type-caption", failed ? "text-red-400" : complete ? "text-foreground/90" : current ? "text-amber-400" : "text-foreground-muted")}>
              {label}
              {current && " · in progress"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
