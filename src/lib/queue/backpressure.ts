/**
 * Backpressure detection & admission control (Sprint 56E).
 *
 * PURE helpers that decide whether the system should accept more work right now,
 * combining queue depth (backpressure), worker concurrency headroom, and the
 * provider rate-limit profile. SCOPE: decision logic only — callers pass in
 * observed counts; nothing here reads/writes Redis, runs jobs, or calls a
 * provider. A scheduler/producer (later sprint) consumes these decisions.
 */

import type { QueueName } from "./types";
import { hasConcurrencyHeadroom } from "./concurrency";
import {
  isWithinRateLimit,
  suggestedDelayMs,
  getRateLimitProfile,
  type RateLimitProvider,
} from "./rate-limiter";

/** How loaded a queue is, by waiting-job depth. */
export type BackpressureLevel = "ok" | "elevated" | "high" | "critical";

/** Depth thresholds (waiting jobs) at which each level begins, per queue. */
export const BACKPRESSURE_THRESHOLDS: {
  [Q in QueueName]: { elevated: number; high: number; critical: number };
} = {
  sync: { elevated: 100, high: 500, critical: 2_000 },
  "action-exec": { elevated: 200, high: 1_000, critical: 5_000 },
  generation: { elevated: 50, high: 250, critical: 1_000 },
};

/** Classify a queue's waiting depth into a backpressure level. */
export function detectBackpressure(
  queue: QueueName,
  waitingCount: number
): BackpressureLevel {
  const t = BACKPRESSURE_THRESHOLDS[queue];
  if (waitingCount >= t.critical) return "critical";
  if (waitingCount >= t.high) return "high";
  if (waitingCount >= t.elevated) return "elevated";
  return "ok";
}

/** Observed counts an admission decision needs (all caller-supplied). */
export interface AdmissionSignals {
  queue: QueueName;
  /** Jobs waiting in the queue. */
  waitingCount: number;
  /** Jobs currently active on the queue's worker. */
  activeCount: number;
  /** Optional provider gate for this work. */
  provider?: RateLimitProvider;
  /** Ops already counted in the provider's current rate window. */
  providerCountInWindow?: number;
}

/** Why admission was (not) granted. */
export type AdmissionReason =
  | "ok"
  | "backpressure-critical"
  | "no-concurrency-headroom"
  | "rate-limited";

export interface AdmissionDecision {
  admit: boolean;
  reason: AdmissionReason;
  backpressure: BackpressureLevel;
  /** Suggested wait (ms) before retrying admission; 0 when admitted. */
  retryAfterMs: number;
}

/**
 * Queue admission decision: should one more job be admitted now?
 *
 * Order of gates (most-blocking first):
 *   1. critical backpressure → reject
 *   2. no worker concurrency headroom → reject
 *   3. provider rate limit exceeded → reject (with suggested delay)
 *   4. otherwise admit (reason carries the current backpressure level)
 *
 * Pure and deterministic for given signals.
 */
export function decideAdmission(signals: AdmissionSignals): AdmissionDecision {
  const backpressure = detectBackpressure(signals.queue, signals.waitingCount);

  if (backpressure === "critical") {
    return {
      admit: false,
      reason: "backpressure-critical",
      backpressure,
      retryAfterMs: 1_000,
    };
  }

  if (!hasConcurrencyHeadroom(signals.queue, signals.activeCount)) {
    return {
      admit: false,
      reason: "no-concurrency-headroom",
      backpressure,
      retryAfterMs: 500,
    };
  }

  if (signals.provider) {
    const profile = getRateLimitProfile(signals.provider);
    const count = signals.providerCountInWindow ?? 0;
    if (!isWithinRateLimit(profile, count)) {
      return {
        admit: false,
        reason: "rate-limited",
        backpressure,
        retryAfterMs: suggestedDelayMs(profile, count),
      };
    }
  }

  return { admit: true, reason: "ok", backpressure, retryAfterMs: 0 };
}
