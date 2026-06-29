/**
 * Forecast Validation & Model Evaluation — barrel (Sprint 62D).
 *
 * Pure, deterministic validation layer over the Forecast Engine: error metrics
 * (MAE/RMSE/MAPE), backtest evaluation with confidence calibration, model
 * comparison/ranking, and best-model selection. Reuses the engine read-only;
 * modifies nothing. No AI, no I/O, no randomness, no Date.now().
 */

export { mae, rmse, mape, type ErrorPair } from "./metrics";

export {
  evaluateModel,
  type ModelEvaluation,
  type ConfidenceValidation,
  type EvaluateOptions,
} from "./evaluation";

export {
  compareModels,
  rankModels,
  type RankMetric,
  type RankedEvaluation,
} from "./comparison";

export {
  selectBestModel,
  selectBestFromEvaluations,
  type ModelSelection,
} from "./selection";
