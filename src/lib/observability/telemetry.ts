/**
 * Telemetry (Sprint 57 — Observability). READ-ONLY, SAMPLED.
 *
 * Average processing time, throughput, success/failure rate, and average retries
 * — derived by SAMPLING recent completed/failed jobs (BullMQ getJobs + each
 * job's processedOn/finishedOn/attemptsMade) and the cumulative job counts. No
 * native metrics collector is enabled (that would change queue construction).
 * No mutation, no execution.
 */

import { getQueue, QUEUE_NAMES, type QueueName } from "@/lib/queue";

const SAMPLE_SIZE = 100;

export interface QueueTelemetry {
  name: QueueName;
  /** Avg (finishedOn − processedOn) over sampled completed jobs, ms. */
  avgProcessingMs: number | null;
  /** Completed jobs per minute, estimated from the sampled completed window. */
  throughputPerMin: number | null;
  /** completed / (completed + failed) from cumulative counts. */
  successRate: number | null;
  failureRate: number | null;
  /** Avg retries (attemptsMade − 1) over the sampled completed+failed jobs. */
  avgRetries: number | null;
  sampledCompleted: number;
  sampledFailed: number;
}

export interface TelemetryReport {
  collectedAt: string;
  sampleSize: number;
  queues: QueueTelemetry[];
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function queueTelemetry(name: QueueName): Promise<QueueTelemetry> {
  const queue = getQueue(name);

  let completed: Awaited<ReturnType<typeof queue.getJobs>> = [];
  let failed: Awaited<ReturnType<typeof queue.getJobs>> = [];
  let counts: Record<string, number> = {};
  try {
    [completed, failed, counts] = await Promise.all([
      queue.getJobs(["completed"], 0, SAMPLE_SIZE - 1),
      queue.getJobs(["failed"], 0, SAMPLE_SIZE - 1),
      queue.getJobCounts("completed", "failed"),
    ]);
  } catch {
    completed = [];
    failed = [];
    counts = {};
  }

  // Processing time over completed jobs that carry both timestamps.
  const durations: number[] = [];
  const finishedTimes: number[] = [];
  for (const job of completed) {
    if (!job) continue;
    if (typeof job.finishedOn === "number" && typeof job.processedOn === "number") {
      durations.push(job.finishedOn - job.processedOn);
    }
    if (typeof job.finishedOn === "number") finishedTimes.push(job.finishedOn);
  }

  // Throughput: sampled completed jobs across the span of their finish times.
  let throughputPerMin: number | null = null;
  if (finishedTimes.length >= 2) {
    const spanMs = Math.max(...finishedTimes) - Math.min(...finishedTimes);
    const spanMin = spanMs / 60_000;
    throughputPerMin = spanMin > 0 ? finishedTimes.length / spanMin : null;
  }

  // Avg retries across both samples.
  const retries: number[] = [];
  for (const job of [...completed, ...failed]) {
    if (!job) continue;
    retries.push(Math.max(0, (job.attemptsMade ?? 1) - 1));
  }

  const completedCount = counts.completed ?? 0;
  const failedCount = counts.failed ?? 0;
  const denom = completedCount + failedCount;
  const successRate = denom > 0 ? completedCount / denom : null;
  const failureRate = denom > 0 ? failedCount / denom : null;

  return {
    name,
    avgProcessingMs: avg(durations),
    throughputPerMin,
    successRate,
    failureRate,
    avgRetries: avg(retries),
    sampledCompleted: completed.length,
    sampledFailed: failed.length,
  };
}

/** Collect sampled telemetry per queue. Read-only. */
export async function getTelemetry(): Promise<TelemetryReport> {
  const queues = await Promise.all(QUEUE_NAMES.map(queueTelemetry));
  return {
    collectedAt: new Date().toISOString(),
    sampleSize: SAMPLE_SIZE,
    queues,
  };
}
