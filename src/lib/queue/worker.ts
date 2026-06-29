/**
 * BullMQ Worker runtime (Sprint 56C — Worker Runtime).
 *
 * Creates one BullMQ Worker per queue, each driven by its log-only processor
 * (processors.ts), and wires job-lifecycle + queue-event logging. SCOPE:
 * consume + log only — no business logic, no Meta/Google/AI, no Scheduler.
 *
 * Workers use a DEDICATED Redis connection (separate from the Queue/producer
 * connection in connection.ts): BullMQ issues blocking commands from workers and
 * recommends not sharing that socket with queues. We build it here from the same
 * REDIS_URL (fail-closed) without modifying the foundation singleton.
 */

import { Worker, type ConnectionOptions, type Job } from "bullmq";
import IORedis, { type Redis } from "ioredis";
import { resolveRedisUrl } from "./connection";
import { PROCESSORS } from "./processors";
import { QUEUE_NAMES, type JobEnvelope, type QueueName } from "./types";

/** Dedicated worker connection options (blocking-safe, like the foundation's). */
function createWorkerConnection(): Redis {
  return new IORedis(resolveRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/** A running worker plus the connection it owns (so shutdown can close both). */
export interface RunningWorker {
  name: QueueName;
  worker: Worker;
  connection: Redis;
}

// One worker per queue name, started lazily by startWorkers().
const workers = new Map<QueueName, RunningWorker>();

/** Attach job-lifecycle + error logging to a worker. */
function attachLogging(name: QueueName, worker: Worker): void {
  worker.on("active", (job: Job) => {
    console.info(`[worker:${name}] job active`, { bullmqId: job.id });
  });
  worker.on("completed", (job: Job) => {
    console.info(`[worker:${name}] job completed`, { bullmqId: job.id });
  });
  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(`[worker:${name}] job failed`, {
      bullmqId: job?.id,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });
  });
  worker.on("error", (err: Error) => {
    console.error(`[worker:${name}] worker error`, { error: err.message });
  });
  worker.on("stalled", (jobId: string) => {
    console.warn(`[worker:${name}] job stalled`, { bullmqId: jobId });
  });
}

/** Create (and register) the worker for a single queue. Idempotent per name. */
export function createWorker<Q extends QueueName>(name: Q): RunningWorker {
  const existing = workers.get(name);
  if (existing) return existing;

  const connection = createWorkerConnection();
  const processor = PROCESSORS[name] as (
    job: Job<JobEnvelope<Q>>
  ) => Promise<void>;

  // BullMQ bundles its own ioredis copy; cast the connection at this boundary.
  const worker = new Worker<JobEnvelope<Q>>(name, processor, {
    connection: connection as unknown as ConnectionOptions,
  });
  attachLogging(name, worker);

  const running: RunningWorker = { name, worker, connection };
  workers.set(name, running);
  console.info(`[worker:${name}] started`);
  return running;
}

/**
 * Startup helper: create a worker for every known queue. Returns all running
 * workers. Call once from the worker host's entrypoint (a later sprint wires the
 * actual process; this only provides the helper).
 */
export function startWorkers(): RunningWorker[] {
  return QUEUE_NAMES.map((name) => createWorker(name));
}

/** All currently-running workers. */
export function getRunningWorkers(): RunningWorker[] {
  return Array.from(workers.values());
}

export interface WorkerHealth {
  name: QueueName;
  running: boolean;
}

/**
 * Worker health helper: which workers exist and whether each is running (not
 * closing/closed). Read-only.
 */
export function checkWorkerHealth(): {
  healthy: boolean;
  workers: WorkerHealth[];
} {
  const list = getRunningWorkers().map((w) => ({
    name: w.name,
    running: w.worker.isRunning(),
  }));
  const allUp =
    list.length === QUEUE_NAMES.length && list.every((w) => w.running);
  return { healthy: allUp, workers: list };
}

/**
 * Close every worker and its connection. Clears the registry so a later
 * startWorkers() re-creates them. Used by the shutdown handler.
 */
export async function closeAllWorkers(): Promise<void> {
  const running = getRunningWorkers();
  workers.clear();
  await Promise.all(
    running.map(async ({ name, worker, connection }) => {
      await worker.close();
      await connection.quit();
      console.info(`[worker:${name}] closed`);
    })
  );
}
