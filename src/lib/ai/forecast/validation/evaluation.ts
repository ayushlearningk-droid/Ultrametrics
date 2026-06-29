/**
 * Forecast model evaluation via backtesting (Sprint 62D).
 *
 * Holds out the tail of a history, runs the model on the earlier portion, and
 * compares predictions to the held-out actuals BY INDEX (robust to non-daily
 * gaps; deterministic). Reports MAE / RMSE / MAPE plus a confidence-calibration
 * check (does the actual fall inside the model's interval band as often as its
 * stated confidence implies). Pure — reuses the engine via model.forecast();
 * modifies nothing. No I/O, no randomness, no Date.now().
 */

import type {
  ForecastModel,
  ForecastInput,
  HistoricalPoint,
  ForecastMetric,
  ForecastHorizon,
  Confidence,
} from "../types";
import { horizonDays } from "../horizons";
import { mae, rmse, mape, type ErrorPair } from "./metrics";

/** Calibration of the stated confidence vs realized interval coverage. */
export interface ConfidenceValidation {
  stated: Confidence;
  /** Fraction of actuals within [lower, upper]; null when nothing compared. */
  bandCoverage: number | null;
  /** Whether coverage meets the expectation for the stated confidence. */
  calibrated: boolean;
}

/** A model's backtest scorecard for one metric/horizon. */
export interface ModelEvaluation {
  modelId: string;
  metric: ForecastMetric;
  horizon: ForecastHorizon;
  /** Number of predicted/actual points compared. */
  sampleSize: number;
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  confidence: ConfidenceValidation;
}

export interface EvaluateOptions {
  /** Points to hold out for testing (default: min(horizon days, n-1)). */
  holdout?: number;
}

/** Minimum training points a model needs to produce a meaningful forecast. */
const MIN_TRAIN = 2;

function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Expected minimum band coverage for each confidence level. */
function isCalibrated(stated: Confidence, coverage: number | null): boolean {
  if (coverage === null) return false;
  if (stated === "high") return coverage >= 0.8;
  if (stated === "medium") return coverage >= 0.5;
  return true; // low confidence makes no strong coverage claim
}

function emptyEvaluation(
  model: ForecastModel,
  metric: ForecastMetric,
  horizon: ForecastHorizon,
  stated: Confidence
): ModelEvaluation {
  return {
    modelId: model.id,
    metric,
    horizon,
    sampleSize: 0,
    mae: null,
    rmse: null,
    mape: null,
    confidence: { stated, bandCoverage: null, calibrated: false },
  };
}

/**
 * Backtest one model on a history. Deterministic; never throws — degrades to an
 * empty (null-metric) evaluation when there is not enough data.
 */
export function evaluateModel(
  model: ForecastModel,
  history: HistoricalPoint[],
  metric: ForecastMetric,
  horizon: ForecastHorizon,
  opts?: EvaluateOptions
): ModelEvaluation {
  const n = history.length;
  const requested = opts?.holdout ?? Math.min(horizonDays(horizon), n - 1);
  const holdout = Math.max(0, Math.min(requested, n - MIN_TRAIN));

  if (n < MIN_TRAIN + 1 || holdout < 1) {
    return emptyEvaluation(model, metric, horizon, "low");
  }

  const train = history.slice(0, n - holdout);
  const actual = history.slice(n - holdout);
  const input: ForecastInput = { metric, horizon, history: train };
  const series = model.forecast(input);

  const count = Math.min(series.points.length, actual.length);
  const pairs: ErrorPair[] = [];
  let inBand = 0;
  for (let i = 0; i < count; i++) {
    const p = series.points[i];
    const a = actual[i].value;
    pairs.push({ actual: a, predicted: p.value });
    if (a >= p.lower && a <= p.upper) inBand++;
  }

  const coverage = count > 0 ? round(inBand / count) : null;
  const stated = series.confidence.level;

  return {
    modelId: model.id,
    metric,
    horizon,
    sampleSize: count,
    mae: mae(pairs),
    rmse: rmse(pairs),
    mape: mape(pairs),
    confidence: {
      stated,
      bandCoverage: coverage,
      calibrated: isCalibrated(stated, coverage),
    },
  };
}
