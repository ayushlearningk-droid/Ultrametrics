/**
 * Forecast math helpers (Sprint 62B).
 *
 * Pure, deterministic numeric + date utilities shared by the forecast models.
 * No I/O, no randomness, no Date.now() — future dates are derived strictly from
 * the (explicit) last history date. No side effects.
 */

import type { EvidenceLevel } from "./types";

/** Round to a fixed precision so float noise never makes output non-deterministic. */
export function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Clamp to non-negative (forecast metrics are never negative). */
export function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

/** Arithmetic mean (0 for an empty list). */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Population standard deviation (0 when fewer than 2 values). */
export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Add `days` to an ISO date (YYYY-MM-DD) deterministically via UTC. Uses
 * Date.parse on an explicit string — NEVER Date.now(). Returns "" for an
 * unparseable input so callers can guard.
 */
export function addDaysISO(iso: string, days: number): string {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Evidence grade from history sample size: ≥30 strong, ≥14 moderate, else
 * limited. Pure lookup feeding the reused confidence model.
 */
export function evidenceFromSampleSize(n: number): EvidenceLevel {
  if (n >= 30) return "strong";
  if (n >= 14) return "moderate";
  return "limited";
}

/**
 * Half-width of the interval band for a point `step` ahead. The base spread
 * (historical volatility) widens 10% per step further out — deterministic.
 */
export function bandHalfWidth(spread: number, step: number): number {
  return spread * (1 + 0.1 * (step - 1));
}
