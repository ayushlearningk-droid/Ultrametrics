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
