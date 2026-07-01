/**
 * Production Approval Center — types + sample data + pure helpers (Sprint 63).
 *
 * Marketing Operations approval queue. Reuses the Queue vocabulary (priority),
 * creative ids, employees, and outcomes. Deterministic sample data — no backend,
 * no fake approvals (decisions are presentation-state transitions only).
 */

import type { EmployeeId } from "@/components/studio/employees/types";
import type { QueuePriority } from "@/components/studio/queue/queue-data";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "needs-changes" | "scheduled" | "expired";

export interface ApprovalComment {
  id: string;
  authorId: EmployeeId;
  text: string;
  at: number;
}

export interface ApprovalEvent {
  id: string;
  at: number;
  text: string;
}

export interface ApprovalItem {
  id: string;
  creativeId: string;
  outcomeId: string;
  /** AI employee who produced the creative. */
  assignedId: EmployeeId;
  /** AI employee reviewing it. */
  reviewerId: EmployeeId;
  priority: QueuePriority;
  status: ApprovalStatus;
  budget: number;
  version: number;
  comments: ApprovalComment[];
  history: ApprovalEvent[];
  scheduledAt?: number;
  /** Marketing DNA version that produced this item (Sprint 63R). */
  dnaVersion?: string;
}

/**
 * No sample approvals (Sprint 64V). Approvals come only from the Generation
 * Store — real generated creatives that completed execution — never hardcoded.
 */
export const SAMPLE_APPROVALS: ApprovalItem[] = [];

export const APPROVAL_STATUSES: ApprovalStatus[] = ["pending", "needs-changes", "scheduled", "approved", "rejected", "expired"];

const PRIORITY_RANK: Record<QueuePriority, number> = { high: 0, normal: 1, low: 2 };

/* ── Pure helpers ────────────────────────────────────────────────────────── */
export function filterApprovals(items: ApprovalItem[], status: ApprovalStatus | "all"): ApprovalItem[] {
  return status === "all" ? items : items.filter((i) => i.status === status);
}

export function searchApprovals(items: ApprovalItem[], q: string, titleOf: (id: string) => string): ApprovalItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter((i) => titleOf(i.creativeId).toLowerCase().includes(s));
}

export function countApprovals(items: ApprovalItem[]): Record<ApprovalStatus, number> {
  const base = { pending: 0, approved: 0, rejected: 0, "needs-changes": 0, scheduled: 0, expired: 0 } as Record<ApprovalStatus, number>;
  for (const i of items) base[i.status] += 1;
  return base;
}

export function sortApprovals(items: ApprovalItem[]): ApprovalItem[] {
  return [...items].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
