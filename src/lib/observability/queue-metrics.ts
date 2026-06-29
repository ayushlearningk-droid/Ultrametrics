/**
 * Queue metrics (Sprint 57 — Observability). READ-ONLY.
 *
 * Per-queue job-state counts (waiting / active / completed / failed / delayed /
 * paused) plus the queue's paused flag, by reusing the 56A registry. No enqueue,
 * no execution, no mutation.
 */

import { getQueue } from "@/lib/queue";
import { QUEUE_NAMES, type QueueName } from "@/lib/queue";

export interface QueueMetric {
  name: QueueName;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  isPaused: boolean;
}

export interface QueueMetricsReport {
  collectedAt: string;
  queues: QueueMetric[];
  totals: Omit<QueueMetric, "name" | "isPaused">;
}

async function metricForQueue(name: QueueName): Promise<QueueMetric> {
  const queue = getQueue(name);
  const [counts, isPaused] = await Promise.all([
    queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused"
    ),
    queue.isPaused(),
  ]);
  return {
    name,
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
    paused: counts.paused ?? 0,
    isPaused,
  };
}

/** Collect per-queue metrics + summed totals. Read-only. */
export async function getQueueMetrics(): Promise<QueueMetricsReport> {
  const queues = await Promise.all(QUEUE_NAMES.map(metricForQueue));
  const totals = queues.reduce(
    (acc, q) => ({
      waiting: acc.waiting + q.waiting,
      active: acc.active + q.active,
      completed: acc.completed + q.completed,
      failed: acc.failed + q.failed,
      delayed: acc.delayed + q.delayed,
      paused: acc.paused + q.paused,
    }),
    { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }
  );
  return { collectedAt: new Date().toISOString(), queues, totals };
}
