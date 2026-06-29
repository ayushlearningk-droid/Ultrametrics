/**
 * BullMQ worker bootstrap (Sprint 57A — Worker Bootstrap).
 *
 * The always-on entrypoint Railway runs (`npm run worker`). It does the minimum
 * to make the ALREADY-BUILT worker runtime actually start: verify Redis, start
 * the workers, register graceful shutdown, then idle waiting for jobs.
 *
 * No business logic, no queue redesign, no execution changes — it only wires the
 * existing helpers together:
 *   getRedisConnection() → startWorkers() → registerShutdownHandlers()
 *
 * Run: npx -y tsx scripts/worker.ts   (mirrors the ai:eval / backfill scripts).
 */

import {
  startWorkers,
  registerShutdownHandlers,
  getRedisConnection,
} from "@/lib/queue";

async function main(): Promise<void> {
  console.info("Worker starting...");

  // Fail-closed: getRedisConnection() throws if REDIS_URL is missing. A PING
  // confirms the connection is live before we start consuming.
  await getRedisConnection().ping();
  console.info("Redis connected");

  // Reuse the existing runtime — one BullMQ Worker per queue.
  startWorkers();
  console.info("Workers started");

  // Reuse the existing SIGINT/SIGTERM drain → close workers/queues/connection.
  registerShutdownHandlers();

  // Startup-only shutdown markers (logging only; the drain itself is handled by
  // registerShutdownHandlers, which exits 0 once workers are closed).
  const onSignal = () => console.info("Shutdown received");
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  process.on("exit", () => console.info("Worker stopped"));

  console.info("Ready for jobs");
}

main().catch((err) => {
  console.error(
    "Worker failed to start:",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
});
