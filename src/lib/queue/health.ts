/**
 * Queue health check helper (Sprint 56A — Roadmap 8.0).
 *
 * Reports whether REDIS_URL is configured, whether the shared connection can
 * round-trip a PING, and per-queue job counts. Read-only: it opens/uses the
 * shared connection and reads counts but never enqueues, processes, or mutates
 * jobs.
 *
 * Intended for a future /api/health route or worker-host readiness probe.
 */

import {
  getRedisConnection,
  resolveRedisUrl,
  MissingRedisUrlError,
} from "./connection";
import { getQueue } from "./registry";
import { QUEUE_NAMES, type QueueName } from "./types";

export interface QueueHealth {
  name: QueueName;
  counts: Record<string, number>;
}

export interface QueueHealthReport {
  /** Overall: Redis configured AND reachable. */
  healthy: boolean;
  /** REDIS_URL present (does not imply reachable). */
  configured: boolean;
  /** PING round-tripped successfully. */
  reachable: boolean;
  queues: QueueHealth[];
  /** Short, non-sensitive failure reason when not healthy. */
  error?: string;
}

/**
 * Probe Redis and each queue. Never throws — failures are captured in the
 * returned report so callers can render a status without try/catch.
 */
export async function checkQueueHealth(): Promise<QueueHealthReport> {
  // 1. Configuration (fail-closed): is REDIS_URL set at all?
  try {
    resolveRedisUrl();
  } catch (err) {
    return {
      healthy: false,
      configured: false,
      reachable: false,
      queues: [],
      error:
        err instanceof MissingRedisUrlError
          ? "REDIS_URL is not set"
          : "invalid Redis configuration",
    };
  }

  // 2. Reachability: can we round-trip a PING?
  try {
    const pong = await getRedisConnection().ping();
    if (pong !== "PONG") {
      return {
        healthy: false,
        configured: true,
        reachable: false,
        queues: [],
        error: "unexpected PING response",
      };
    }
  } catch {
    return {
      healthy: false,
      configured: true,
      reachable: false,
      queues: [],
      error: "Redis unreachable",
    };
  }

  // 3. Per-queue job counts (read-only).
  const queues: QueueHealth[] = await Promise.all(
    QUEUE_NAMES.map(async (name) => ({
      name,
      counts: await getQueue(name).getJobCounts(),
    }))
  );

  return { healthy: true, configured: true, reachable: true, queues };
}
