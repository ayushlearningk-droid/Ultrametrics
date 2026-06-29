/**
 * Worker status (Sprint 57 — Observability). READ-ONLY.
 *
 * Cross-process worker health for the dashboard API (which cannot see the
 * Railway worker's in-memory state). Combines:
 *   - the Redis heartbeat (startedAt / uptime / version / pid)  — heartbeat.ts
 *   - BullMQ's Redis-backed getWorkers() per queue (live connections)
 *
 * No worker execution, no mutation.
 */

import { getQueue, QUEUE_NAMES, type QueueName } from "@/lib/queue";
import { readWorkerHeartbeat, type WorkerHeartbeat } from "./heartbeat";

export interface QueueWorkerPresence {
  name: QueueName;
  /** Number of worker connections servicing this queue (from Redis). */
  workerCount: number;
}

export interface WorkerStatusReport {
  collectedAt: string;
  /** Overall: heartbeat present + fresh AND at least one worker per queue. */
  healthy: boolean;
  redisConnected: boolean;
  heartbeat: WorkerHeartbeat;
  queues: QueueWorkerPresence[];
}

/** Read worker presence per queue from Redis (cross-process). */
async function workerPresence(name: QueueName): Promise<QueueWorkerPresence> {
  try {
    const workers = await getQueue(name).getWorkers();
    return { name, workerCount: workers.length };
  } catch {
    return { name, workerCount: 0 };
  }
}

/** Collect cross-process worker status. Read-only; never throws. */
export async function getWorkerStatus(): Promise<WorkerStatusReport> {
  const [heartbeat, queues] = await Promise.all([
    readWorkerHeartbeat(),
    Promise.all(QUEUE_NAMES.map(workerPresence)),
  ]);

  const redisConnected = heartbeat.present || queues.some((q) => q.workerCount > 0);
  const everyQueueStaffed = queues.every((q) => q.workerCount > 0);
  const healthy = heartbeat.present && !heartbeat.stale && everyQueueStaffed;

  return {
    collectedAt: new Date().toISOString(),
    healthy,
    redisConnected,
    heartbeat,
    queues,
  };
}
