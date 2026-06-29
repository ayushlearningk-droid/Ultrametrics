/**
 * Forecast Foundation — domain types & contracts (Sprint 62A).
 *
 * The TYPE-LEVEL foundation for forecasting. It defines the domain vocabulary,
 * the model contract, horizon definitions, the confidence model, and the
 * deterministic calculation contract — but NO forecasting algorithms, no I/O,
 * no UI, no API. Implementations register against these contracts in a later
 * sprint.
 *
 * Reuse-first: the confidence vocabulary comes from the Reasoning Engine and the
 * forecastable metrics from the Trend Engine — no new parallel vocabularies.
 */

import type { Confidence, EvidenceLevel } from "@/lib/ai/reasoning/types";
import type { TrendMetric } from "@/lib/ai/trend/trend-analysis";

/** Reused confidence vocabulary (canonical source: reasoning/types). */
export type { Confidence, EvidenceLevel };

/** Metrics that can be forecast — reuses the Trend Engine's metric set. */
export type ForecastMetric = TrendMetric;

/* ── Horizon definitions ───────────────────────────────────────────────────── */

/** Supported forecast horizons (source of truth for the type below). */
export const FORECAST_HORIZONS = ["7d", "14d", "30d", "90d"] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

/* ── Inputs (grounded history a model consumes) ────────────────────────────── */

/** One observed historical data point. Dates are ISO (YYYY-MM-DD). */
export interface HistoricalPoint {
  date: string;
  value: number;
}

/**
 * The grounded input contract a forecast model receives. `history` is real
 * observed data only — a model never invents inputs. `basis` describes the
 * window (e.g. "last 30 days, daily").
 */
export interface ForecastInput {
  metric: ForecastMetric;
  horizon: ForecastHorizon;
  history: HistoricalPoint[];
  basis?: string;
}

/* ── Confidence model ──────────────────────────────────────────────────────── */

/**
 * Forecast confidence. `level` is the reused qualitative band; `evidence`
 * grades the underlying data strength; `rationale` is a short grounded note.
 * Never a probability — qualitative, like the rest of the stack.
 */
export interface ForecastConfidence {
  level: Confidence;
  evidence: EvidenceLevel;
  rationale: string;
}

/* ── Outputs (a forecast series) ───────────────────────────────────────────── */

/**
 * One predicted point with an interval band. `lower`/`upper` bound `value`
 * (lower ≤ value ≤ upper). Dates are ISO.
 */
export interface ForecastPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

/** A forecast for one metric over one horizon, produced by one model. */
export interface ForecastSeries {
  metric: ForecastMetric;
  horizon: ForecastHorizon;
  /** Which model produced this series (registry id). */
  modelId: string;
  points: ForecastPoint[];
  confidence: ForecastConfidence;
  /** Human-readable description of inputs/assumptions. */
  basis: string;
}

/* ── Model contract (deterministic calculation contract) ───────────────────── */

/**
 * The contract every forecast model implements. `forecast` MUST be pure and
 * DETERMINISTIC: identical input → identical series, no I/O, no randomness, no
 * clock reads beyond the input. Sprint 62A defines this contract only — concrete
 * algorithms are implemented and registered in a later sprint.
 */
export interface ForecastModel {
  /** Stable registry id (e.g. "naive", "linear"). */
  id: string;
  /** Human label for surfaces/debug. */
  label: string;
  /** Horizons this model supports. */
  horizons: readonly ForecastHorizon[];
  forecast(input: ForecastInput): ForecastSeries;
}
