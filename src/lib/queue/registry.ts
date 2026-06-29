/**
 * Queue registry + factory (Sprint 56A — Roadmap 8.0).
 *
 * Lazily constructs one BullMQ Queue per QueueName and caches it, so the rest of
 * the app shares a single Queue instance (and the single shared Redis
 * connection) per queue. This is the ONLY place Queues are created.
 *
 * SCOPE (Sprint 56A): Queue handles only. We do NOT create Workers here (no job
 * processing) and we do NOT enqueue jobs (no producers). Those arrive in later
 * sprints and will call getQueue() to obtain the shared handle.
 */

import { Queue, type ConnectionOptions, type QueueOptions } from "bullmq";
import { getRedisConnection } from "./connection";
import { QUEUE_NAMES, type QueueName, type JobEnvelope } from "./types";

/**
 * Default BullMQ job options applied to every queue. Conservative, transport-
 * level defaults only — engine-specific retry/backoff policy stays with the
 * Action/Generation engines and is out of scope for the foundation.
 */
const DEFAULT_QUEUE_OPTIONS: Omit<QueueOptions, "connection"> = {
  defaultJobOptions: {
    // Keep the queue from growing unbounded; tune per queue in later sprints.
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

// Cache of constructed queues, keyed by name. One Queue per process per name.
const registry = new Map<QueueName, Queue>();

/**
 * Return the shared BullMQ Queue for `name`, creating it on first access.
 * The generic ties the returned Queue's data type to the queue's payload
 * contract from types.ts, so producers (later) get compile-time-checked jobs.
 */
export function getQueue<Q extends QueueName>(name: Q): Queue<JobEnvelope<Q>> {
  const existing = registry.get(name);
  if (existing) return existing as Queue<JobEnvelope<Q>>;

  // BullMQ bundles its own ioredis copy, so the structurally-identical Redis
  // instance is treated as a distinct type; cast at this single boundary.
  const queue = new Queue(name, {
    connection: getRedisConnection() as unknown as ConnectionOptions,
    ...DEFAULT_QUEUE_OPTIONS,
  });

  registry.set(name, queue);
  return queue as Queue<JobEnvelope<Q>>;
}

/** All currently-instantiated queues (only those getQueue() has touched). */
export function getInstantiatedQueues(): Queue[] {
  return Array.from(registry.values());
}

/**
 * Eagerly instantiate every known queue and return them. Useful for health
 * checks and (later) for a worker host that wants all queues live at startup.
 */
export function getAllQueues(): Queue[] {
  return QUEUE_NAMES.map((name) => getQueue(name) as Queue);
}

/**
 * Close every instantiated queue and clear the registry (graceful shutdown /
 * tests). Does not close the shared Redis connection — see closeRedisConnection.
 */
export async function closeAllQueues(): Promise<void> {
  const queues = getInstantiatedQueues();
  registry.clear();
  await Promise.all(queues.map((q) => q.close()));
}
