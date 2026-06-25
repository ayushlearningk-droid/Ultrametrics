"use client";

/**
 * Action Timeline (Sprint 15).
 *
 * Vertical lifecycle rail for an execution attempt, rendered from the immutable
 * audit trail (GET /api/actions/[id]/audit). Each audit event becomes a node:
 * Queued → Validating → Running → Succeeded / Failed / Cancelled / Rolled back.
 * Pure presentation; strict 3-colour system (emerald = active/success, muted red
 * = failure, slate = neutral). Motion via shared staggerChildren/slideUp.
 */

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  CircleSlash,
  Undo2,
  CircleDot,
} from "lucide-react";
import type { ActionAuditLogRow } from "@/types/database";
import { staggerChildren, slideUp } from "@/lib/motion";

type AuditEvent = ActionAuditLogRow["event"];

interface NodeStyle {
  label: string;
  icon: typeof CheckCircle2;
  tone: string; // text colour for the icon
}

const EVENT_STYLE: Record<AuditEvent, NodeStyle> = {
  execute_requested: { label: "Requested", icon: CircleDot, tone: "text-slate-300" },
  queued: { label: "Queued", icon: Clock, tone: "text-slate-300" },
  validating: { label: "Validating", icon: Loader2, tone: "text-slate-300" },
  execution_started: { label: "Running", icon: Loader2, tone: "text-brand" },
  execution_succeeded: { label: "Succeeded", icon: CheckCircle2, tone: "text-brand" },
  execution_failed: { label: "Failed", icon: XCircle, tone: "text-red-400/80" },
  retry_scheduled: { label: "Retry scheduled", icon: Clock, tone: "text-slate-300" },
  cancelled: { label: "Cancelled", icon: CircleSlash, tone: "text-slate-300" },
  rolled_back: { label: "Rolled back", icon: Undo2, tone: "text-slate-300" },
  dry_run_halted: { label: "Dry run · halted", icon: CircleSlash, tone: "text-slate-300" },
  rollback_requested: { label: "Rollback requested", icon: Undo2, tone: "text-slate-300" },
  rollback_started: { label: "Rolling back", icon: Loader2, tone: "text-brand" },
  rollback_completed: { label: "Rollback complete", icon: CheckCircle2, tone: "text-brand" },
  rollback_failed: { label: "Rollback failed", icon: XCircle, tone: "text-red-400/80" },
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ActionTimeline({ events }: { events: ActionAuditLogRow[] }) {
  const reduce = useReducedMotion();

  if (events.length === 0) {
    return (
      <div className="card flex h-24 items-center justify-center">
        <p className="type-caption text-foreground-muted">
          No timeline yet — run this action to begin.
        </p>
      </div>
    );
  }

  return (
    <motion.ul
      className="relative space-y-0 px-1"
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      {/* rail */}
      <li
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-[19px] top-5 w-px bg-white/[0.08]"
      />
      {events.map((e) => {
        const s = EVENT_STYLE[e.event];
        const Icon = s.icon;
        return (
          <motion.li
            key={e.id}
            variants={slideUp}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            <div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-background">
              <Icon className={`h-4 w-4 ${s.tone}`} />
            </div>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-1.5">
              <div className="min-w-0">
                <p className="type-body font-semibold text-foreground">
                  {s.label}
                </p>
                {(e.from_state || e.to_state) && (
                  <p className="type-caption text-foreground-muted">
                    {e.from_state ?? "—"} → {e.to_state ?? "—"}
                  </p>
                )}
              </div>
              <span className="shrink-0 type-caption tabular-nums text-foreground-muted">
                {timeLabel(e.created_at)}
              </span>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
