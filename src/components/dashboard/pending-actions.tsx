"use client";

/**
 * Action Queue — Pending Actions surface (Sprint 8, Foundation).
 *
 * A UI-only decision queue rendered from MOCK data. Each action can be Approved
 * or Dismissed via LOCAL state only — no persistence, no API, no Meta/Google
 * calls, no backend. This is the visual foundation for a future, real Action
 * Queue; it reuses the existing card visual language (rounded surface + emerald
 * accents + the Action Center Approve affordance), not a new AiResponse card.
 */

import { useState } from "react";
import { Check, X, Zap, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionStatus = "pending" | "approved" | "dismissed";
type Priority = "High" | "Medium" | "Low";

interface QueuedAction {
  id: string;
  title: string;
  source: string;
  rationale: string;
  expectedImpact: string;
  priority: Priority;
}

/** Demo content only — no data source, no network. */
const MOCK_ACTIONS: QueuedAction[] = [
  {
    id: "a1",
    title: "Scale “Retargeting — Warm Audiences” budget +20%",
    source: "Meta Ads",
    rationale: "ROAS 4.8 vs account avg 3.1, with frequency headroom.",
    expectedImpact: "+8–14% revenue",
    priority: "High",
  },
  {
    id: "a2",
    title: "Pause “Broad Prospecting — V3” ad set",
    source: "Meta Ads",
    rationale: "$1.2k spent at ROAS 0.6 over 14 days; 0 conversions last 7.",
    expectedImpact: "−$1.1k wasted spend",
    priority: "High",
  },
  {
    id: "a3",
    title: "Shift budget: “Search — Brand” → “Search — Non-Brand”",
    source: "Google Ads",
    rationale: "Brand CPA saturated; non-brand losing impression share to budget.",
    expectedImpact: "+5–9% conversions",
    priority: "Medium",
  },
  {
    id: "a4",
    title: "Raise tCPA on “Performance Max — Catalog”",
    source: "Google Ads",
    rationale: "Volume capped below target; CPA running 18% under goal.",
    expectedImpact: "+10–15% conversions",
    priority: "Low",
  },
];

const PRIORITY_STYLE: Record<Priority, string> = {
  High: "border-red-400/25 bg-red-400/[0.08] text-red-300",
  Medium: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  Low: "border-slate-400/25 bg-slate-400/10 text-slate-200",
};

const STATUS_STYLE: Record<
  Exclude<ActionStatus, "pending">,
  { label: string; chip: string }
> = {
  approved: { label: "Approved", chip: "bg-emerald-400/20 text-emerald-200" },
  dismissed: { label: "Dismissed", chip: "bg-white/[0.06] text-foreground-muted" },
};

function ActionCard({
  action,
  status,
  onApprove,
  onDismiss,
}: {
  action: QueuedAction;
  status: ActionStatus;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const decided = status !== "pending";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-opacity",
        status === "approved"
          ? "border-emerald-400/25 bg-emerald-400/[0.06]"
          : "border-white/[0.08] bg-white/[0.025]",
        status === "dismissed" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
              {action.source}
            </span>
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                PRIORITY_STYLE[action.priority]
              )}
            >
              {action.priority} priority
            </span>
          </div>
          <h3 className="text-[14px] font-semibold leading-snug text-foreground">
            {action.title}
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground-muted">
            {action.rationale}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-emerald-200">
            <Gauge className="h-3.5 w-3.5" />
            {action.expectedImpact}
          </p>
        </div>

        {decided && (
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium",
              STATUS_STYLE[status].chip
            )}
          >
            {STATUS_STYLE[status].label}
          </span>
        )}
      </div>

      {!decided && (
        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.14] px-3 py-1.5 text-[12px] font-medium text-foreground-muted transition-colors hover:border-white/[0.25] hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Dismiss
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/15 px-3 py-1.5 text-[12px] font-medium text-emerald-200 transition-colors hover:bg-emerald-400/25"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

export function PendingActions() {
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(() =>
    Object.fromEntries(MOCK_ACTIONS.map((a) => [a.id, "pending" as ActionStatus]))
  );

  const decide = (id: string, status: ActionStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: status }));

  const pendingCount = Object.values(statuses).filter(
    (s) => s === "pending"
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="h-[18px] w-[18px] text-brand" />
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Action Queue
          </h1>
        </div>
        <p className="text-[13px] text-foreground-muted">
          {pendingCount} pending action{pendingCount === 1 ? "" : "s"}. Review and
          approve — this is a demo surface; no changes are made to any account.
        </p>
      </header>

      <div className="space-y-3">
        {MOCK_ACTIONS.map((a) => (
          <ActionCard
            key={a.id}
            action={a}
            status={statuses[a.id]}
            onApprove={() => decide(a.id, "approved")}
            onDismiss={() => decide(a.id, "dismissed")}
          />
        ))}
      </div>
    </div>
  );
}
