/**
 * Forecast model comparison & ranking (Sprint 62D).
 *
 * Pure, deterministic. Evaluates a set of models on the same history and ranks
 * them by an error metric (default RMSE, ascending — lower is better). Null
 * scores (un-evaluable models) always rank last; ties break by modelId so the
 * order is stable. No I/O, no randomness.
 */

import type {
  ForecastModel,
  HistoricalPoint,
  ForecastMetric,
  ForecastHorizon,
} from "../types";
import {
  evaluateModel,
  type ModelEvaluation,
  type EvaluateOptions,
} from "./evaluation";

/** Which error metric ranking is based on. */
export type RankMetric = "rmse" | "mae" | "mape";

/** An evaluation with its 1-based rank. */
export interface RankedEvaluation extends ModelEvaluation {
  rank: number;
}

/** Evaluate every model on the same history/metric/horizon. */
export function compareModels(
  models: ForecastModel[],
  history: HistoricalPoint[],
  metric: ForecastMetric,
  horizon: ForecastHorizon,
  opts?: EvaluateOptions
): ModelEvaluation[] {
  return models.map((m) => evaluateModel(m, history, metric, horizon, opts));
}

/** Sort key: null → Infinity so un-scored models sort last. */
function scoreOf(evaluation: ModelEvaluation, by: RankMetric): number {
  const v = evaluation[by];
  return v === null ? Number.POSITIVE_INFINITY : v;
}

/**
 * Rank evaluations ascending by the chosen metric (lower = better). Stable and
 * deterministic: ties break by modelId. Returns a new array with `rank` set.
 */
export function rankModels(
  evaluations: ModelEvaluation[],
  by: RankMetric = "rmse"
): RankedEvaluation[] {
  const sorted = [...evaluations].sort((a, b) => {
    const da = scoreOf(a, by);
    const db = scoreOf(b, by);
    if (da !== db) return da - db;
    return a.modelId.localeCompare(b.modelId);
  });
  return sorted.map((evaluation, i) => ({ ...evaluation, rank: i + 1 }));
}
