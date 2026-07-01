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
  /** Marketing DNA version that produced this item (Sprint 63R). */
  dnaVersion?: string;
}

/**
 * No sample queue (Sprint 64V). Queue items come only from the Generation Store,
 * with live status derived from each asset's real execution — never hardcoded.
 */
export const SAMPLE_QUEUE: QueueItem[] = [];

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
