/**
 * Worker heartbeat (Sprint 57 — Observability).
 *
 * The worker process (Railway) and the dashboard API (Vercel) run in DIFFERENT
 * processes, so in-memory worker state (worker.ts) is invisible to the API. This
 * bridges that gap with a tiny Redis heartbeat: the worker writes startedAt /
 * version / pid once on boot and refreshes `lastSeenAt` on an interval; the API
 * reads it cross-process. Metadata only — no job data, no secrets.
 *
 * Read-only at runtime for everything except the worker's own bootstrap, which
 * calls startWorkerHeartbeat(). Nothing here executes jobs or providers.
 */

import { getRedisConnection } from "@/lib/queue";

/** Single Redis hash holding the worker's liveness metadata. */
export const WORKER_HEARTBEAT_KEY = "ultrametrics:observability:worker:heartbeat";

/** How often the worker refreshes lastSeenAt. */
const REFRESH_MS = 15_000;
/** Key TTL — a few refresh cycles, so a dead worker's key expires on its own. */
const TTL_SECONDS = 60;
/** Reader-side staleness threshold for lastSeenAt. */
const STALE_AFTER_MS = 45_000;

function workerVersion(): string {
  return (
    process.env.WORKER_VERSION ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.npm_package_version ||
    "unknown"
  );
}

/**
 * Begin publishing the heartbeat. Called once from the worker bootstrap AFTER
 * startWorkers(). Returns a stop() that clears the refresh timer (best-effort;
 * the key also self-expires via TTL once refreshes stop).
 */
export async function startWorkerHeartbeat(): Promise<() => void> {
  const conn = getRedisConnection();
  const startedAt = new Date().toISOString();
  const version = workerVersion();
  const pid = String(process.pid);

  async function write(lastSeenAt: string): Promise<void> {
    await conn.hset(WORKER_HEARTBEAT_KEY, {
      startedAt,
      version,
      pid,
      lastSeenAt,
    });
    await conn.expire(WORKER_HEARTBEAT_KEY, TTL_SECONDS);
  }

  await write(startedAt);

  const timer = setInterval(() => {
    void write(new Date().toISOString()).catch(() => {
      // Heartbeat write failures must never crash the worker.
    });
  }, REFRESH_MS);
  // Don't keep the event loop alive solely for the heartbeat.
  timer.unref();

  return () => clearInterval(timer);
}

export interface WorkerHeartbeat {
  present: boolean;
  startedAt: string | null;
  version: string | null;
  pid: number | null;
  lastSeenAt: string | null;
  uptimeMs: number | null;
  /** True when lastSeenAt is older than STALE_AFTER_MS (worker likely down). */
  stale: boolean;
}

/** Read the heartbeat cross-process. Never throws; absence → present:false. */
export async function readWorkerHeartbeat(): Promise<WorkerHeartbeat> {
  const empty: WorkerHeartbeat = {
    present: false,
    startedAt: null,
    version: null,
    pid: null,
    lastSeenAt: null,
    uptimeMs: null,
    stale: true,
  };

  try {
    const h = await getRedisConnection().hgetall(WORKER_HEARTBEAT_KEY);
    if (!h || !h.startedAt) return empty;

    const now = Date.now();
    const startedMs = Date.parse(h.startedAt);
    const lastSeenMs = h.lastSeenAt ? Date.parse(h.lastSeenAt) : NaN;

    return {
      present: true,
      startedAt: h.startedAt,
      version: h.version ?? null,
      pid: h.pid ? Number(h.pid) : null,
      lastSeenAt: h.lastSeenAt ?? null,
      uptimeMs: Number.isFinite(startedMs) ? now - startedMs : null,
      stale: !Number.isFinite(lastSeenMs) || now - lastSeenMs > STALE_AFTER_MS,
    };
  } catch {
    return empty;
  }
}
