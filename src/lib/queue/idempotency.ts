/**
 * Deterministic idempotency helpers (Sprint 56B — producers).
 *
 * Two pure, deterministic functions:
 *   - idempotencyKeyFor : a human-readable, stable key from the queue name and
 *                         the identifying fields of a payload.
 *   - jobIdFor          : a short, fixed-length hash of that key, used as the
 *                         BullMQ jobId so re-enqueuing the same logical job is a
 *                         no-op (BullMQ dedups on jobId).
 *
 * Determinism is the whole point: the SAME inputs must always yield the SAME
 * key/jobId, across processes and restarts. No timestamps, randomness, or
 * environment is mixed in. createdAt lives in the envelope, never in the key.
 *
 * No I/O, no queue access — safe to unit-test in isolation.
 */

import { createHash } from "node:crypto";
import type { QueueName, QueuePayload } from "./types";

/**
 * The identifying fields per queue that make a job unique. Chosen so that two
 * requests describing the same work collapse to one job, while genuinely
 * different work stays distinct.
 */
const KEY_FIELDS: { [Q in QueueName]: (p: QueuePayload<Q>) => string[] } = {
  sync: (p) => [p.connectorId, p.workspaceId, p.requestedAt ?? ""],
  "action-exec": (p) => [p.actionId, p.workspaceId],
  generation: (p) => [p.generationId, p.workspaceId],
};

/** Normalize a single field: trim and lowercase so trivial variations collapse. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Build the deterministic idempotency key for a job. Shape:
 *   "<queue>:<field1>|<field2>|..."
 * The queue name namespaces the key so identical ids on different queues never
 * collide.
 */
export function idempotencyKeyFor<Q extends QueueName>(
  queue: Q,
  payload: QueuePayload<Q>
): string {
  const fields = KEY_FIELDS[queue](payload).map(normalize);
  return `${queue}:${fields.join("|")}`;
}

/**
 * Derive a stable BullMQ jobId from an idempotency key. A sha256 hex digest
 * (truncated) — collision-resistant, fixed length, and safe as a Redis key
 * segment. Prefixed with the queue name for readability in dashboards.
 */
export function jobIdFromKey(queue: QueueName, idempotencyKey: string): string {
  const digest = createHash("sha256")
    .update(idempotencyKey)
    .digest("hex")
    .slice(0, 32);
  return `${queue}-${digest}`;
}

/** Convenience: idempotency key + jobId in one call. */
export function jobIdentity<Q extends QueueName>(
  queue: Q,
  payload: QueuePayload<Q>
): { idempotencyKey: string; jobId: string } {
  const idempotencyKey = idempotencyKeyFor(queue, payload);
  return { idempotencyKey, jobId: jobIdFromKey(queue, idempotencyKey) };
}
