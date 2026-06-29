/**
 * Trend Projection forecast model (Sprint 62B).
 *
 * Ordinary least-squares linear fit over the history index, projected forward.
 * Pure + deterministic; the interval band uses the standard deviation of the
 * in-sample residuals (fit quality).
 */

import { FORECAST_HORIZONS, type ForecastModel } from "../types";
import { mean, stdev } from "../math";
import { buildSeries } from "../series";

export const trendProjectionModel: ForecastModel = {
  id: "trend-projection",
  label: "Trend Projection",
  horizons: FORECAST_HORIZONS,
  forecast(input) {
    const values = input.history.map((h) => h.value);
    const n = values.length;
    const xs = values.map((_, i) => i);
    const mx = mean(xs);
    const my = mean(values);

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (values[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = my - slope * mx;

    const residuals = values.map((v, i) => v - (intercept + slope * i));
    const spread = stdev(residuals);

    // Continue the line from the last observed index (n-1) forward.
    const base = n - 1;
    return buildSeries(
      "trend-projection",
      input,
      (step) => intercept + slope * (base + step),
      spread,
      `Linear least-squares trend over ${n} point(s)`,
      `Extends the fitted linear trend; band from residual spread (fit quality).`
    );
  },
};
