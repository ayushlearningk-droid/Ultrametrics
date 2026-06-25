/**
 * Creative Strategy Engine (Sprint 35).
 *
 * Maps grounded creative signals to a deterministic set of creative actions +
 * angles + a test recommendation. Pure; no generation, no invented data — each
 * action is keyed to a diagnosed signal.
 */

import type { CreativeSignals, CreativeStrategy, CreativeAngle } from "./types";

export function generateStrategy(signals: CreativeSignals): CreativeStrategy {
  const actions: string[] = [];
  const angles: CreativeAngle[] = [];

  if (signals.hookQuality === "weak") {
    actions.push("Replace hook", "Change first 3 seconds");
    angles.push("Emotional", "Educational");
  }
  if (signals.ctaQuality === "weak") {
    actions.push("New CTA");
  }
  if (signals.offerMatch === "weak") {
    actions.push("New Offer");
    angles.push("Comparison");
  }
  if (signals.fatigueScore >= 60 || signals.audienceMatch === "weak") {
    actions.push("Different Angle");
    angles.push("UGC");
  }
  if (signals.audienceMatch === "weak") {
    angles.push("Comparison");
  }
  // Always close with a controlled test.
  actions.push("Test Recommendation");

  const dedupe = <T>(xs: T[]): T[] => Array.from(new Set(xs));

  const primaryProblem =
    signals.messagingProblems[0] ?? "the new creative variant";
  const testRecommendation = `A/B test the new variant addressing "${primaryProblem}" against the current control over a 7-day window; keep budget and audience constant.`;

  return {
    actions: dedupe(actions),
    angles: dedupe(angles),
    testRecommendation,
  };
}
