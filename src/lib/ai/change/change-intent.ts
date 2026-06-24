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

/** A detected change question: always routes to get_change_analysis. */
export interface ChangeIntent {
  /** The tool this intent must route to. Constant by construction. */
  tool: "get_change_analysis";
  /** The headline metric when one is named; null for a generic "what changed". */
  metric: ChangeMetric | null;
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

/** "why" — a change question is usually "why did <metric> <verb>". */
const WHY = /\bwhy\b/i;

/** First metric named in the message, or null. */
function detectMetric(message: string): ChangeMetric | null {
  for (const [pattern, metric] of METRIC_PATTERNS) {
    if (pattern.test(message)) return metric;
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

  if (WHAT_CHANGED.test(message)) {
    return { tool: "get_change_analysis", metric };
  }

  if (metric && CHANGE_VERB.test(message)) {
    return { tool: "get_change_analysis", metric };
  }

  return null;
}
