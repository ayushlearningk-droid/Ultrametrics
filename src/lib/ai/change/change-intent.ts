/**
 * Ask Ultrametrics — Change-intent detection (Sprint 12, Phase C).
 *
 * Pure, deterministic classifier that maps a user message to the Change
 * Intelligence tool. It exists in the routing layer so the system can recognize
 * a "why did X change?" question up front, escalate appropriately, and steer the
 * model to get_change_analysis (NEVER get_root_cause, which is single-window).
 *
 * No I/O, no model calls — a regex matcher over the message text. Returns null
 * for non-change questions (factual lookups, single-window "why is X low", etc.)
 * so it never hijacks an unrelated turn.
 */

import type { ChangeMetric } from "@/lib/ai/change/change-analysis";

/** Comparison period for get_change_analysis (mirrors the tool's enum). */
export type ChangePeriod = "day" | "week" | "month";

/** A detected change question: always routes to get_change_analysis. */
export interface ChangeIntent {
  /** The tool this intent must route to. Constant by construction. */
  tool: "get_change_analysis";
  /** The headline metric when one is named; null for a generic "what changed". */
  metric: ChangeMetric | null;
  /**
   * Deterministically extracted comparison period from the query's date phrasing
   * ("yesterday" → day, "this week" → week, …), or null when none is stated. The
   * dispatch layer injects this into the tool args so the period is NEVER left to
   * the model to infer.
   */
  period: ChangePeriod | null;
}

/** Metric name → ChangeMetric, in priority order (first match wins). */
const METRIC_PATTERNS: ReadonlyArray<[RegExp, ChangeMetric]> = [
  [/\broas\b|return on ad ?spend/i, "roas"],
  [/\bctr\b|click[- ]?through(?: rate)?/i, "ctr"],
  [/\bcpc\b|cost[- ]?per[- ]?click/i, "cpc"],
  [/\bconversions?\b|\bpurchases?\b/i, "conversions"],
];

/**
 * Directional CHANGE verbs (a metric moving over time), stemmed to catch tense
 * variants: drop/dropped, fell/fall, rose/rise/rising, increase/increased,
 * decrease/declining, grew/grow, jump/spike/surge, "went up/down", and the
 * neutral "change/changed/changing" (e.g. "why did ROAS change").
 */
const CHANGE_VERB =
  /\b(drop|dropp|fell|fall|fall?en|declin|decreas|rose|ris(?:e|ing|en)|increas|grew|grow|jump|spike|surg|plummet|tank|chang|went up|went down|going up|going down)\w*/i;

/** Explicit "what changed / what's changing" phrasing (metric may be unnamed). */
const WHAT_CHANGED = /\bwhat(?:'s|s| has| have| is| are)?\s+chang\w*/i;

/** First metric named in the message, or null. */
function detectMetric(message: string): ChangeMetric | null {
  for (const [pattern, metric] of METRIC_PATTERNS) {
    if (pattern.test(message)) return metric;
  }
  return null;
}

/**
 * Date-phrasing → comparison period, checked in order (day, week, month; first
 * match wins). Deterministic — the period is resolved here, never inferred by
 * the model. Returns null when no period phrase is present (caller defaults).
 */
const PERIOD_PATTERNS: ReadonlyArray<[RegExp, ChangePeriod]> = [
  [
    /\b(yesterday|today|last 24[- ]?hours|past 24[- ]?hours|day[- ]over[- ]day|daily)\b/i,
    "day",
  ],
  [/\b(this week|week[- ]over[- ]week|weekly)\b/i, "week"],
  [/\b(this month|month[- ]over[- ]month|monthly)\b/i, "month"],
];

/** Extract an explicit comparison period from the query, or null. */
export function extractPeriod(message: string): ChangePeriod | null {
  for (const [pattern, period] of PERIOD_PATTERNS) {
    if (pattern.test(message)) return period;
  }
  return null;
}

/**
 * Classify a message as a Change Intelligence question, or null.
 *
 * A change question is either:
 *  - an explicit "what changed", or
 *  - a named metric paired with a directional change verb (optionally with
 *    "why", e.g. "why did ROAS drop", "CTR increased this week").
 *
 * "why is my ROAS low" (a STATE, not a change) and "what is my CTR" (factual)
 * both return null — they are not change-over-time questions.
 */
export function detectChangeIntent(message: string): ChangeIntent | null {
  const metric = detectMetric(message);
  const period = extractPeriod(message);

  if (WHAT_CHANGED.test(message)) {
    return { tool: "get_change_analysis", metric, period };
  }

  if (metric && CHANGE_VERB.test(message)) {
    return { tool: "get_change_analysis", metric, period };
  }

  return null;
}
