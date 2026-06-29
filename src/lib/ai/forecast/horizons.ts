/**
 * Forecast horizon definitions (Sprint 62A).
 *
 * Pure helpers over the FORECAST_HORIZONS vocabulary — the day-count mapping and
 * type guards. No algorithms, no I/O.
 */

import { FORECAST_HORIZONS, type ForecastHorizon } from "./types";

/** Number of days each horizon spans. */
export const HORIZON_DAYS: Record<ForecastHorizon, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
};

/** Days for a horizon. */
export function horizonDays(horizon: ForecastHorizon): number {
  return HORIZON_DAYS[horizon];
}

/** Runtime guard: narrow an arbitrary string to a ForecastHorizon. */
export function isForecastHorizon(value: string): value is ForecastHorizon {
  return (FORECAST_HORIZONS as readonly string[]).includes(value);
}
