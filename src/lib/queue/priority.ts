/**
 * Typed priority levels (Sprint 56E — Queue Scheduling & Rate Control).
 *
 * A thin, typed layer over the foundation's JOB_PRIORITY map (types.ts). Gives
 * callers an ordered notion of priority and pure helpers to resolve/compare it,
 * without re-defining the numeric scale. SCOPE: pure config + pure functions —
 * no queue access, no execution, no producer/worker changes.
 */

import {
  JOB_PRIORITY,
  type JobPriorityName,
  type JobPriorityValue,
} from "./types";

/** Priority names ordered most-urgent → least-urgent. */
export const PRIORITY_ORDER: readonly JobPriorityName[] = [
  "high",
  "normal",
  "low",
] as const;

/** Resolve a priority name to its BullMQ numeric value (lower = more urgent). */
export function priorityValue(name: JobPriorityName): JobPriorityValue {
  return JOB_PRIORITY[name];
}

/**
 * Resolve a numeric BullMQ priority back to the nearest named level. Useful for
 * logging/inspection. Exact matches map directly; anything else maps to the
 * closest defined value.
 */
export function priorityName(value: number): JobPriorityName {
  let closest: JobPriorityName = "normal";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const name of PRIORITY_ORDER) {
    const delta = Math.abs(JOB_PRIORITY[name] - value);
    if (delta < bestDelta) {
      bestDelta = delta;
      closest = name;
    }
  }
  return closest;
}

/**
 * Compare two priority names. Returns < 0 if `a` is MORE urgent than `b`,
 * > 0 if less urgent, 0 if equal — so an ascending sort puts urgent first.
 */
export function comparePriority(a: JobPriorityName, b: JobPriorityName): number {
  return JOB_PRIORITY[a] - JOB_PRIORITY[b];
}

/** Whether `a` is strictly more urgent than `b`. */
export function isMoreUrgent(a: JobPriorityName, b: JobPriorityName): boolean {
  return comparePriority(a, b) < 0;
}
