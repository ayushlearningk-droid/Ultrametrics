/**
 * Production Generation Queue — types + sample data + pure helpers (Sprint 63).
 *
 * The Creative Production Pipeline. Mirrors the existing Queue Foundation's
 * job-state vocabulary (queued · running(active) · completed · failed · paused ·
 * cancelled) WITHOUT importing the server-only queue lib or adding a new queue
 * runtime. Reuses creative data, employees, the Movie stages, and the Forecast
 * Foundation. No backend, no fake generation.
 */

import type { EmployeeId } from "@/components/studio/employees/types";

export type QueueStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";
export type QueuePriority = "high" | "normal" | "low";
export type QueueGroupBy = "status" | "priority" | "none";

export interface QueueItem {
  id: string;
  /** References a creative (Creative Browser) for preview/forecast. */
  creativeId: string;
  outcomeId: string;
  /** Current pipeline stage id (Movie PIPELINE) while running/paused. */
  stageId?: string;
  assignedId: EmployeeId;
  priority: QueuePriority;
  etaSec: number;
  status: QueueStatus;
  budget: number;
}

export const SAMPLE_QUEUE: QueueItem[] = [
  { id: "q1", creativeId: "cr2", outcomeId: "increase-roas", stageId: "s-script", assignedId: "copywriter", priority: "high", etaSec: 12, status: "running", budget: 8000 },
  { id: "q2", creativeId: "cr4", outcomeId: "launch-product", assignedId: "creative-director", priority: "normal", etaSec: 30, status: "queued", budget: 4000 },
  { id: "q3", creativeId: "cr6", outcomeId: "ugc-campaign", stageId: "s-hook", assignedId: "creative-director", priority: "low", etaSec: 20, status: "paused", budget: 5500 },
  { id: "q4", creativeId: "cr1", outcomeId: "increase-ctr", assignedId: "automation", priority: "high", etaSec: 0, status: "completed", budget: 8000 },
  { id: "q5", creativeId: "cr3", outcomeId: "recover-campaign", stageId: "s-render", assignedId: "automation", priority: "normal", etaSec: 0, status: "failed", budget: 6500 },
  { id: "q6", creativeId: "cr8", outcomeId: "increase-ctr", assignedId: "media-buyer", priority: "normal", etaSec: 45, status: "queued", budget: 7000 },
  { id: "q7", creativeId: "cr7", outcomeId: "festival-campaign", assignedId: "ceo", priority: "low", etaSec: 0, status: "cancelled", budget: 3000 },
];

export const QUEUE_STATUSES: QueueStatus[] = ["running", "queued", "paused", "completed", "failed", "cancelled"];

const PRIORITY_RANK: Record<QueuePriority, number> = { high: 0, normal: 1, low: 2 };

/* ── Pure helpers ────────────────────────────────────────────────────────── */
export function filterQueue(items: QueueItem[], status: QueueStatus | "all"): QueueItem[] {
  return status === "all" ? items : items.filter((i) => i.status === status);
}

export function searchQueue(items: QueueItem[], q: string, titleOf: (id: string) => string): QueueItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter((i) => titleOf(i.creativeId).toLowerCase().includes(s));
}

export function countByStatus(items: QueueItem[]): Record<QueueStatus, number> {
  const base = { queued: 0, running: 0, paused: 0, completed: 0, failed: 0, cancelled: 0 } as Record<QueueStatus, number>;
  for (const i of items) base[i.status] += 1;
  return base;
}

/** Bump a priority one step up (low → normal → high). */
export function bumpPriority(p: QueuePriority): QueuePriority {
  return p === "low" ? "normal" : "high";
}

/** Sort by priority then ETA (scheduler-ready ordering). */
export function sortQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.etaSec - b.etaSec);
}
