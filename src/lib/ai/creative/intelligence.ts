/**
 * Creative Intelligence Engine (Sprint 35).
 *
 * Derives creative-quality SIGNALS from grounded performance inputs + the
 * diagnosis the existing engines produce. Every output is a heuristic derived
 * from the inputs (trends, frequency, root causes) — never an invented metric.
 * Where a signal can't be honestly inferred from numbers (e.g. visual quality),
 * it returns "unknown" rather than guessing. Pure + deterministic.
 */

import type { CreativeInput, CreativeSignals, Quality } from "./types";

/** Meta's well-known fatigue threshold: avg frequency ≥ 3 is a saturation risk. */
const FREQUENCY_FATIGUE = 3;

function causeHas(input: CreativeInput, ...needles: string[]): boolean {
  const hay = (input.causes ?? []).join(" ").toLowerCase();
  return needles.some((n) => hay.includes(n));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** 0–100 fatigue indicator from frequency + CTR trend + saturation causes. */
function fatigueScore(input: CreativeInput): number {
  let s = 0;
  if (typeof input.frequency === "number" && input.frequency >= FREQUENCY_FATIGUE) {
    s += clamp((input.frequency - (FREQUENCY_FATIGUE - 1)) * 15, 0, 45);
  }
  if (input.ctrTrend === "declining") s += 25;
  if (causeHas(input, "fatigue", "saturat")) s += 30;
  return Math.round(clamp(s, 0, 100));
}

function hookQuality(input: CreativeInput): Quality {
  if (input.ctrTrend === "improving") return "strong";
  if (input.ctrTrend === "declining" || causeHas(input, "hook", "low_ctr", "ctr"))
    return "weak";
  if (input.ctrTrend === "stable" || typeof input.ctr === "number") return "moderate";
  return "unknown";
}

function visualQuality(input: CreativeInput): Quality {
  // Visual quality can't be honestly inferred from numbers alone.
  if (causeHas(input, "visual", "creative")) return "weak";
  return "unknown";
}

function ctaQuality(input: CreativeInput): Quality {
  if (causeHas(input, "cta", "conversion")) return "weak";
  if (
    typeof input.spend === "number" &&
    input.spend > 0 &&
    input.conversions === 0
  ) {
    return "weak"; // meaningful spend, zero conversions → CTA/landing problem
  }
  if (typeof input.roas === "number" || typeof input.conversions === "number")
    return "moderate";
  return "unknown";
}

function audienceMatch(input: CreativeInput): Quality {
  if (causeHas(input, "audience", "saturat")) return "weak";
  if (typeof input.frequency === "number" && input.frequency >= FREQUENCY_FATIGUE)
    return "weak";
  if (typeof input.frequency === "number") return "moderate";
  return "unknown";
}

function offerMatch(input: CreativeInput): Quality {
  if (causeHas(input, "offer")) return "weak";
  // Clicks coming in (CTR not declining) but no conversions → offer/landing.
  if (
    input.ctrTrend !== "declining" &&
    typeof input.spend === "number" &&
    input.spend > 0 &&
    input.conversions === 0
  ) {
    return "weak";
  }
  if (typeof input.roas === "number") return "moderate";
  return "unknown";
}

/** Compute the full grounded creative signal set. */
export function computeCreativeSignals(input: CreativeInput): CreativeSignals {
  const fatigue = fatigueScore(input);
  const hook = hookQuality(input);
  const visual = visualQuality(input);
  const cta = ctaQuality(input);
  const audience = audienceMatch(input);
  const offer = offerMatch(input);

  const messagingProblems: string[] = [];
  if (fatigue >= 60)
    messagingProblems.push("Creative fatigue: frequency high and response is declining.");
  if (hook === "weak")
    messagingProblems.push("Hook isn't stopping the scroll (CTR weak or declining).");
  if (cta === "weak")
    messagingProblems.push("CTA/landing isn't converting the clicks it earns.");
  if (offer === "weak")
    messagingProblems.push("Offer may not match what the audience expects.");
  if (audience === "weak")
    messagingProblems.push("Audience is saturated or mismatched (high frequency).");

  // Confidence from how much grounded signal fed the analysis.
  const grounded =
    (input.causes?.length ?? 0) +
    (input.ctrTrend ? 1 : 0) +
    (typeof input.frequency === "number" ? 1 : 0);
  const confidence: CreativeSignals["confidence"] =
    grounded >= 3 ? "high" : grounded >= 1 ? "medium" : "low";

  return {
    fatigueScore: fatigue,
    hookQuality: hook,
    visualQuality: visual,
    ctaQuality: cta,
    audienceMatch: audience,
    offerMatch: offer,
    messagingProblems,
    confidence,
  };
}
