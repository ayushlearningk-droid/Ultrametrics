/**
 * Creative Studio — Copy Generator (Sprint 37).
 *
 * Deterministic ad-copy templates (headlines, primary text, CTAs, captions,
 * A/B/C variants), grounded in the diagnosed problem + chosen angles. Bracketed
 * [placeholders] mark user-supplied specifics. No hallucinated metrics, no
 * fabricated claims. Pure; text only.
 */

import type { CreativeSignals, CreativeStrategy, CopySet, CopyVariant } from "./types";

function ctaFor(signals: CreativeSignals): string[] {
  if (signals.ctaQuality === "weak" || signals.offerMatch === "weak") {
    return ["Get [outcome] today", "Start now — [benefit]", "Claim your [offer]"];
  }
  return ["Learn more", "Shop the [product]", "Try it risk-free"];
}

export function generateCopy(
  signals: CreativeSignals,
  strategy: CreativeStrategy
): CopySet {
  const headlines = [
    "The fix for [the problem], finally.",
    "[Outcome] without [objection].",
    "Built for [audience] who want [result].",
  ];
  const primaryText = [
    "If [problem] keeps holding you back, [product] gets you [outcome] — here's how.",
    "Most [audience] settle for [status quo]. You don't have to: [product] delivers [result].",
    "[Product] takes the guesswork out of [task] so you can [benefit] faster.",
  ];
  const ctas = ctaFor(signals);
  const captions = [
    "[Outcome] starts here 👇",
    "Save this if you've been struggling with [problem].",
    "Tag someone who needs [outcome].",
  ];

  // Variants pair a headline + primary + CTA under each recommended angle.
  const angles =
    strategy.angles.length > 0
      ? strategy.angles
      : (["Educational", "Emotional", "UGC"] as const);
  const labels: CopyVariant["label"][] = ["A", "B", "C"];
  const variants: CopyVariant[] = labels.map((label, i) => ({
    label,
    angle: angles[i % angles.length],
    headline: headlines[i % headlines.length],
    primaryText: primaryText[i % primaryText.length],
    cta: ctas[i % ctas.length],
  }));

  return { headlines, primaryText, ctas, captions, variants };
}
