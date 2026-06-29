/**
 * Best-model selection (Sprint 62D).
 *
 * Pure, deterministic. Picks the lowest-error model from a backtest comparison.
 * A model with no usable score is never selected. No I/O, no randomness.
 */

import type {
  ForecastModel,
  HistoricalPoint,
  ForecastMetric,
  ForecastHorizon,
} from "../types";
import {
  compareModels,
  rankModels,
  type RankMetric,
  type RankedEvaluation,
} from "./comparison";
import type { ModelEvaluation, EvaluateOptions } from "./evaluation";

export interface ModelSelection {
  /** The chosen model's evaluation, or null when none is usable. */
  best: ModelEvaluation | null;
  /** All evaluations, ranked best→worst. */
  ranked: RankedEvaluation[];
  /** Metric the selection was ranked by. */
  by: RankMetric;
}

/** Whether an evaluation has a usable score for the ranking metric. */
function hasScore(evaluation: ModelEvaluation, by: RankMetric): boolean {
  return evaluation[by] !== null && evaluation.sampleSize > 0;
}

/** Select the best evaluation from a pre-computed set. */
export function selectBestFromEvaluations(
  evaluations: ModelEvaluation[],
  by: RankMetric = "rmse"
): ModelSelection {
  const ranked = rankModels(evaluations, by);
  const best = ranked.find((e) => hasScore(e, by)) ?? null;
  return { best, ranked, by };
}

/** Evaluate every model on the history, then select the best. */
export function selectBestModel(
  models: ForecastModel[],
  history: HistoricalPoint[],
  metric: ForecastMetric,
  horizon: ForecastHorizon,
  opts?: EvaluateOptions,
  by: RankMetric = "rmse"
): ModelSelection {
  const evaluations = compareModels(models, history, metric, horizon, opts);
  return selectBestFromEvaluations(evaluations, by);
}
