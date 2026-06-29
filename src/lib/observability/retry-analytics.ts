/**
 * Retry & dead-letter analytics (Sprint 57 — Observability). READ-ONLY.
 *
 * Derives retry counts, failure reasons, most-common errors, and dead-letter
 * counts by SAMPLING recent jobs (BullMQ getJobs) and the DLQ — no native
 * metrics collector is enabled (that would be a queue-config change). Reuses the
 * 56D DLQ helpers and the retry classifier. No mutation, no execution.
 */

import { getQueue, QUEUE_NAMES, classifyError, type QueueName } from "@/lib/queue";
import {
  getDeadLetterQueue,
  getDeadLetterCounts,
  type DeadLetterRecord,
} from "@/lib/queue";

/** How many recent jobs per state to sample. */
const SAMPLE_SIZE = 100;

export interface ErrorTally {
  reason: string;
  count: number;
}

export interface QueueRetryStats {
  name: QueueName;
  /** How many failed jobs were sampled. */
  sampledFailed: number;
  /** Sum of retries actually performed across the sample (attemptsMade − 1). */
  totalRetries: number;
  /** Top failure reasons (by error class) within the sample. */
  topErrors: ErrorTally[];
}

export interface RetryAnalyticsReport {
  collectedAt: string;
  sampleSize: number;
  queues: QueueRetryStats[];
  deadLetter: {
    counts: Record<string, number>;
    total: number;
    topErrors: ErrorTally[];
  };
}

function tally(reasons: string[]): ErrorTally[] {
  const map = new Map<string, number>();
  for (const r of reasons) map.set(r, (map.get(r) ?? 0) + 1);
  return Array.from(map, ([reason, count]) => ({ reason, count })).sort(
    (a, b) => b.count - a.count
  );
}

async function queueRetryStats(name: QueueName): Promise<QueueRetryStats> {
  let failed: Awaited<ReturnType<ReturnType<typeof getQueue>["getJobs"]>> = [];
  try {
    failed = await getQueue(name).getJobs(["failed"], 0, SAMPLE_SIZE - 1);
  } catch {
    failed = [];
  }

  let totalRetries = 0;
  const reasons: string[] = [];
  for (const job of failed) {
    if (!job) continue;
    totalRetries += Math.max(0, (job.attemptsMade ?? 1) - 1);
    reasons.push(classifyError(job.failedReason ?? ""));
  }

  return {
    name,
    sampledFailed: failed.length,
    totalRetries,
    topErrors: tally(reasons),
  };
}

async function deadLetterStats(): Promise<RetryAnalyticsReport["deadLetter"]> {
  const counts = await getDeadLetterCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  let records: Array<{ data: DeadLetterRecord } | undefined> = [];
  try {
    records = (await getDeadLetterQueue().getJobs(
      ["waiting", "delayed", "active", "completed", "failed"],
      0,
      SAMPLE_SIZE - 1
    )) as Array<{ data: DeadLetterRecord } | undefined>;
  } catch {
    records = [];
  }

  const reasons = records
    .filter((j): j is { data: DeadLetterRecord } => Boolean(j?.data))
    .map((j) => j.data.errorClass ?? "unknown");

  return { counts, total, topErrors: tally(reasons) };
}

/** Collect retry + dead-letter analytics. Read-only. */
export async function getRetryAnalytics(): Promise<RetryAnalyticsReport> {
  const [queues, deadLetter] = await Promise.all([
    Promise.all(QUEUE_NAMES.map(queueRetryStats)),
    deadLetterStats(),
  ]);
  return {
    collectedAt: new Date().toISOString(),
    sampleSize: SAMPLE_SIZE,
    queues,
    deadLetter,
  };
}
