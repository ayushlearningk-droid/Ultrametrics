/**
 * Redis connection singleton (Sprint 56A — Roadmap 8.0).
 *
 * A single shared ioredis connection for the whole process, resolved from
 * REDIS_URL. BullMQ Queues, Workers, and QueueEvents can all share one
 * connection, so we create exactly one and reuse it via the registry.
 *
 * Fail-closed: if REDIS_URL is missing we throw rather than silently falling
 * back to localhost. Queue infrastructure must never quietly point at the wrong
 * Redis.
 *
 * SCOPE (Sprint 56A): connection only. No Worker, producer, or consumer here.
 */

import IORedis, { type Redis, type RedisOptions } from "ioredis";

/** Thrown when REDIS_URL is absent — fail closed instead of guessing. */
export class MissingRedisUrlError extends Error {
  constructor() {
    super(
      "REDIS_URL is not set. The queue infrastructure requires a Redis " +
        "connection and will not fall back to a default host."
    );
    this.name = "MissingRedisUrlError";
  }
}

/**
 * Resolve REDIS_URL or fail closed. Exported so health checks / startup
 * validation can assert configuration without opening a connection.
 */
export function resolveRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url || url.trim() === "") {
    throw new MissingRedisUrlError();
  }
  return url;
}

/**
 * BullMQ requires `maxRetriesPerRequest: null` on the underlying ioredis
 * connection (blocking commands must not be capped). `enableReadyCheck: false`
 * avoids spurious readiness probes against managed Redis providers.
 */
const BULLMQ_CONNECTION_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Module-level singleton. One connection per process, created lazily on first
// access so that merely importing this module never opens a socket.
let connection: Redis | null = null;

/**
 * Return the shared ioredis connection, creating it on first call.
 * Fail-closed if REDIS_URL is missing.
 */
export function getRedisConnection(): Redis {
  if (connection) return connection;
  const url = resolveRedisUrl();
  connection = new IORedis(url, BULLMQ_CONNECTION_OPTIONS);
  return connection;
}

/**
 * Close the shared connection (graceful shutdown / tests). Safe to call when no
 * connection has been opened. Resets the singleton so a later call re-creates it.
 */
export async function closeRedisConnection(): Promise<void> {
  if (!connection) return;
  const current = connection;
  connection = null;
  await current.quit();
}
