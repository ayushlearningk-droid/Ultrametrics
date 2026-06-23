"use client";

/**
 * Action Queue — Pending Actions surface (Sprint 8 → Sprint 9 integration).
 *
 * Renders the SHARED Action Queue store (src/lib/stores/action-queue.ts): items
 * are enqueued when a user approves an AI recommendation in Ask Ultrametrics.
 * Approve / Dismiss here update the same shared store. UI-only — no persistence,
 * no API, no execution. Reuses the existing card visual language.
 */

import { useEffect, useState } from "react";
import { Check, X, Zap, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useActionQueue,
  setActionStatus,
  hydrateActions,
  type QueuedAction,
  type ActionStatus,
  type ActionPriority,
} from "@/lib/stores/action-queue";

const PRIORITY_STYLE: Record<ActionPriority, string> = {
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

function ActionCard({ action }: { action: QueuedAction }) {
  const decided = action.status !== "pending";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-opacity",
        action.status === "approved"
          ? "border-emerald-400/25 bg-emerald-400/[0.06]"
          : "border-white/[0.08] bg-white/[0.025]",
        action.status === "dismissed" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
              {action.source}
            </span>
            {action.priority && (
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  PRIORITY_STYLE[action.priority]
                )}
              >
                {action.priority} priority
              </span>
            )}
          </div>
          <h3 className="text-[14px] font-semibold leading-snug text-foreground">
            {action.title}
          </h3>
          {action.rationale && (
            <p className="mt-1 text-[12px] leading-relaxed text-foreground-muted">
              {action.rationale}
            </p>
          )}
          {action.expectedImpact && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-emerald-200">
              <Gauge className="h-3.5 w-3.5" />
              {action.expectedImpact}
            </p>
          )}
        </div>

        {decided && (
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium",
              STATUS_STYLE[action.status as Exclude<ActionStatus, "pending">].chip
            )}
          >
            {STATUS_STYLE[action.status as Exclude<ActionStatus, "pending">].label}
          </span>
        )}
      </div>

      {!decided && (
        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setActionStatus(action.id, "dismissed")}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.14] px-3 py-1.5 text-[12px] font-medium text-foreground-muted transition-colors hover:border-white/[0.25] hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => setActionStatus(action.id, "approved")}
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
  const actions = useActionQueue();
  const [loading, setLoading] = useState(true);
  const count = actions.length;

  // Sprint 10F: hydrate from the server on mount so the queue survives reloads.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void hydrateActions().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="h-[18px] w-[18px] text-brand" />
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Action Queue
          </h1>
        </div>
        {count > 0 && (
          <p className="text-[13px] text-foreground-muted">
            {count} Action{count === 1 ? "" : "s"} — review and approve. This is a
            demo surface; no changes are made to any account.
          </p>
        )}
      </header>

      {loading && count === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-6 py-16 text-center">
          <Zap className="mb-3 h-6 w-6 text-foreground-muted" />
          <h2 className="text-[15px] font-semibold text-foreground">
            No approved actions yet
          </h2>
          <p className="mt-1 max-w-sm text-[13px] text-foreground-muted">
            Approve recommendations from Ask Ultrametrics to add them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => (
            <ActionCard key={a.id} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}
