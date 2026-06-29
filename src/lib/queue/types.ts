/**
 * Queue type foundation (Sprint 56A — Roadmap 8.0).
 *
 * Typed queue names and the shape of job payloads. This file is intentionally
 * declarations-only: it defines NO producers, consumers, or workers — only the
 * vocabulary the registry and (future) producers/consumers will share.
 *
 * The three queues mirror the Sprint 56 audit recommendation:
 *   - "sync"        : connector data-sync jobs (today driven by the daily cron)
 *   - "action-exec" : Action Engine executions (today synchronous/HTTP-driven)
 *   - "generation"  : AI generation jobs
 *
 * Adding a queue: extend QUEUE_NAMES and add its payload to QueuePayloads.
 */

/**
 * The canonical list of queue names. `as const` makes each a literal so the
 * QueueName union below is exact (not widened to `string`).
 */
export const QUEUE_NAMES = ["sync", "action-exec", "generation"] as const;

/** Union of every valid queue name. */
export type QueueName = (typeof QUEUE_NAMES)[number];

/** Runtime guard: narrows an arbitrary string to a QueueName. */
export function isQueueName(value: string): value is QueueName {
  return (QUEUE_NAMES as readonly string[]).includes(value);
}

/**
 * Per-queue job payload contracts.
 *
 * These describe the data a job for each queue will carry once producers exist
 * (later sprints). They are deliberately minimal for the foundation — enough to
 * type the registry's factory generically without locking down internals that
 * the Action/Generation engines own. Each is keyed by QueueName so a queue and
 * its payload type can never drift apart.
 */
export interface QueuePayloads {
  sync: {
    connectorId: string;
    workspaceId: string;
    /** Optional ISO timestamp the sync was requested for. */
    requestedAt?: string;
  };
  "action-exec": {
    actionId: string;
    workspaceId: string;
  };
  generation: {
    generationId: string;
    workspaceId: string;
  };
}

/** Payload type for a specific queue. */
export type QueuePayload<Q extends QueueName> = QueuePayloads[Q];

/* ────────────────────────────────────────────────────────────────────────────
 * Job envelope (Sprint 56B — producers).
 *
 * Every enqueued job is wrapped in a self-describing envelope so the data row
 * itself carries the required metadata — jobId, workspaceId, createdAt,
 * priority, idempotencyKey, retryPolicy — independent of BullMQ's own job
 * options. jobId/priority/retryPolicy are ALSO passed to BullMQ as options
 * (for dedup + scheduling); mirroring them in the data keeps a job fully
 * traceable from its payload alone.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Named priorities mapped to BullMQ's numeric scale (lower = higher priority,
 * 1 is most urgent). Named here so producers never sprinkle magic numbers.
 */
export const JOB_PRIORITY = {
  high: 1,
  normal: 5,
  low: 10,
} as const;

export type JobPriorityName = keyof typeof JOB_PRIORITY;
export type JobPriorityValue = (typeof JOB_PRIORITY)[JobPriorityName];

/**
 * Declarative retry policy carried with every job. Mapped by producers onto
 * BullMQ's `attempts` + exponential `backoff` options. `backoffMs` is the base
 * delay that doubles each attempt.
 */
export interface RetryPolicy {
  attempts: number;
  backoff: {
    type: "exponential" | "fixed";
    backoffMs: number;
  };
}

/**
 * The data row BullMQ stores for a job: required metadata plus the domain
 * payload. Generic over QueueName so the embedded payload type matches the
 * queue it is enqueued on.
 */
export interface JobEnvelope<Q extends QueueName> {
  /** Deterministic, stable job id (also used as BullMQ jobId for dedup). */
  jobId: string;
  workspaceId: string;
  /** ISO timestamp the job was enqueued. */
  createdAt: string;
  /** Numeric BullMQ priority resolved from a JobPriorityName. */
  priority: JobPriorityValue;
  /** Deterministic idempotency key the jobId is derived from. */
  idempotencyKey: string;
  retryPolicy: RetryPolicy;
  /** Domain-specific fields for this queue. */
  payload: QueuePayload<Q>;
}
