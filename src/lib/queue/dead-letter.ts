/**
 * Dead Letter Queue (Sprint 56D — Retry & Dead Letter Queue).
 *
 * Where jobs go when the shared retry policy (src/lib/actions/retry.ts, reused
 * via ./retry) is exhausted or the failure is non-retryable. The DLQ is a
 * STANDALONE BullMQ queue named "dead-letter" — deliberately NOT part of
 * QUEUE_NAMES, so it adds no worker (nothing consumes it) and requires no
 * change to the registry, producers, or worker runtime. Operators inspect /
 * replay it out of band.
 *
 * SCOPE (Sprint 56D): routing + inspection helpers only. No worker, no
 * execution, no provider calls. Routing is invoked from a worker `failed`
 * handler in a LATER sprint; this only provides the helper.
 */

import { Queue, type ConnectionOptions } from "bullmq";
import { getRedisConnection } from "./connection";
import { classifyError, isRetryable, MAX_ATTEMPTS, type ErrorClass } from "./retry";
import type { QueueName } from "./types";

/** The dead-letter queue name (intentionally outside QUEUE_NAMES). */
export const DEAD_LETTER_QUEUE_NAME = "dead-letter" as const;

/** The data row stored for a dead-lettered job — metadata only, never secrets. */
export interface DeadLetterRecord {
  /** Queue the job originally ran on. */
  sourceQueue: QueueName;
  /** Original BullMQ job id (deterministic; from the producer). */
  sourceJobId?: string;
  workspaceId?: string;
  /** The original job's data envelope, preserved for replay/inspection. */
  originalData: unknown;
  /** Why it was dead-lettered. */
  errorClass: ErrorClass;
  reason: string;
  attemptsMade: number;
  /** ISO timestamp it was dead-lettered. */
  deadLetteredAt: string;
}

// Standalone DLQ singleton (own handle, shared Redis connection from 56A).
let deadLetterQueue: Queue<DeadLetterRecord> | null = null;

/** Return the shared dead-letter queue, creating it on first access. */
export function getDeadLetterQueue(): Queue<DeadLetterRecord> {
  if (deadLetterQueue) return deadLetterQueue;
  deadLetterQueue = new Queue<DeadLetterRecord>(DEAD_LETTER_QUEUE_NAME, {
    connection: getRedisConnection() as unknown as ConnectionOptions,
    defaultJobOptions: {
      // DLQ entries are inspected/replayed by operators; keep them around.
      removeOnComplete: false,
      removeOnFail: false,
    },
  });
  return deadLetterQueue;
}

/** Inputs needed to route a failed job to the DLQ. */
export interface DeadLetterInput {
  sourceQueue: QueueName;
  sourceJobId?: string;
  workspaceId?: string;
  originalData: unknown;
  error: unknown;
  attemptsMade: number;
}

/**
 * Whether a failed job should be dead-lettered NOW: either the failure is
 * non-retryable, or the retry budget (shared MAX_ATTEMPTS) is spent. Reuses the
 * existing classification so the decision matches the engine.
 */
export function shouldDeadLetter(error: unknown, attemptsMade: number): boolean {
  const errorClass = classifyError(error);
  return !isRetryable(errorClass) || attemptsMade >= MAX_ATTEMPTS;
}

/**
 * Route a failed job to the dead-letter queue. Returns the DLQ record that was
 * stored. Logs the routing (metadata only). Idempotent on sourceJobId so the
 * same failed job is not dead-lettered twice.
 */
export async function routeToDeadLetter(
  input: DeadLetterInput
): Promise<DeadLetterRecord> {
  const errorClass = classifyError(input.error);
  const reason =
    input.error instanceof Error ? input.error.message : String(input.error);

  const record: DeadLetterRecord = {
    sourceQueue: input.sourceQueue,
    sourceJobId: input.sourceJobId,
    workspaceId: input.workspaceId,
    originalData: input.originalData,
    errorClass,
    reason,
    attemptsMade: input.attemptsMade,
    deadLetteredAt: new Date().toISOString(),
  };

  const jobId = input.sourceJobId
    ? `dlq-${input.sourceQueue}-${input.sourceJobId}`
    : undefined;

  await getDeadLetterQueue().add(input.sourceQueue, record, { jobId });

  console.error(`[dlq] dead-lettered job from ${input.sourceQueue}`, {
    sourceQueue: input.sourceQueue,
    sourceJobId: input.sourceJobId,
    workspaceId: input.workspaceId,
    errorClass,
    attemptsMade: input.attemptsMade,
  });

  return record;
}

/** Read-only job counts for the dead-letter queue (for health/dashboards). */
export async function getDeadLetterCounts(): Promise<Record<string, number>> {
  return getDeadLetterQueue().getJobCounts();
}

/** Close the dead-letter queue handle (graceful shutdown / tests). */
export async function closeDeadLetterQueue(): Promise<void> {
  if (!deadLetterQueue) return;
  const q = deadLetterQueue;
  deadLetterQueue = null;
  await q.close();
}
