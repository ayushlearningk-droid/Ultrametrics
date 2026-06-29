/**
 * Forecast summary + executive presentation builders (Sprint 62C).
 *
 * Pure, deterministic mappers from engine output (ForecastSeries) to
 * display-ready view-models. No rendering, no I/O, no persistence. Grounded:
 * every field derives from the series; the executive headline states only
 * counts/horizon, never an invented number.
 */

import type { ForecastSeries, ForecastHorizon } from "../types";
import {
  metricLabel,
  formatValue,
  formatPercent,
  formatHorizon,
  formatDateRange,
} from "./format";
import { trendBadge, confidenceBadge, riskLevel } from "./badges";
import type {
  ForecastSummary,
  ForecastCard,
  ExecutiveForecast,
} from "./types";

/** Build the display-ready summary view-model for one forecast series. */
export function buildForecastSummary(series: ForecastSeries): ForecastSummary {
  const pts = series.points;
  const startValue = pts.length > 0 ? pts[0].value : null;
  const endValue = pts.length > 0 ? pts[pts.length - 1].value : null;

  const trend = trendBadge(series);
  const dates = pts.map((p) => p.date);

  return {
    metric: series.metric,
    metricLabel: metricLabel(series.metric),
    horizon: series.horizon,
    horizonLabel: formatHorizon(series.horizon),
    modelId: series.modelId,
    startValue,
    startValueLabel: startValue === null ? "—" : formatValue(series.metric, startValue),
    endValue,
    endValueLabel: endValue === null ? "—" : formatValue(series.metric, endValue),
    changePct: trend.changePct,
    changeLabel: formatPercent(trend.changePct),
    dateRange: formatDateRange(dates),
    trend,
    confidence: confidenceBadge(series.confidence),
    risk: riskLevel(series),
    basis: series.basis,
  };
}

/** Build a forecast card view-model (summary + underlying series). */
export function buildForecastCard(series: ForecastSeries): ForecastCard {
  const summary = buildForecastSummary(series);
  return { metricLabel: summary.metricLabel, summary, series };
}

/**
 * Build the executive forecast presentation from a set of series. Assumes the
 * series share a horizon (executive surfaces show one horizon at a time); uses
 * the first series' horizon for the header. The headline is grounded — counts
 * and horizon only.
 */
export function buildExecutiveForecast(
  series: ForecastSeries[]
): ExecutiveForecast {
  const horizon: ForecastHorizon = series[0]?.horizon ?? "30d";
  const horizonLabel = formatHorizon(horizon);
  const forecasts = series.map(buildForecastSummary);
  const n = forecasts.length;
  const headline =
    n === 0
      ? "No forecasts available."
      : `${n} metric${n === 1 ? "" : "s"} projected over the next ${horizonLabel}.`;
  return { headline, horizon, horizonLabel, forecasts };
}
