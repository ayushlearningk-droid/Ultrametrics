"use client";

/**
 * Production Approval Center — ApprovalQueue (Sprint 63).
 * The list of approval items with loading skeletons + empty state + sentinel.
 */

import { Inbox } from "lucide-react";
import { useApproval } from "./approval-context";
import { ApprovalItem } from "./approval-item";

function Skeletons() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="studio-card flex items-center gap-3 p-2.5">
          <span className="studio-skeleton aspect-video w-20 rounded-[var(--studio-radius-md)]" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="studio-skeleton h-4 w-1/3 rounded" />
            <span className="studio-skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApprovalQueue() {
  const { items, loading } = useApproval();
  if (loading) return <Skeletons />;
  if (items.length === 0) {
    return (
      <div className="studio-card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="studio-tile flex h-12 w-12 items-center justify-center text-foreground-muted">
          <Inbox className="h-5 w-5" />
        </div>
        <p className="type-body font-semibold text-foreground">Nothing to review here</p>
        <p className="type-caption text-foreground-muted">Adjust the filter or clear your search.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2" data-virtualize="false">
      {items.map((item) => (
        <ApprovalItem key={item.id} item={item} />
      ))}
      <div data-infinite-scroll-sentinel aria-hidden />
    </div>
  );
}
