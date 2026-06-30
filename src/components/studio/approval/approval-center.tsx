"use client";

/**
 * Production Approval Center (Sprint 63).
 *
 * The Marketing Operations Approval Center — not a notification panel. Composes
 * the reusable pieces (summary · toolbar · queue · details) over the approval
 * state, reusing media, employees, the Asset Inspector's forecast/performance,
 * and the Queue vocabulary. Plugs into the Unified Workspace's approval region.
 * Presentation only — decisions are state transitions, no backend.
 */

import { ShieldCheck } from "lucide-react";
import { ApprovalCenterProvider } from "./approval-context";
import { ApprovalSummary } from "./approval-summary";
import { ApprovalToolbar } from "./approval-toolbar";
import { ApprovalQueue } from "./approval-queue";
import { ApprovalDetails } from "./approval-details";
import type { ApprovalItem } from "./approval-data";

function Body() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-1 py-4">
      <header className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          Marketing Operations
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Approval Center</h2>
      </header>

      <ApprovalSummary />
      <ApprovalToolbar />
      <ApprovalQueue />
      <ApprovalDetails />
    </div>
  );
}

export function ApprovalCenter({ source, loading }: { source?: ApprovalItem[]; loading?: boolean }) {
  return (
    <ApprovalCenterProvider source={source} loading={loading}>
      <Body />
    </ApprovalCenterProvider>
  );
}
