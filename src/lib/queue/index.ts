/**
 * Queue infrastructure barrel (Sprint 56A — Roadmap 8.0).
 *
 * Public surface of the queue foundation. Foundation only: connection singleton,
 * typed queue names + payloads, Queue registry/factory, typed accessors, and a
 * health check helper. No Workers, producers, or consumers are exported because
 * none exist yet (later sprints).
 */

// Connection singleton.
export {
  getRedisConnection,
  closeRedisConnection,
  resolveRedisUrl,
  MissingRedisUrlError,
} from "./connection";

// Typed queue names + payload contracts.
export {
  QUEUE_NAMES,
  isQueueName,
  JOB_PRIORITY,
  type QueueName,
  type QueuePayload,
  type QueuePayloads,
  type JobEnvelope,
  type JobPriorityName,
  type JobPriorityValue,
  type RetryPolicy,
} from "./types";

// Deterministic idempotency helpers.
export {
  idempotencyKeyFor,
  jobIdFromKey,
  jobIdentity,
} from "./idempotency";

// Producers (the only enqueue path).
export {
  enqueueSyncJob,
  enqueueActionExecution,
  enqueueGenerationJob,
  type EnqueueOptions,
} from "./producers";

// Worker runtime (consume + log only).
export {
  createWorker,
  startWorkers,
  getRunningWorkers,
  checkWorkerHealth,
  closeAllWorkers,
  type RunningWorker,
  type WorkerHealth,
} from "./worker";

// Graceful shutdown.
export {
  registerShutdownHandlers,
  shutdownQueueRuntime,
} from "./shutdown";

// Registry / factory.
export {
  getQueue,
  getAllQueues,
  getInstantiatedQueues,
  closeAllQueues,
} from "./registry";

// Typed per-queue accessors.
export { syncQueue, actionExecQueue, generationQueue } from "./queues";

// Health check.
export {
  checkQueueHealth,
  type QueueHealth,
  type QueueHealthReport,
} from "./health";

// Retry adapter (reuses src/lib/actions/retry.ts).
export {
  classifyError,
  decideJobRetry,
  logRetryDecision,
  MAX_ATTEMPTS,
  isRetryable,
  backoffMs,
  type ErrorClass,
  type RetryDecision,
  type RetryLogContext,
} from "./retry";

// Dead Letter Queue (standalone, outside QUEUE_NAMES).
export {
  DEAD_LETTER_QUEUE_NAME,
  getDeadLetterQueue,
  shouldDeadLetter,
  routeToDeadLetter,
  getDeadLetterCounts,
  closeDeadLetterQueue,
  type DeadLetterRecord,
  type DeadLetterInput,
} from "./dead-letter";
