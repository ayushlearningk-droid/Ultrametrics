/**
 * Provider rate-limit profiles (Sprint 56E — Queue Scheduling & Rate Control).
 *
 * Declarative, provider-specific rate-limit profiles plus PURE helpers to test a
 * request count against a sliding window. SCOPE: configuration + math only — no
 * Meta/Google API calls, no token storage, no execution. A scheduler/worker
 * (later) feeds in observed counts; nothing here performs I/O.
 */

/** Providers the queue may throttle against. Mirrors the connector providers. */
export type RateLimitProvider = "meta" | "google" | "google_ads" | "internal";

/** A sliding-window rate-limit profile: at most `limit` ops per `windowMs`. */
export interface RateLimitProfile {
  provider: RateLimitProvider;
  /** Max operations permitted within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional burst allowance above `limit` for short spikes. */
  burst?: number;
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

/**
 * Conservative default profiles. Numbers are deliberately below documented
 * provider ceilings to leave headroom; tune per environment later. These are
 * transport-pacing guidance, not authoritative provider quotas.
 */
export const RATE_LIMIT_PROFILES: { [P in RateLimitProvider]: RateLimitProfile } = {
  meta: { provider: "meta", limit: 200, windowMs: MINUTE, burst: 50 },
  google: { provider: "google", limit: 600, windowMs: MINUTE, burst: 100 },
  google_ads: { provider: "google_ads", limit: 120, windowMs: MINUTE, burst: 20 },
  internal: { provider: "internal", limit: 1_000, windowMs: MINUTE },
};

/** Look up a provider's profile. */
export function getRateLimitProfile(
  provider: RateLimitProvider
): RateLimitProfile {
  return RATE_LIMIT_PROFILES[provider];
}

/** The effective ceiling including any burst allowance. */
export function effectiveLimit(profile: RateLimitProfile): number {
  return profile.limit + (profile.burst ?? 0);
}

/**
 * Pure check: given how many ops have already occurred in the current window,
 * is one more permitted? Caller is responsible for counting within `windowMs`.
 */
export function isWithinRateLimit(
  profile: RateLimitProfile,
  countInWindow: number
): boolean {
  return countInWindow < effectiveLimit(profile);
}

/** Remaining capacity in the current window (never negative). */
export function remainingCapacity(
  profile: RateLimitProfile,
  countInWindow: number
): number {
  return Math.max(0, effectiveLimit(profile) - countInWindow);
}

/**
 * Suggested delay (ms) before the next op when the limit is reached. A simple,
 * even spread of `limit` ops across the window; 0 when capacity remains.
 */
export function suggestedDelayMs(
  profile: RateLimitProfile,
  countInWindow: number
): number {
  if (isWithinRateLimit(profile, countInWindow)) return 0;
  return Math.ceil(profile.windowMs / profile.limit);
}
