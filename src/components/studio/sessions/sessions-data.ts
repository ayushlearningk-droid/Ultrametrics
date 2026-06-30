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
const H = 3_600_000;

export const SAMPLE_SESSIONS: WorkspaceSession[] = [
  { id: "ses-1", outcomeId: "increase-roas", status: "active", startedAt: SESSION_BASE, lastActivity: SESSION_BASE + 2 * H, employees: ["media-buyer", "creative-director", "finance"], stage: "Generating Assets", assets: 3 },
  { id: "ses-2", outcomeId: "ugc-campaign", status: "active", startedAt: SESSION_BASE - 6 * H, lastActivity: SESSION_BASE + H, employees: ["creative-director", "copywriter", "automation"], stage: "Reviewing", assets: 5 },
  { id: "ses-3", outcomeId: "launch-product", status: "completed", startedAt: SESSION_BASE - 28 * H, lastActivity: SESSION_BASE - 20 * H, employees: ["ceo", "creative-director", "copywriter", "media-buyer"], stage: "Approved", assets: 8 },
  { id: "ses-4", outcomeId: "increase-ctr", status: "completed", startedAt: SESSION_BASE - 52 * H, lastActivity: SESSION_BASE - 48 * H, employees: ["creative-director", "copywriter", "media-buyer"], stage: "Approved", assets: 4 },
  { id: "ses-5", outcomeId: "recover-campaign", status: "failed", startedAt: SESSION_BASE - 14 * H, lastActivity: SESSION_BASE - 12 * H, employees: ["media-buyer", "creative-director", "finance"], stage: "Building Campaign", assets: 0 },
  { id: "ses-6", outcomeId: "festival-campaign", status: "completed", startedAt: SESSION_BASE - 74 * H, lastActivity: SESSION_BASE - 70 * H, employees: ["creative-director", "brand-guardian", "automation"], stage: "Approved", assets: 6 },
];

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
