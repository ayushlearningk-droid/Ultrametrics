/**
 * Creative Brief Generator (Sprint 35).
 *
 * Produces a structured, reusable creative brief from the grounded signals +
 * strategy. Deterministic and advisory: directions are keyed to the diagnosed
 * problem, evidence is built ONLY from the metrics actually provided, and no
 * numbers are invented. No image/video generation — text brief only.
 */

import type {
  CreativeInput,
  CreativeSignals,
  CreativeStrategy,
  CreativeBrief,
} from "./types";
import { computeCreativeSignals } from "./intelligence";
import { generateStrategy } from "./strategy";

function pctStr(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

/** Build the grounded evidence lines from whatever metrics were provided. */
function buildEvidence(input: CreativeInput, signals: CreativeSignals): string[] {
  const e: string[] = [];
  if (typeof input.roas === "number") e.push(`ROAS ${input.roas.toFixed(2)}`);
  if (typeof input.ctr === "number") e.push(`CTR ${pctStr(input.ctr)}`);
  if (typeof input.cpc === "number") e.push(`CPC ${input.cpc.toFixed(2)}`);
  if (typeof input.frequency === "number")
    e.push(`Frequency ${input.frequency.toFixed(2)}`);
  if (typeof input.conversions === "number")
    e.push(`${input.conversions.toLocaleString()} conversions`);
  if (input.ctrTrend) e.push(`CTR trend: ${input.ctrTrend}`);
  e.push(`Fatigue score: ${signals.fatigueScore}/100 (derived)`);
  return e;
}

/** The metric this brief is trying to move, based on the dominant problem. */
function successMetric(signals: CreativeSignals): string {
  if (signals.hookQuality === "weak" || signals.fatigueScore >= 60)
    return "CTR (3-second hold + click-through)";
  if (signals.ctaQuality === "weak" || signals.offerMatch === "weak")
    return "Conversion rate / ROAS";
  return "CTR and ROAS";
}

function hookIdeas(signals: CreativeSignals): string[] {
  if (signals.hookQuality === "weak" || signals.fatigueScore >= 60) {
    return [
      "Open on the core pain point in the first second.",
      "Lead with the outcome/result the customer wants.",
      "Pattern-interrupt visual paired with a bold, specific claim.",
    ];
  }
  return [
    "Refresh the opening line while keeping the proven structure.",
    "Try a question hook that mirrors the audience's intent.",
  ];
}

function sceneSuggestions(strategy: CreativeStrategy): string[] {
  const out: string[] = [];
  if (strategy.angles.includes("UGC"))
    out.push("Authentic phone-shot UGC testimonial, natural lighting.");
  if (strategy.angles.includes("Comparison"))
    out.push("Side-by-side before/after or us-vs-alternative comparison.");
  if (strategy.angles.includes("Educational"))
    out.push("Quick how-it-works explainer with on-screen captions.");
  if (strategy.angles.includes("Emotional"))
    out.push("Open on a relatable frustration, resolve with the product.");
  if (out.length === 0)
    out.push("Keep the winning structure; swap the opening scene for freshness.");
  return out;
}

/** Generate the full creative brief (computes signals + strategy if not passed). */
export function generateCreativeBrief(
  input: CreativeInput,
  signals: CreativeSignals = computeCreativeSignals(input),
  strategy: CreativeStrategy = generateStrategy(signals)
): CreativeBrief {
  const problem =
    signals.messagingProblems[0] ??
    "Creative performance is slipping without a single dominant cause.";

  const direction =
    strategy.angles.length > 0
      ? `Lead with a ${strategy.angles.join(" / ")} angle; ${
          strategy.actions.includes("Replace hook")
            ? "rebuild the hook and first 3 seconds"
            : "refresh the opening"
        }.`
      : "Refresh the creative while preserving the proven structure.";

  const cta =
    signals.ctaQuality === "weak"
      ? "Make the CTA explicit and benefit-led (e.g. “Get [outcome] today”), single clear next step."
      : "Keep a single, clear, benefit-led CTA.";

  const scriptDirection = strategy.angles.includes("Educational")
    ? "Problem → why it happens → the fix (your product) → proof → CTA."
    : "Hook → agitate the pain → show the outcome → proof → CTA.";

  const audience = (input.memories ?? []).some((m) =>
    /audience|persona|target|icp/i.test(m)
  )
    ? "Per saved workspace memory; expand with a fresh angle if frequency is high."
    : "Current converting audience; broaden with a new angle if saturated.";

  return {
    executiveGoal: `Lift ${successMetric(signals)} by refreshing the creative driving the issue.`,
    problem,
    evidence: buildEvidence(input, signals),
    targetAudience: audience,
    hookIdeas: hookIdeas(signals),
    creativeDirection: direction,
    sceneSuggestions: sceneSuggestions(strategy),
    scriptDirection,
    cta,
    successMetric: successMetric(signals),
    confidence: signals.confidence,
  };
}
