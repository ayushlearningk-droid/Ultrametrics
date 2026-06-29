/**
 * Growth Rate forecast model (Sprint 62B).
 *
 * Compounds the average period-over-period growth rate from the last observed
 * value. Pure + deterministic; zero-valued previous points are skipped when
 * computing rates (no division by zero). Band uses historical volatility.
 */

import { FORECAST_HORIZONS, type ForecastModel } from "../types";
import { mean, stdev } from "../math";
import { buildSeries } from "../series";

export const growthRateModel: ForecastModel = {
  id: "growth-rate",
  label: "Growth Rate",
  horizons: FORECAST_HORIZONS,
  forecast(input) {
    const values = input.history.map((h) => h.value);
    const rates: number[] = [];
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1];
      if (prev !== 0) rates.push((values[i] - prev) / prev);
    }
    const growth = mean(rates);
    const last = values.length > 0 ? values[values.length - 1] : 0;
    const spread = stdev(values);
    const pct = (growth * 100).toFixed(2);
    return buildSeries(
      "growth-rate",
      input,
      (step) => last * (1 + growth) ** step,
      spread,
      `Compounded average period growth (${pct}% per step)`,
      `Projects the last value compounded at the mean period growth; band from historical volatility.`
    );
  },
};
