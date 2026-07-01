/**
 * Workspace Sessions — types + deterministic sample data + pure helpers (Sprint 63U).
 *
 * A session is one run of the studio against an outcome. Reuses the Outcome
 * Engine ids and the Employees registry. Deterministic sample records — no
 * backend, no timers, no fake analytics. The Sessions context layers
 * presentation-only actions (resume / duplicate / archive / delete) on top.
 */

import type { EmployeeId } from "@/components/studio/employees/types";

export type SessionStatus = "active" | "completed" | "failed" | "archived";

export interface WorkspaceSession {
  id: string;
  outcomeId: string;
  status: SessionStatus;
  startedAt: number;
  lastActivity: number;
  employees: EmployeeId[];
  /** Current progress stage label. */
  stage: string;
  /** Number of generated assets. */
  assets: number;
}

/** Fixed clock base — keeps the module deterministic (no Date.now). */
export const SESSION_BASE = Date.parse("2026-06-28T09:00:00Z");

/**
 * No sample sessions (Sprint 64V). Sessions are created from real studio runs —
 * never hardcoded campaigns.
 */
export const SAMPLE_SESSIONS: WorkspaceSession[] = [];

export const SESSION_STATUSES: Exclude<SessionStatus, "archived">[] = ["active", "completed", "failed"];

/** Sessions of a status, newest activity first. Pure. */
export function sessionsByStatus(items: WorkspaceSession[], status: SessionStatus): WorkspaceSession[] {
  return items.filter((s) => s.status === status).sort((a, b) => b.lastActivity - a.lastActivity);
}

/** Most recently active non-archived sessions. Pure. */
export function recentSessions(items: WorkspaceSession[], limit = 3): WorkspaceSession[] {
  return items
    .filter((s) => s.status !== "archived")
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .slice(0, limit);
}
