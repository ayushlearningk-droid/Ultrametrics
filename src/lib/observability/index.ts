/**
 * Observability layer barrel (Sprint 57 — Observability). READ-ONLY.
 *
 * Aggregates the queue/worker/retry/provider/telemetry surfaces built on top of
 * the existing queue infrastructure. Nothing here executes jobs or providers,
 * mutates queues, or changes scheduling — it only reads and summarizes.
 */

import { getQueueMetrics } from "./queue-metrics";
import { getWorkerStatus } from "./worker-status";
import { getRetryAnalytics } from "./retry-analytics";
import { getProviderHealth } from "./provider-health";
import { getTelemetry } from "./telemetry";

export { getQueueMetrics, type QueueMetric, type QueueMetricsReport } from "./queue-metrics";
export {
  getWorkerStatus,
  type WorkerStatusReport,
  type QueueWorkerPresence,
} from "./worker-status";
export {
  getRetryAnalytics,
  type RetryAnalyticsReport,
  type QueueRetryStats,
  type ErrorTally,
} from "./retry-analytics";
export {
  getProviderHealth,
  type ProviderHealth,
  type ProviderHealthReport,
  type ProviderKey,
} from "./provider-health";
export { getTelemetry, type TelemetryReport, type QueueTelemetry } from "./telemetry";
export {
  startWorkerHeartbeat,
  readWorkerHeartbeat,
  WORKER_HEARTBEAT_KEY,
  type WorkerHeartbeat,
} from "./heartbeat";
export { isObservabilityAuthorized } from "./auth";

/** A single aggregate snapshot of the whole observability surface. */
export async function getObservabilitySnapshot() {
  const [queues, workers, retries, telemetry] = await Promise.all([
    getQueueMetrics(),
    getWorkerStatus(),
    getRetryAnalytics(),
    getTelemetry(),
  ]);
  return {
    collectedAt: new Date().toISOString(),
    queues,
    workers,
    retries,
    providers: getProviderHealth(),
    telemetry,
  };
}
