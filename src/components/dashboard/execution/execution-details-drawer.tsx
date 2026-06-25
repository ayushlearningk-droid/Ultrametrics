"use client";

/**
 * Execution Details drawer (Sprint 15 · rollback added Sprint 17).
 *
 * Right-side slide-over for one action's execution experience. Reads the real
 * backend (GET /executions, GET /audit) and can trigger a run (POST /execute —
 * dry-run unless ENABLE_ACTION_EXECUTION is set server-side). Shows status,
 * duration, provider, request id, retry count, the Dry Run Diff, and the Action
 * Timeline (audit events). When a succeeded real execution can be reversed, a
 * functional Rollback control (POST /rollback) with a confirm step is shown.
 * Design tokens only; motion from src/lib/motion.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Play, Undo2, Loader2, Copy, Check } from "lucide-react";
import { fadeIn, DUR, EASE_OUT } from "@/lib/motion";
import type { QueuedAction } from "@/lib/stores/action-queue";
import type { ActionExecutionRow, ActionAuditLogRow } from "@/types/database";
import { ActionTimeline } from "@/components/dashboard/execution/action-timeline";
import { DryRunDiff } from "@/components/dashboard/execution/dry-run-diff";
import { isReversible } from "@/lib/actions/inverse";

type ExecState = ActionExecutionRow["state"];
type RollbackPhase = "idle" | "confirming" | "running" | "done" | "failed";

const STATE_CHIP: Record<ExecState, { label: string; chip: string }> = {
  not_requested: { label: "Not requested", chip: "chip chip-slate" },
  queued: { label: "Queued", chip: "chip chip-slate" },
  validating: { label: "Validating", chip: "chip chip-slate" },
  running: { label: "Running", chip: "chip chip-emerald" },
  succeeded: { label: "Succeeded", chip: "chip chip-emerald" },
  failed: { label: "Failed", chip: "chip chip-red" },
  cancelled: { label: "Cancelled", chip: "chip chip-slate" },
  rollback_requested: { label: "Rollback requested", chip: "chip chip-slate" },
  rolling_back: { label: "Rolling back", chip: "chip chip-emerald" },
  rolled_back: { label: "Rolled back", chip: "chip chip-slate" },
  rollback_failed: { label: "Rollback failed", chip: "chip chip-red" },
};

/** Human-friendly execution duration ("428 ms" / "1.2 s" / "—"). */
function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card-muted px-3 py-2.5">
      <div className="type-caption text-foreground-muted">{label}</div>
      <div className="mt-0.5 type-body font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function ExecutionDetailsDrawer({
  action,
  open,
  onClose,
}: {
  action: QueuedAction | null;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [executions, setExecutions] = useState<ActionExecutionRow[]>([]);
  const [audit, setAudit] = useState<ActionAuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  // Sprint 17: rollback flow state.
  const [rollbackPhase, setRollbackPhase] = useState<RollbackPhase>("idle");
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const actionId = action?.id ?? null;
  // Generation guard: a slow in-flight refresh from a previous action must not
  // overwrite the current action's data when it resolves out of order.
  const refreshGen = useRef(0);

  const refresh = useCallback(async () => {
    if (!actionId) return;
    const gen = ++refreshGen.current;
    setLoading(true);
    try {
      const [ex, au] = await Promise.all([
        fetch(`/api/actions/${actionId}/executions`).then((r) =>
          r.ok ? r.json() : { executions: [] }
        ),
        fetch(`/api/actions/${actionId}/audit`).then((r) =>
          r.ok ? r.json() : { audit: [] }
        ),
      ]);
      if (gen !== refreshGen.current) return; // superseded by a newer refresh
      setExecutions((ex.executions ?? []) as ActionExecutionRow[]);
      setAudit((au.audit ?? []) as ActionAuditLogRow[]);
    } finally {
      if (gen === refreshGen.current) setLoading(false);
    }
  }, [actionId]);

  // Clear stale data when the target action changes, then refresh — so the
  // drawer never briefly shows a previous action's executions/audit.
  useEffect(() => {
    setExecutions([]);
    setAudit([]);
    setRollbackPhase("idle");
    setRollbackReason("");
    setRollbackError(null);
    if (open && actionId) void refresh();
  }, [open, actionId, refresh]);

  // Accessibility: close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runExecute = useCallback(async () => {
    if (!actionId || running) return;
    setRunning(true);
    try {
      await fetch(`/api/actions/${actionId}/execute`, { method: "POST" });
      await refresh();
    } finally {
      setRunning(false);
    }
  }, [actionId, running, refresh]);

  const runRollback = useCallback(async () => {
    if (!actionId || rollbackPhase === "running") return;
    setRollbackPhase("running");
    setRollbackError(null);
    try {
      const res = await fetch(`/api/actions/${actionId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rollbackReason.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
      };
      if (res.ok && data.status === "rolled_back") {
        setRollbackPhase("done");
      } else {
        setRollbackPhase("failed");
        setRollbackError(data.error ?? "Rollback failed.");
      }
    } catch {
      setRollbackPhase("failed");
      setRollbackError("Rollback failed.");
    } finally {
      await refresh();
    }
  }, [actionId, rollbackPhase, rollbackReason, refresh]);

  // Rollback is available when a succeeded REAL execution exists, the action is
  // reversible, and it hasn't already been rolled back.
  const rollbackTarget = executions.find(
    (e) => e.state === "succeeded" && !e.dry_run
  );
  const alreadyRolledBack =
    rollbackTarget != null &&
    (rollbackTarget.rollback_execution_id != null ||
      executions.some((e) => e.original_execution_id === rollbackTarget.id));
  const rollbackAvailable =
    rollbackTarget != null &&
    !alreadyRolledBack &&
    isReversible(action?.actionType ?? null);

  // Latest attempt drives the summary stats.
  const latest = executions[0] ?? null;
  const state: ExecState = latest?.state ?? "not_requested";
  const chip = STATE_CHIP[state];
  const provider = latest?.provider ?? action?.provider ?? "—";
  const requestId = latest?.provider_request_id ?? null;
  const durationMs = latest?.duration_ms ?? null;
  // Retries = extra attempts of the latest attempt's lifecycle (attempt_no is
  // 1-based). Distinct dry-run vs. real rows are different modes, not retries.
  const retries = latest ? Math.max(0, latest.attempt_no - 1) : 0;

  const copyRequestId = () => {
    if (!requestId) return;
    void navigator.clipboard?.writeText(requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      {open && action && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            variants={fadeIn}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l border-white/[0.08] bg-[hsl(var(--card))] shadow-2xl md:w-[560px]"
            initial={reduce ? false : { x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            role="dialog"
            aria-label="Execution details"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] px-6 py-4">
              <div className="min-w-0">
                <div className="type-eyebrow text-foreground-muted">
                  Execution details
                </div>
                <h2 className="mt-1 type-body font-semibold text-foreground line-clamp-2">
                  {action.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Status + actions */}
              <div className="flex items-center justify-between gap-2">
                <span className={chip.chip}>{chip.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={runExecute}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand/15 px-3 py-1.5 type-caption font-semibold text-brand transition-colors hover:bg-brand/25 disabled:opacity-50"
                  >
                    {running ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Run
                  </button>
                  {/* Rollback — shown when a succeeded real execution is reversible. */}
                  {(rollbackAvailable || rollbackPhase !== "idle") && (
                    <button
                      type="button"
                      onClick={() =>
                        setRollbackPhase((p) =>
                          p === "idle" ? "confirming" : p
                        )
                      }
                      disabled={
                        rollbackPhase === "running" ||
                        rollbackPhase === "done" ||
                        !rollbackAvailable
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 type-caption font-semibold text-foreground-muted transition-colors hover:border-white/[0.25] hover:text-foreground disabled:opacity-50"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Rollback
                    </button>
                  )}
                </div>
              </div>

              {/* Rollback confirmation + status */}
              {rollbackPhase === "confirming" && (
                <motion.div
                  variants={fadeIn}
                  initial={reduce ? false : "hidden"}
                  animate="visible"
                  className="card p-4"
                >
                  <p className="type-body font-semibold text-foreground">
                    Roll back this execution?
                  </p>
                  <p className="mt-1 type-caption text-foreground-muted">
                    This runs the inverse action against the provider. It creates a
                    new execution and is recorded in the audit trail.
                  </p>
                  <input
                    type="text"
                    value={rollbackReason}
                    onChange={(e) => setRollbackReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="mt-3 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 type-caption text-foreground outline-none transition-colors focus:border-brand/50"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRollbackPhase("idle")}
                      className="rounded-lg border border-white/[0.14] px-3 py-1.5 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={runRollback}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand/15 px-3 py-1.5 type-caption font-semibold text-brand transition-colors hover:bg-brand/25"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Confirm rollback
                    </button>
                  </div>
                </motion.div>
              )}
              {rollbackPhase === "running" && (
                <div className="card flex items-center gap-2 p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  <span className="type-caption text-foreground-muted">
                    Rolling back…
                  </span>
                </div>
              )}
              {rollbackPhase === "done" && (
                <div className="rounded-xl border border-brand/25 bg-brand/[0.06] p-3">
                  <span className="inline-flex items-center gap-1.5 type-caption font-semibold text-brand">
                    <Check className="h-3.5 w-3.5" /> Rollback complete
                  </span>
                </div>
              )}
              {rollbackPhase === "failed" && (
                <div className="rounded-xl border border-red-400/25 bg-red-400/[0.06] p-3">
                  <span className="type-caption font-semibold text-red-400/80">
                    {rollbackError ?? "Rollback failed."}
                  </span>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <Stat label="Provider" value={provider} />
                <Stat label="Duration" value={formatDuration(durationMs)} />
                <Stat label="Retry count" value={retries} />
                <Stat
                  label="Attempts"
                  value={executions.length > 0 ? executions.length : "—"}
                />
              </div>

              {/* Request ID */}
              <div className="card-muted px-3 py-2.5">
                <div className="type-caption text-foreground-muted">Request ID</div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate font-mono type-caption text-foreground">
                    {requestId ?? "—"}
                  </span>
                  {requestId && (
                    <button
                      onClick={copyRequestId}
                      className="shrink-0 text-foreground-muted transition-colors hover:text-foreground"
                      aria-label="Copy request id"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-brand" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Failure detail (muted red only on real failure) */}
              {state === "failed" && latest?.error_message && (
                <div className="rounded-xl border border-red-400/25 bg-red-400/[0.06] p-3">
                  <div className="type-caption font-semibold text-red-400/80">
                    {latest.error_code ?? "Error"}
                    {latest.error_class ? ` · ${latest.error_class}` : ""}
                  </div>
                  <p className="mt-1 type-caption text-foreground/80">
                    {latest.error_message}
                  </p>
                </div>
              )}

              {/* Dry Run Diff */}
              <DryRunDiff
                actionType={action.actionType ?? null}
                params={action.paramsJson ?? null}
              />

              {/* Timeline (audit events) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="type-eyebrow text-foreground-muted">
                    Action timeline
                  </h3>
                  {loading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
                  )}
                </div>
                {loading && audit.length === 0 ? (
                  <div className="card h-24 animate-pulse" />
                ) : (
                  <ActionTimeline events={audit} />
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
