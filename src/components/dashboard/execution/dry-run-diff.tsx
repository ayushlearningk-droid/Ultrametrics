"use client";

/**
 * Dry Run Diff panel (Sprint 15).
 *
 * Presentational before/after for an action's structured target. Pure UI: it
 * derives the expected change from the action's action_type + params (the same
 * fields the executor would send) and renders a human-readable summary with the
 * changed field highlighted. No backend call — this is the "what would happen"
 * preview shown for a dry-run. Strict 3-colour system (emerald/red/slate).
 */

import type { ActionType } from "@/lib/stores/action-queue";

export interface DiffField {
  name: string;
  before: string;
  after: string;
  changed: boolean;
}

export interface ActionDiff {
  summary: string;
  fields: DiffField[];
}

/** Minor-unit currency → readable string (best-effort; no FX). */
function money(minor: unknown): string {
  if (typeof minor !== "number") return "—";
  return (minor / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/** Derive the expected diff from an action's structured target. */
export function computeActionDiff(
  actionType: ActionType | null | undefined,
  params: Record<string, unknown> | null | undefined
): ActionDiff {
  switch (actionType) {
    case "PAUSE_CAMPAIGN":
      return {
        summary: "Campaign will be paused — it stops delivering immediately.",
        fields: [
          { name: "Status", before: "Active", after: "Paused", changed: true },
        ],
      };
    case "RESUME_CAMPAIGN":
      return {
        summary: "Campaign will resume — delivery restarts under its current settings.",
        fields: [
          { name: "Status", before: "Paused", after: "Active", changed: true },
        ],
      };
    case "ADJUST_BUDGET": {
      const after = money(
        (params as { daily_budget_minor?: unknown } | null)?.daily_budget_minor
      );
      return {
        summary: `Daily budget will change to ${after}.`,
        fields: [
          { name: "Daily budget", before: "—", after, changed: true },
        ],
      };
    }
    default:
      return {
        summary: "No structured change is available to preview for this action.",
        fields: [],
      };
  }
}

export function DryRunDiff({
  actionType,
  params,
}: {
  actionType: ActionType | null | undefined;
  params: Record<string, unknown> | null | undefined;
}) {
  const diff = computeActionDiff(actionType, params);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        Dry run · expected change
      </div>
      <p className="mt-2 type-body text-foreground/90">{diff.summary}</p>

      {diff.fields.length > 0 && (
        <div className="mt-3 space-y-2">
          {diff.fields.map((f) => (
            <div key={f.name} className="card-muted px-3 py-2.5">
              <div className="type-caption text-foreground-muted">{f.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="type-body text-foreground-muted line-through">
                  {f.before}
                </span>
                <span className="text-foreground-muted">→</span>
                <span
                  className={
                    f.changed
                      ? "type-body font-semibold text-brand"
                      : "type-body text-foreground"
                  }
                >
                  {f.after}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 type-caption text-foreground-muted">
        Preview only — no account is changed during a dry run.
      </p>
    </div>
  );
}
