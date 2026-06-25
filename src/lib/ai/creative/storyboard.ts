/**
 * Creative Studio — Storyboard Planner (Sprint 37).
 *
 * Deterministic text storyboard (4 scenes + ending + CTA) keyed to the chosen
 * creative angle and the diagnosed problem. Text only — future video models
 * consume this. No invented metrics. Pure.
 */

import type { CreativeSignals, CreativeStrategy, Storyboard } from "./types";

export function generateStoryboard(
  signals: CreativeSignals,
  strategy: CreativeStrategy
): Storyboard {
  const angle = strategy.angles[0] ?? "Educational";

  const hook =
    signals.hookQuality === "weak" || signals.fatigueScore >= 60
      ? "Pattern-interrupt visual + the customer's #1 frustration in the first second."
      : "Open on the desired outcome to earn the 3-second hold.";

  const scene3 =
    angle === "UGC"
      ? "Authentic phone-shot demo: the product in real use, natural reaction."
      : angle === "Comparison"
        ? "Side-by-side: the old painful way vs. the product's way."
        : angle === "Emotional"
          ? "Show the emotional payoff once the problem is solved."
          : "Quick explainer: how it works, with on-screen captions.";

  return {
    scenes: [
      { label: "Scene 1 — Hook", direction: hook },
      {
        label: "Scene 2 — Problem",
        direction: "Agitate the pain: what it costs them today (relatable, specific).",
      },
      { label: "Scene 3 — Solution", direction: scene3 },
      {
        label: "Scene 4 — Proof",
        direction: "Social proof: a quick testimonial, result, or before/after [no invented numbers].",
      },
    ],
    ending: "Land the transformation: who they become after [outcome].",
    cta:
      signals.ctaQuality === "weak"
        ? "Single, explicit benefit-led CTA on screen + voiceover (e.g. “Get [outcome] today”)."
        : "Clear CTA card with one next step.",
  };
}
