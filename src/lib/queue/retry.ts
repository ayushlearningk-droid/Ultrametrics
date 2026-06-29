/**
 * Queue retry adapter (Sprint 56D — Retry & Dead Letter Queue).
 *
 * Bridges the EXISTING Action Engine retry policy (src/lib/actions/retry.ts)
 * into BullMQ terms. It does NOT define a new strategy and does NOT rewrite the
 * existing one — it imports and reuses MAX_ATTEMPTS / backoffMs / decideRetry /
 * ErrorClass so the queue and the engine share a single source of truth.
 *
 * SCOPE (Sprint 56D): classification + decision + logging helpers only. No
 * worker/producer changes, no execution, no provider calls. A later sprint wires
 * these into the worker's `failed` handler.
 */

import {
  decideRetry,
  isRetryable,
  backoffMs,
  MAX_ATTEMPTS,
  type ErrorClass,
  type RetryDecision,
} from "@/lib/actions/retry";

// Re-export the reused primitives so queue callers have one import surface and
// the shared ceiling is visible without reaching into the actions module.
export { MAX_ATTEMPTS, isRetryable, backoffMs };
export type { ErrorClass, RetryDecision };

/**
 * Map an arbitrary thrown error onto the engine's coarse ErrorClass. Heuristic
 * and provider-agnostic: inspects an optional numeric `status`/`statusCode` and
 * the message. Conservative — anything unrecognized is treated as `transient`
 * so a one-off blip gets the benefit of the existing retry budget rather than
 * being dead-lettered immediately.
 */
export function classifyError(error: unknown): ErrorClass {
  const status = readStatus(error);
  if (status != null) {
    if (status === 429) return "rate_limited";
    if (status === 401 || status === 403) return "auth";
    if (status === 400 || status === 404 || status === 422) return "validation";
    if (status >= 500) return "transient";
  }

  const message = readMessage(error).toLowerCase();
  if (/rate.?limit|too many requests|throttl/.test(message)) return "rate_limited";
  if (/unauthor|forbidden|invalid.?token|credential|permission denied/.test(message))
    return "auth";
  if (/invalid|validation|malformed|bad request|not found/.test(message))
    return "validation";
  if (/timeout|econnreset|etimedout|socket hang up|temporarily|unavailable|503/.test(message))
    return "transient";

  return "transient";
}

/** Pull a numeric HTTP-ish status off common error shapes, if present. */
function readStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const e = error as Record<string, unknown>;
  for (const key of ["status", "statusCode", "code"]) {
    const v = e[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

/** Best-effort error message extraction. */
function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

/**
 * Decide whether a failed BullMQ attempt should be retried, reusing the engine's
 * decideRetry. `attemptsMade` is BullMQ's count of completed attempts (1-based
 * after the first failure), matching the engine's 1-based attemptNo.
 *
 * Pure: pass a fixed `rng`/`now` for deterministic tests (defaults match the
 * engine's production behavior).
 */
export function decideJobRetry(
  error: unknown,
  attemptsMade: number,
  now: Date = new Date(),
  rng: () => number = Math.random
): RetryDecision & { errorClass: ErrorClass } {
  const errorClass = classifyError(error);
  return { errorClass, ...decideRetry(errorClass, attemptsMade, now, rng) };
}

/** Structured, non-sensitive log line for a retry decision. */
export interface RetryLogContext {
  queue: string;
  jobId?: string;
  workspaceId?: string;
}

/**
 * Log a retry decision (metadata only — never the error stack or any secret).
 * Emits a warn when retrying, error when giving up.
 */
export function logRetryDecision(
  decision: RetryDecision & { errorClass: ErrorClass },
  ctx: RetryLogContext
): void {
  const base = {
    ...ctx,
    errorClass: decision.errorClass,
    attemptNo: decision.attemptNo,
    maxAttempts: MAX_ATTEMPTS,
  };
  if (decision.retry) {
    console.warn(`[retry:${ctx.queue}] retrying job`, {
      ...base,
      nextAttemptNo: decision.nextAttemptNo,
      nextRetryAt: decision.nextRetryAt?.toISOString() ?? null,
    });
  } else {
    console.error(`[retry:${ctx.queue}] retries exhausted — dead-lettering`, base);
  }
}
