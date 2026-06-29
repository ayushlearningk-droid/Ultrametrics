/**
 * Deterministic Forecast Engine (Sprint 62B).
 *
 * Composes the built-in models (moving average · growth rate · trend
 * projection) and exposes a pure entry point plus registry wiring. No AI, no
 * LLM, no external API, no randomness, no Date.now(), no persistence, no side
 * effects on import — registration is an explicit opt-in call.
 */

import { registerModel } from "./registry";
import type { ForecastInput, ForecastModel, ForecastSeries } from "./types";
import { movingAverageModel } from "./models/moving-average";
import { growthRateModel } from "./models/growth-rate";
import { trendProjectionModel } from "./models/trend-projection";

/** All deterministic built-in models, in deterministic order. */
export const BUILT_IN_FORECAST_MODELS: ForecastModel[] = [
  movingAverageModel,
  growthRateModel,
  trendProjectionModel,
];

const BY_ID = new Map(BUILT_IN_FORECAST_MODELS.map((m) => [m.id, m]));

/** Default model when none is specified. */
export const DEFAULT_FORECAST_MODEL_ID = "moving-average";

/** Register every built-in model into the shared registry (explicit, idempotent). */
export function registerBuiltInForecastModels(): void {
  for (const model of BUILT_IN_FORECAST_MODELS) registerModel(model);
}

/**
 * Run a forecast with the given model (default: moving average). Pure — resolves
 * the model from the built-in map (no registry dependency) and returns its
 * deterministic series. Falls back to the default model for an unknown id.
 */
export function forecast(
  input: ForecastInput,
  modelId: string = DEFAULT_FORECAST_MODEL_ID
): ForecastSeries {
  const model = BY_ID.get(modelId) ?? BY_ID.get(DEFAULT_FORECAST_MODEL_ID)!;
  return model.forecast(input);
}
