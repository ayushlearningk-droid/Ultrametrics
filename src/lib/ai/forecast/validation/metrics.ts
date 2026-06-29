/**
 * Forecast error metrics (Sprint 62D).
 *
 * Pure, deterministic accuracy metrics over (actual, predicted) pairs: MAE,
 * RMSE, MAPE. No I/O, no randomness, no clock. Each returns null when it cannot
 * be computed (no pairs; MAPE additionally needs at least one non-zero actual).
 */

/** One observation: the realized value and what the model predicted. */
export interface ErrorPair {
  actual: number;
  predicted: number;
}

/** Round to a fixed precision so float noise never affects determinism. */
function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Mean Absolute Error. null when there are no pairs. */
export function mae(pairs: ErrorPair[]): number | null {
  if (pairs.length === 0) return null;
  const sum = pairs.reduce((a, p) => a + Math.abs(p.actual - p.predicted), 0);
  return round(sum / pairs.length);
}

/** Root Mean Squared Error. null when there are no pairs. */
export function rmse(pairs: ErrorPair[]): number | null {
  if (pairs.length === 0) return null;
  const sum = pairs.reduce((a, p) => a + (p.actual - p.predicted) ** 2, 0);
  return round(Math.sqrt(sum / pairs.length));
}

/**
 * Mean Absolute Percentage Error as a FRACTION (0.12 = 12%). Pairs whose actual
 * is 0 are skipped (undefined percentage); null when none remain.
 */
export function mape(pairs: ErrorPair[]): number | null {
  const usable = pairs.filter((p) => p.actual !== 0);
  if (usable.length === 0) return null;
  const sum = usable.reduce(
    (a, p) => a + Math.abs((p.actual - p.predicted) / p.actual),
    0
  );
  return round(sum / usable.length);
}
