/**
 * Graceful shutdown (Sprint 56C — Worker Runtime).
 *
 * Registers SIGINT / SIGTERM handlers that drain and close the worker runtime
 * cleanly: stop accepting new jobs, let in-flight processors finish, then close
 * workers (and their connections), the queue registry, and the shared Redis
 * connection. Idempotent — repeated signals during shutdown are ignored.
 *
 * SCOPE: lifecycle only. No business logic; nothing here runs jobs.
 */

import { closeAllWorkers } from "./worker";
import { closeAllQueues } from "./registry";
import { closeRedisConnection } from "./connection";

type Signal = "SIGINT" | "SIGTERM";
const SIGNALS: Signal[] = ["SIGINT", "SIGTERM"];

let shuttingDown = false;
let registered = false;

/**
 * Close the worker runtime in order: workers → queues → shared connection.
 * Safe to call directly (tests) and idempotent.
 */
export async function shutdownQueueRuntime(reason = "manual"): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[queue] shutting down (${reason})…`);
  try {
    await closeAllWorkers();
    await closeAllQueues();
    await closeRedisConnection();
    console.info("[queue] shutdown complete");
  } catch (err) {
    console.error("[queue] error during shutdown", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Register SIGINT/SIGTERM handlers once. The worker host's entrypoint (later
 * sprint) calls this after startWorkers(); this only provides the helper.
 */
export function registerShutdownHandlers(): void {
  if (registered) return;
  registered = true;
  for (const signal of SIGNALS) {
    process.once(signal, async () => {
      await shutdownQueueRuntime(signal);
      // Exit 0: a signalled drain is a clean stop, not a crash.
      process.exit(0);
    });
  }
}
