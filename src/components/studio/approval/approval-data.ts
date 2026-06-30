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
}

const T = (d: number) => Date.parse(`2026-06-${String(d).padStart(2, "0")}T10:00:00Z`);

export const SAMPLE_APPROVALS: ApprovalItem[] = [
  { id: "a1", creativeId: "cr2", outcomeId: "increase-roas", assignedId: "copywriter", reviewerId: "brand-guardian", priority: "high", status: "pending", budget: 8000, version: 1, comments: [{ id: "c1", authorId: "media-buyer", text: "Strong hook — predicted lift looks good.", at: T(20) }], history: [{ id: "h1", at: T(20), text: "Submitted by Quill" }] },
  { id: "a2", creativeId: "cr3", outcomeId: "recover-campaign", assignedId: "automation", reviewerId: "creative-director", priority: "normal", status: "needs-changes", budget: 6500, version: 2, comments: [{ id: "c2", authorId: "creative-director", text: "Tighten the first 2 seconds.", at: T(19) }], history: [{ id: "h2", at: T(18), text: "Submitted" }, { id: "h3", at: T(19), text: "Changes requested by Theo" }] },
  { id: "a3", creativeId: "cr1", outcomeId: "increase-ctr", assignedId: "creative-director", reviewerId: "ceo", priority: "high", status: "approved", budget: 8000, version: 3, comments: [], history: [{ id: "h4", at: T(20), text: "Submitted" }, { id: "h5", at: T(20), text: "Brand check passed" }, { id: "h6", at: T(20), text: "Approved by Atlas" }] },
  { id: "a4", creativeId: "cr6", outcomeId: "ugc-campaign", assignedId: "creative-director", reviewerId: "brand-guardian", priority: "low", status: "scheduled", budget: 5500, version: 1, comments: [], history: [{ id: "h7", at: T(17), text: "Scheduled for review" }], scheduledAt: T(24) },
  { id: "a5", creativeId: "cr5", outcomeId: "launch-product", assignedId: "media-buyer", reviewerId: "finance", priority: "normal", status: "rejected", budget: 9000, version: 4, comments: [{ id: "c3", authorId: "finance", text: "Over budget for the expected lift.", at: T(15) }], history: [{ id: "h8", at: T(14), text: "Submitted" }, { id: "h9", at: T(15), text: "Rejected by Sol" }] },
  { id: "a6", creativeId: "cr7", outcomeId: "festival-campaign", assignedId: "creative-director", reviewerId: "ceo", priority: "low", status: "expired", budget: 3000, version: 5, comments: [], history: [{ id: "h10", at: T(10), text: "Submitted" }, { id: "h11", at: T(13), text: "Review window expired" }] },
];

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
