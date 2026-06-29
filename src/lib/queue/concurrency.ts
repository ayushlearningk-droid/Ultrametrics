/**
 * Concurrency configuration (Sprint 56E — Queue Scheduling & Rate Control).
 *
 * Declarative per-queue worker concurrency, plus optional provider caps. SCOPE:
 * configuration + pure lookups only. It does NOT create or modify workers —
 * a worker host (later sprint) reads getConcurrency(queue) when constructing a
 * BullMQ Worker. Nothing here executes jobs or calls a provider.
 */

import type { QueueName } from "./types";
import type { RateLimitProvider } from "./rate-limiter";

/** How many jobs a single worker processes in parallel, per queue. */
export const QUEUE_CONCURRENCY: { [Q in QueueName]: number } = {
  sync: 5,
  "action-exec": 10,
  generation: 3,
};

/**
 * Optional upper bound on simultaneous in-flight ops per provider, independent
 * of queue concurrency (a provider may be touched by more than one queue).
 */
export const PROVIDER_CONCURRENCY: { [P in RateLimitProvider]: number } = {
  meta: 8,
  google: 12,
  google_ads: 4,
  internal: 50,
};

/** Concurrency for a queue's worker. */
export function getConcurrency(queue: QueueName): number {
  return QUEUE_CONCURRENCY[queue];
}

/** Concurrency cap for a provider. */
export function getProviderConcurrency(provider: RateLimitProvider): number {
  return PROVIDER_CONCURRENCY[provider];
}

/**
 * Pure check: would starting one more job exceed the queue's concurrency? Caller
 * supplies the count currently in-flight for that queue's worker.
 */
export function hasConcurrencyHeadroom(
  queue: QueueName,
  activeCount: number
): boolean {
  return activeCount < getConcurrency(queue);
}
