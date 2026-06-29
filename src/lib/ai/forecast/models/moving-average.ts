/**
 * Moving Average forecast model (Sprint 62B).
 *
 * Flat projection at the mean of the last N observed points. Pure +
 * deterministic; the interval band uses the window's standard deviation.
 */

import { FORECAST_HORIZONS, type ForecastModel } from "../types";
import { mean, stdev } from "../math";
import { buildSeries } from "../series";

/** How many trailing points the average is taken over. */
const WINDOW = 7;

export const movingAverageModel: ForecastModel = {
  id: "moving-average",
  label: "Moving Average",
  horizons: FORECAST_HORIZONS,
  forecast(input) {
    const values = input.history.map((h) => h.value);
    const window = values.slice(-WINDOW);
    const avg = mean(window);
    const spread = stdev(window);
    return buildSeries(
      "moving-average",
      input,
      () => avg,
      spread,
      `Moving average of the last ${window.length} point(s)`,
      `Flat projection at the ${window.length}-point moving average; band from window volatility.`
    );
  },
};
