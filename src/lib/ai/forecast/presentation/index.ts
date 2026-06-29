/**
 * Forecast Presentation Foundation — barrel (Sprint 62C).
 *
 * Pure, deterministic, presentation-only view-models + builders + helpers over
 * the Forecast Engine output. No UI, no React, no I/O, no persistence.
 */

export type {
  ForecastTone,
  ForecastDirection,
  ForecastTrendBadge,
  ForecastConfidenceBadge,
  ForecastRiskBadge,
  ForecastSummary,
  ForecastCard,
  ExecutiveForecast,
} from "./types";

export {
  METRIC_LABELS,
  metricLabel,
  formatValue,
  formatPercent,
  formatHorizon,
  formatDateRange,
} from "./format";

export { trendBadge, confidenceBadge, riskLevel } from "./badges";

export {
  buildForecastSummary,
  buildForecastCard,
  buildExecutiveForecast,
} from "./summary";
