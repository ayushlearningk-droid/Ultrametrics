/**
 * Forecast Presentation — view-model contracts (Sprint 62C).
 *
 * PRESENTATION ONLY: pure, deterministic view-model types that describe HOW a
 * forecast is shown, with no rendering. No React, no UI, no I/O, no persistence.
 * Reuses the existing qualitative vocabularies (Confidence, TrendStatus,
 * Severity) rather than introducing new ones — the UI layer maps `tone` to its
 * own chip classes later.
 */

import type {
  ForecastMetric,
  ForecastHorizon,
  ForecastSeries,
  Confidence,
} from "../types";
import type { TrendStatus } from "@/lib/ai/trend/trend-analysis";
import type { Severity } from "@/lib/ai/brain/types";

/** Abstract visual tone (UI maps to chip-emerald / chip-slate / chip-red). */
export type ForecastTone = "positive" | "neutral" | "negative";

/** Raw direction of a projected series, polarity-agnostic. */
export type ForecastDirection = "up" | "down" | "flat";

/** Trend badge view-model (polarity-aware status + display bits). */
export interface ForecastTrendBadge {
  status: TrendStatus;
  direction: ForecastDirection;
  /** Fractional change start→end of the forecast (0.18 = +18%); null if n/a. */
  changePct: number | null;
  /** Pre-formatted label, e.g. "+18%" / "-12%" / "n/a". */
  changeLabel: string;
  tone: ForecastTone;
  /** Short human label, e.g. "Improving". */
  label: string;
}

/** Confidence badge view-model. */
export interface ForecastConfidenceBadge {
  level: Confidence;
  tone: ForecastTone;
  label: string;
}

/** Risk badge view-model. */
export interface ForecastRiskBadge {
  level: Severity;
  tone: ForecastTone;
  label: string;
}

/** The compact, display-ready summary of one forecast series. */
export interface ForecastSummary {
  metric: ForecastMetric;
  metricLabel: string;
  horizon: ForecastHorizon;
  horizonLabel: string;
  modelId: string;
  /** First projected value. */
  startValue: number | null;
  startValueLabel: string;
  /** Last projected value. */
  endValue: number | null;
  endValueLabel: string;
  /** Projected start→end change. */
  changePct: number | null;
  changeLabel: string;
  /** ISO date span of the projection, e.g. "2026-01-21 → 2026-01-27". */
  dateRange: string;
  trend: ForecastTrendBadge;
  confidence: ForecastConfidenceBadge;
  risk: ForecastRiskBadge;
  /** Grounded basis/assumptions from the engine. */
  basis: string;
}

/** A forecast card view-model: the summary plus the underlying series. */
export interface ForecastCard {
  metricLabel: string;
  summary: ForecastSummary;
  series: ForecastSeries;
}

/**
 * Executive forecast presentation contract — mirrors the Executive Intelligence
 * surfaces (one grounded headline + a set of metric forecasts). Pure data.
 */
export interface ExecutiveForecast {
  /** One-line grounded headline (counts/horizon only — never invented numbers). */
  headline: string;
  horizon: ForecastHorizon;
  horizonLabel: string;
  forecasts: ForecastSummary[];
}
