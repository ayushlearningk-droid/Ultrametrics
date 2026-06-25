/**
 * Action Engine — retry policy (Sprint 14A).
 *
 * Pure functions describing WHEN and WHETHER a failed execution attempt should
 * be retried. No I/O, no scheduling, no provider logic — the executor/worker
 * consumes these decisions. Defined now so the lifecycle is complete; in the
 * dry-run sprint nothing fails, so nothing is retried yet.
 */

/** Hard ceiling on attempts (attempt_no is 1-based, so 4 = original + 3 retries). */
export const MAX_ATTEMPTS = 4;

/** Base backoff in milliseconds; doubles each attempt (exponential). */
export const BASE_BACKOFF_MS = 30_000;

/** Upper bound so backoff never grows unbounded. */
export const MAX_BACKOFF_MS = 15 * 60_000;

/** Full jitter fraction applied to the computed delay (0..1). */
export const JITTER_RATIO = 0.2;

/**
 * Coarse, provider-agnostic error classes the executor maps provider errors
 * onto. Only `transient` and `rate_limited` are retryable; the rest are
 * terminal (retrying cannot help). Permanent / auth / validation failures must
 * surface to the user instead of looping.
 */
export type ErrorClass =
  | "transient"
  | "rate_limited"
  | "auth"
  | "validation"
  | "permanent";

const RETRYABLE: ReadonlySet<ErrorClass> = new Set(["transient", "rate_limited"]);

/** Whether an error class is eligible for retry at all. */
export function isRetryable(errorClass: ErrorClass): boolean {
  return RETRYABLE.has(errorClass);
}

/**
 * Decide whether another attempt should be scheduled, given the error class and
 * how many attempts have already run. Retryable AND under the attempt ceiling.
 */
export function shouldRetry(errorClass: ErrorClass, attemptNo: number): boolean {
  return isRetryable(errorClass) && attemptNo < MAX_ATTEMPTS;
}

/**
 * Exponential backoff with full jitter for the NEXT attempt. `attemptNo` is the
 * attempt that just failed (1-based). Deterministic when a `rng` is supplied
 * (tests pass a fixed value); defaults to Math.random for production jitter.
 */
export function backoffMs(
  attemptNo: number,
  rng: () => number = Math.random
): number {
  const exp = Math.min(BASE_BACKOFF_MS * 2 ** (attemptNo - 1), MAX_BACKOFF_MS);
  const jitter = exp * JITTER_RATIO * rng();
  return Math.round(exp - exp * JITTER_RATIO + jitter);
}

/** Absolute timestamp for the next attempt, derived from backoffMs. */
export function nextRetryAt(
  attemptNo: number,
  now: Date = new Date(),
  rng: () => number = Math.random
): Date {
  return new Date(now.getTime() + backoffMs(attemptNo, rng));
}

/** The full retry decision for a failed attempt — what the executor records. */
export interface RetryDecision {
  retry: boolean;
  attemptNo: number;
  nextAttemptNo: number;
  nextRetryAt: Date | null;
}

export function decideRetry(
  errorClass: ErrorClass,
  attemptNo: number,
  now: Date = new Date(),
  rng: () => number = Math.random
): RetryDecision {
  const retry = shouldRetry(errorClass, attemptNo);
  return {
    retry,
    attemptNo,
    nextAttemptNo: retry ? attemptNo + 1 : attemptNo,
    nextRetryAt: retry ? nextRetryAt(attemptNo, now, rng) : null,
  };
}
