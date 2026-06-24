/**
 * Ask Ultrametrics — Change Intelligence Engine orchestrator (Sprint 12, Phase A).
 *
 * Thin, pure entry point over the decomposition engine. Phase A is account-level
 * only: it takes two already-derived window totals + a comparability flag (the
 * SAME contract the executive-summary trend path already uses — both windows
 * "ok", equal length, same window mode) and returns one grounded
 * ChangeExplanation per requested metric.
 *
 * No I/O, no fetching, no tool wiring (that is Phase B). Re-exports the engine's
 * public types so callers import a single module.
 */

import type { MetricTotals } from "@/lib/metrics/types";
import {
  explainChange,
  type ChangeExplanation,
  type ChangeMetric,
} from "@/lib/ai/change/change-analysis";

export type {
  ChangeExplanation,
  ChangeMetric,
  ChangeStatus,
  ChangeConfidence,
  ChangeDirection,
  ChangeDriver,
  Attribution,
} from "@/lib/ai/change/change-analysis";

export interface DeriveChangeOptions {
  /** Both windows are "ok", equal-length, and the same window mode. */
  comparable: boolean;
  /** Length of each window in days (used only for the human-readable basis). */
  lookbackDays: number;
}

/**
 * Explain the change in a single headline metric between two account windows.
 * Returns insufficient_data (no numbers, no cause) when the windows aren't
 * comparable or a window is missing — never a fabricated cause.
 */
export function deriveChange(
  current: MetricTotals | null,
  previous: MetricTotals | null,
  metric: ChangeMetric,
  opts: DeriveChangeOptions
): ChangeExplanation {
  return explainChange(current, previous, metric, opts);
}

/**
 * Convenience: explain several headline metrics over the same window pair in one
 * call. Order of the result mirrors `metrics`. Pure; each entry is independently
 * gated, so a thin-volume metric returns insufficient_data without affecting the
 * others.
 */
export function deriveChanges(
  current: MetricTotals | null,
  previous: MetricTotals | null,
  metrics: ChangeMetric[],
  opts: DeriveChangeOptions
): ChangeExplanation[] {
  return metrics.map((m) => deriveChange(current, previous, m, opts));
}
