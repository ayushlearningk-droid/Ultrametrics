/**
 * Queue job processors (Sprint 56C — Worker Runtime).
 *
 * One processor per queue. SCOPE: log-only. A processor receives a job and logs
 * that it was received — it executes NO business logic. There is deliberately no
 * Meta/Google/AI call, no Action Engine, no Generation, no Scheduler here. The
 * real handlers arrive in later sprints; this proves the consume + log loop.
 *
 * A processor that resolves marks the job completed; one that throws marks it
 * failed (and BullMQ applies the producer's retry policy). These no-op
 * processors always resolve.
 */

import type { Job } from "bullmq";
import type { JobEnvelope, QueueName } from "./types";

/** Structured log line for a processed job (no secrets — metadata only). */
function describe<Q extends QueueName>(queue: Q, job: Job<JobEnvelope<Q>>) {
  const { jobId, workspaceId, idempotencyKey, priority, createdAt } = job.data;
  return {
    queue,
    bullmqId: job.id,
    jobId,
    workspaceId,
    idempotencyKey,
    priority,
    createdAt,
    attemptsMade: job.attemptsMade,
  };
}

/**
 * Build a log-only processor for a queue. Logs "job received" and returns. No
 * business logic runs. Returns void (no result payload) by design.
 */
function makeProcessor<Q extends QueueName>(queue: Q) {
  return async function process(job: Job<JobEnvelope<Q>>): Promise<void> {
    console.info(`[worker:${queue}] job received`, describe(queue, job));
    // No-op: consume and log only. Resolve so the job is marked completed.
  };
}

/** Processor for each queue, keyed by name. */
export const PROCESSORS = {
  sync: makeProcessor("sync"),
  "action-exec": makeProcessor("action-exec"),
  generation: makeProcessor("generation"),
} as const;

/** The processor function type for a given queue. */
export type Processor<Q extends QueueName> = (
  job: Job<JobEnvelope<Q>>
) => Promise<void>;
