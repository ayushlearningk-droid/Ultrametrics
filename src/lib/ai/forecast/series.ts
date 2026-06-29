/**
 * Forecast series generation (Sprint 62B).
 *
 * The shared, deterministic assembler every model uses to turn a per-step value
 * function + a volatility spread into a ForecastSeries (dated points with an
 * interval band + reused confidence). Pure; no I/O, no clock, no randomness.
 */

import { horizonDays } from "./horizons";
import { buildForecastConfidence } from "./confidence";
import {
  addDaysISO,
  round,
  clampNonNegative,
  bandHalfWidth,
  evidenceFromSampleSize,
} from "./math";
import type { ForecastInput, ForecastPoint, ForecastSeries } from "./types";

/**
 * Build a ForecastSeries. `valueAt(step)` returns the predicted value for the
 * step-th day ahead (1-based); `spread` is the base interval half-width
 * (historical volatility), widened per step by bandHalfWidth. Values and bounds
 * are clamped non-negative and rounded for determinism. Returns an empty-points
 * series when there is no history to anchor dates to (never throws).
 */
export function buildSeries(
  modelId: string,
  input: ForecastInput,
  valueAt: (step: number) => number,
  spread: number,
  basis: string,
  rationale: string
): ForecastSeries {
  const days = horizonDays(input.horizon);
  const lastDate = input.history[input.history.length - 1]?.date ?? "";
  const points: ForecastPoint[] = [];

  if (lastDate) {
    for (let step = 1; step <= days; step++) {
      const date = addDaysISO(lastDate, step);
      if (!date) break; // unparseable history date — stop deterministically
      const value = clampNonNegative(round(valueAt(step)));
      const half = Math.max(0, round(bandHalfWidth(spread, step)));
      points.push({
        date,
        value,
        lower: clampNonNegative(round(value - half)),
        upper: clampNonNegative(round(value + half)),
      });
    }
  }

  const evidence = evidenceFromSampleSize(input.history.length);
  return {
    metric: input.metric,
    horizon: input.horizon,
    modelId,
    points,
    confidence: buildForecastConfidence(evidence, rationale),
    basis,
  };
}
