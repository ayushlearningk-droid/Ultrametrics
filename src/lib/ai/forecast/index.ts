/**
 * Forecast Foundation — barrel (Sprint 62A).
 *
 * Public surface of the forecast type/contract foundation: domain types, model
 * contract, horizon definitions, confidence model, and the model registry. No
 * algorithms, no I/O, no UI, no API — those arrive in later sprints.
 */

export {
  FORECAST_HORIZONS,
  type ForecastMetric,
  type ForecastHorizon,
  type HistoricalPoint,
  type ForecastInput,
  type ForecastConfidence,
  type ForecastPoint,
  type ForecastSeries,
  type ForecastModel,
  type Confidence,
  type EvidenceLevel,
} from "./types";

export { HORIZON_DAYS, horizonDays, isForecastHorizon } from "./horizons";
export { confidenceFromEvidence, buildForecastConfidence } from "./confidence";
export {
  registerModel,
  getModels,
  getModel,
  hasModels,
} from "./registry";

// Deterministic Forecast Engine (Sprint 62B).
export {
  forecast,
  registerBuiltInForecastModels,
  BUILT_IN_FORECAST_MODELS,
  DEFAULT_FORECAST_MODEL_ID,
} from "./engine";
export { movingAverageModel } from "./models/moving-average";
export { growthRateModel } from "./models/growth-rate";
export { trendProjectionModel } from "./models/trend-projection";

// Presentation Foundation (Sprint 62C) — pure view-models + builders + helpers.
export * from "./presentation";
