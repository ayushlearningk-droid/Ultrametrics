/**
 * Queue producers (Sprint 56B — Roadmap 8.0).
 *
 * The ONLY place jobs are enqueued. Each producer builds a fully-populated
 * JobEnvelope (jobId, workspaceId, createdAt, priority, idempotencyKey,
 * retryPolicy + domain payload) and adds it to the shared queue via the
 * registry, passing the dedup/scheduling fields to BullMQ as job options.
 *
 * SCOPE (Sprint 56B): producers only. No workers, no consumers, no execution —
 * adding a job does NOT run it; a worker (later sprint) will. No scheduler or
 * API-route changes; callers wire these in later.
 *
 * Idempotency: jobId is derived deterministically from the payload (see
 * idempotency.ts), so enqueuing the same logical job twice is a BullMQ no-op.
 */

import type { Job, JobsOptions } from "bullmq";
import { getQueue } from "./registry";
import { jobIdentity } from "./idempotency";
import {
  JOB_PRIORITY,
  type JobEnvelope,
  type JobPriorityName,
  type QueueName,
  type QueuePayload,
  type RetryPolicy,
} from "./types";

/**
 * Default retry policy per queue. `action-exec` mirrors the Action Engine's
 * policy (MAX_ATTEMPTS=4, 30s exponential base — see src/lib/actions/retry.ts)
 * so transport-level retries match the engine's existing expectations. Sync and
 * generation get conservative defaults; tune per queue in later sprints.
 */
const DEFAULT_RETRY_POLICY: { [Q in QueueName]: RetryPolicy } = {
  sync: { attempts: 3, backoff: { type: "exponential", backoffMs: 60_000 } },
  "action-exec": {
    attempts: 4,
    backoff: { type: "exponential", backoffMs: 30_000 },
  },
  generation: {
    attempts: 3,
    backoff: { type: "exponential", backoffMs: 30_000 },
  },
};

/** Default priority per queue. */
const DEFAULT_PRIORITY: { [Q in QueueName]: JobPriorityName } = {
  sync: "normal",
  "action-exec": "high",
  generation: "normal",
};

/** Per-call overrides a caller may supply. */
export interface EnqueueOptions {
  priority?: JobPriorityName;
  retryPolicy?: RetryPolicy;
  /** Optional ISO timestamp; defaults to now. Deterministic tests can pin it. */
  createdAt?: string;
}

/** Translate our declarative RetryPolicy into BullMQ job options. */
function toBullMqRetry(policy: RetryPolicy): Pick<JobsOptions, "attempts" | "backoff"> {
  return {
    attempts: policy.attempts,
    backoff: { type: policy.backoff.type, delay: policy.backoff.backoffMs },
  };
}

/**
 * Shared enqueue path: assemble the envelope, then add to the queue with the
 * deterministic jobId + priority + retry options. Returns the BullMQ Job whose
 * `.data` is the envelope.
 */
async function enqueue<Q extends QueueName>(
  queueName: Q,
  workspaceId: string,
  payload: QueuePayload<Q>,
  options: EnqueueOptions = {}
): Promise<Job<JobEnvelope<Q>>> {
  const { idempotencyKey, jobId } = jobIdentity(queueName, payload);
  const priorityName = options.priority ?? DEFAULT_PRIORITY[queueName];
  const priority = JOB_PRIORITY[priorityName];
  const retryPolicy = options.retryPolicy ?? DEFAULT_RETRY_POLICY[queueName];

  const envelope: JobEnvelope<Q> = {
    jobId,
    workspaceId,
    createdAt: options.createdAt ?? new Date().toISOString(),
    priority,
    idempotencyKey,
    retryPolicy,
    payload,
  };

  return getQueue(queueName).add(queueName, envelope, {
    jobId,
    priority,
    ...toBullMqRetry(retryPolicy),
  });
}

/** Enqueue a connector data-sync job. */
export function enqueueSyncJob(
  payload: QueuePayload<"sync">,
  options?: EnqueueOptions
): Promise<Job<JobEnvelope<"sync">>> {
  return enqueue("sync", payload.workspaceId, payload, options);
}

/** Enqueue an Action Engine execution job. */
export function enqueueActionExecution(
  payload: QueuePayload<"action-exec">,
  options?: EnqueueOptions
): Promise<Job<JobEnvelope<"action-exec">>> {
  return enqueue("action-exec", payload.workspaceId, payload, options);
}

/** Enqueue an AI generation job. */
export function enqueueGenerationJob(
  payload: QueuePayload<"generation">,
  options?: EnqueueOptions
): Promise<Job<JobEnvelope<"generation">>> {
  return enqueue("generation", payload.workspaceId, payload, options);
}
