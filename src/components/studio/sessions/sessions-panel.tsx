"use client";

/**
 * Workspace Sessions — panel (Sprint 63U).
 *
 * Recent / Active / Completed / Failed sessions as production cards. Each card
 * shows outcome, status, started + last-activity times, the AI employees
 * involved, the progress stage, and generated-asset count, plus the lifecycle
 * actions. Resume reopens the existing Unified Workspace over the current
 * Generation Runtime state. Reuses the Outcome Engine + Employees registry +
 * Studio tokens. Presentation only.
 */

import { Play, Copy, Archive, Trash2, Clock, Layers, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import { useSessions } from "./sessions-context";
import {
  recentSessions,
  sessionsByStatus,
  SESSION_STATUSES,
  type SessionStatus,
  type WorkspaceSession,
} from "./sessions-data";

const STATUS_CHIP: Record<SessionStatus, string> = {
  active: "chip-emerald",
  completed: "chip-emerald",
  failed: "chip-slate",
  archived: "chip-slate",
};
const STATUS_LABEL: Record<SessionStatus, string> = {
  active: "Active",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};
const GROUP_TITLE: Record<(typeof SESSION_STATUSES)[number], string> = {
  active: "Active Sessions",
  completed: "Completed Sessions",
  failed: "Failed Sessions",
};

function fmt(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SessionCard({ session, onResume }: { session: WorkspaceSession; onResume: () => void }) {
  const { duplicate, archive, remove } = useSessions();
  const outcome = outcomeById(session.outcomeId);
  const OutcomeIcon = outcome?.icon;

  return (
    <div className="studio-card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        {OutcomeIcon && (
          <div className="studio-tile flex h-9 w-9 items-center justify-center text-brand">
            <OutcomeIcon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{outcome?.label ?? session.outcomeId}</p>
          <p className="truncate type-caption text-foreground-muted">{session.stage}</p>
        </div>
        <span className={cn("chip", STATUS_CHIP[session.status])}>{STATUS_LABEL[session.status]}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 type-caption text-foreground-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> Started {fmt(session.startedAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <History className="h-3 w-3" /> Last {fmt(session.lastActivity)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" /> {session.assets} assets
        </span>
      </div>

      {/* AI employees involved */}
      <div className="flex flex-wrap gap-1.5">
        {session.employees.map((id) => {
          const Icon = EMPLOYEE_ICON[id];
          return (
            <span key={id} className="inline-flex items-center gap-1 chip chip-slate">
              <Icon className="h-3 w-3" /> {employeeName(id)}
            </span>
          );
        })}
      </div>

      {/* Lifecycle actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
        <button
          type="button"
          onClick={onResume}
          className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] bg-brand/15 px-2.5 py-1.5 type-caption font-semibold text-brand transition-colors hover:bg-brand/25"
        >
          <Play className="h-3.5 w-3.5" /> Resume
        </button>
        <button
          type="button"
          onClick={() => duplicate(session.id)}
          className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2.5 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        <button
          type="button"
          onClick={() => archive(session.id)}
          className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2.5 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
        <button
          type="button"
          onClick={() => remove(session.id)}
          className="studio-focusable ml-auto inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2.5 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}

function Group({ title, sessions, onResume }: { title: string; sessions: WorkspaceSession[]; onResume: () => void }) {
  if (sessions.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="type-caption font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} onResume={onResume} />
        ))}
      </div>
    </section>
  );
}

export function SessionsPanel({ onResume }: { onResume: () => void }) {
  const { sessions } = useSessions();
  return (
    <div className="flex flex-col gap-6">
      <Group title="Recent Sessions" sessions={recentSessions(sessions)} onResume={onResume} />
      {SESSION_STATUSES.map((status) => (
        <Group key={status} title={GROUP_TITLE[status]} sessions={sessionsByStatus(sessions, status)} onResume={onResume} />
      ))}
    </div>
  );
}
