"use client";

/**
 * Production Approval Center — ApprovalActions (Sprint 63).
 * Approve · Reject · Request changes · Assign reviewer · Schedule · Details.
 * Decisions mutate presentation state. Keyboard + focus.
 */

import { Check, X, MessageSquareWarning, UserPlus, CalendarClock, Eye, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApproval } from "./approval-context";
import type { ApprovalItem } from "./approval-data";

function Btn({ icon: Icon, label, onClick, tone }: { icon: LucideIcon; label: string; onClick: () => void; tone?: "brand" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.06]",
        tone === "brand" ? "hover:text-brand" : tone === "danger" ? "hover:text-red-400" : "hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function ApprovalActions({ item }: { item: ApprovalItem }) {
  const { approve, reject, requestChanges, assignReviewer, schedule, setSelectedId } = useApproval();
  const terminal = item.status === "approved" || item.status === "rejected" || item.status === "expired";
  return (
    <div className="flex items-center gap-0.5">
      {!terminal && (
        <>
          <Btn icon={Check} label="Approve" tone="brand" onClick={() => approve(item.id)} />
          <Btn icon={X} label="Reject" tone="danger" onClick={() => reject(item.id)} />
          <Btn icon={MessageSquareWarning} label="Request changes" onClick={() => requestChanges(item.id)} />
          <Btn icon={UserPlus} label="Assign reviewer" onClick={() => assignReviewer(item.id)} />
          <Btn icon={CalendarClock} label="Schedule approval" onClick={() => schedule(item.id)} />
        </>
      )}
      <Btn icon={Eye} label="View details" onClick={() => setSelectedId(item.id)} />
    </div>
  );
}
