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
import { Check, X, Zap, Gauge, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useActionQueue,
  setActionStatus,
  hydrateActions,
  type QueuedAction,
  type ActionStatus,
  type ActionPriority,
} from "@/lib/stores/action-queue";
import { ExecutionDetailsDrawer } from "@/components/dashboard/execution/execution-details-drawer";

// Strict 3-colour system: High = risk (muted red), Medium/Low = neutral (slate).
const PRIORITY_STYLE: Record<ActionPriority, string> = {
  High: "chip chip-red",
  Medium: "chip chip-slate",
  Low: "chip chip-slate",
};

const STATUS_STYLE: Record<
  Exclude<ActionStatus, "pending">,
  { label: string; chip: string }
> = {
  approved: { label: "Approved", chip: "chip chip-emerald" },
  dismissed: { label: "Dismissed", chip: "chip chip-slate" },
};

function ActionCard({
  action,
  onDetails,
}: {
  action: QueuedAction;
  onDetails: (action: QueuedAction) => void;
}) {
  const decided = action.status !== "pending";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-opacity",
        action.status === "approved"
          ? "border-brand/25 bg-brand/[0.06]"
          : "card",
        action.status === "dismissed" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="chip chip-slate uppercase">{action.source}</span>
            {action.priority && (
              <span className={PRIORITY_STYLE[action.priority]}>
                {action.priority} priority
              </span>
            )}
          </div>
          <h3 className="type-body font-semibold leading-snug text-foreground">
            {action.title}
          </h3>
          {action.rationale && (
            <p className="mt-1 type-caption leading-relaxed text-foreground-muted">
              {action.rationale}
            </p>
          )}
          {action.expectedImpact && (
            <p className="mt-1.5 inline-flex items-center gap-1 type-caption font-semibold text-brand">
              <Gauge className="h-3.5 w-3.5" />
              {action.expectedImpact}
            </p>
          )}
        </div>

        {decided && (
          <span
            className={
              STATUS_STYLE[action.status as Exclude<ActionStatus, "pending">]
                .chip
            }
          >
            {STATUS_STYLE[action.status as Exclude<ActionStatus, "pending">].label}
          </span>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        {/* Details — opens the Execution Details drawer (approved actions only). */}
        {action.status === "approved" ? (
          <button
            type="button"
            onClick={() => onDetails(action)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] px-3 py-1.5 type-caption font-semibold text-foreground-muted transition-colors hover:border-white/[0.25] hover:text-foreground"
          >
            <Activity className="h-3.5 w-3.5" />
            Execution details
          </button>
        ) : (
          <span />
        )}

        {!decided && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActionStatus(action.id, "dismissed")}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.14] px-3 py-1.5 type-caption font-semibold text-foreground-muted transition-colors hover:border-white/[0.25] hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => setActionStatus(action.id, "approved")}
              className="inline-flex items-center gap-1 rounded-lg bg-brand/15 px-3 py-1.5 type-caption font-semibold text-brand transition-colors hover:bg-brand/25"
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PendingActions() {
  const actions = useActionQueue();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueuedAction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const count = actions.length;

  const openDetails = (action: QueuedAction) => {
    setSelected(action);
    setDrawerOpen(true);
  };

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
          <Zap className="h-5 w-5 text-brand" />
          <h1 className="type-display text-foreground">Action Queue</h1>
        </div>
        {count > 0 && (
          <p className="type-body text-foreground-muted">
            {count} action{count === 1 ? "" : "s"} — review, approve, and open
            execution details to run a dry run.
          </p>
        )}
      </header>

      {loading && count === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="card h-24 animate-pulse"
            />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <Zap className="mb-3 h-6 w-6 text-foreground-muted" />
          <h2 className="type-body font-semibold text-foreground">
            No approved actions yet
          </h2>
          <p className="mt-1 max-w-sm type-caption text-foreground-muted">
            Approve recommendations from Ask Ultrametrics to add them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => (
            <ActionCard key={a.id} action={a} onDetails={openDetails} />
          ))}
        </div>
      )}

      <ExecutionDetailsDrawer
        action={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
