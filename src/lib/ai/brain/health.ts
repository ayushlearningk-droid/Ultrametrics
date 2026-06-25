/**
 * Marketing Health Engine (Sprint 39).
 *
 * Deterministic 0–100 health scoring across nine dimensions, grounded in the
 * creative signals + metrics + workspace memory. Where a dimension can't be
 * graded from available data, it returns a neutral score with low confidence
 * and an honest "insufficient data" explanation — never a fabricated benchmark.
 */

import type { CreativeInput, CreativeSignals } from "@/lib/ai/creative/types";
import type { Confidence } from "@/lib/ai/reasoning/types";
import type { HealthDimension, HealthReport } from "./types";
import { clamp, causesText, severityForScore, parseTargetRoas } from "./util";

function dim(
  key: string,
  score: number,
  explanation: string,
  confidence: Confidence
): HealthDimension {
  const s = Math.round(clamp(score, 0, 100));
  return { key, score: s, severity: severityForScore(s), explanation, confidence };
}

export function scoreHealth(
  input: CreativeInput,
  signals: CreativeSignals
): HealthReport {
  const causes = causesText(input.causes);
  const dims: HealthDimension[] = [];

  // ROAS — graded against a user-stated target (memory) when available.
  const target = parseTargetRoas(input.memories);
  if (typeof input.roas === "number" && target) {
    dims.push(
      dim(
        "ROAS",
        clamp((input.roas / target) * 75, 20, 100),
        `ROAS ${input.roas.toFixed(2)} vs target ${target.toFixed(2)}.`,
        "high"
      )
    );
  } else if (/roas/.test(causes)) {
    dims.push(dim("ROAS", 40, "Root cause flags weak ROAS.", "medium"));
  } else {
    dims.push(
      dim("ROAS", 62, "No ROAS target set — add one in AI Memory to grade it.", "low")
    );
  }

  // Spend efficiency — driven by waste signals.
  const wasteful = signals.ctaQuality === "weak" || signals.offerMatch === "weak";
  dims.push(
    dim(
      "Spend",
      wasteful ? 45 : 70,
      wasteful
        ? "Spend is reaching clicks that aren't converting."
        : "No clear spend-waste signal.",
      signals.confidence
    )
  );

  // CPC — from a CPC root cause (no absolute value available).
  dims.push(
    /cpc/.test(causes)
      ? dim("CPC", 40, "Root cause flags rising CPC.", "medium")
      : dim("CPC", 65, "No CPC pressure detected.", "low")
  );

  // CTR — from the CTR trend + hook quality.
  if (input.ctrTrend === "declining" || signals.hookQuality === "weak") {
    dims.push(dim("CTR", 42, "CTR is weak or declining (hook fatigue).", "high"));
  } else if (input.ctrTrend === "improving") {
    dims.push(dim("CTR", 85, "CTR is improving.", "high"));
  } else if (input.ctrTrend === "stable") {
    dims.push(dim("CTR", 68, "CTR is holding steady.", "medium"));
  } else {
    dims.push(dim("CTR", 60, "Insufficient CTR-trend data.", "low"));
  }

  // Conversion Rate — from CTA / offer quality.
  const convWeak = signals.ctaQuality === "weak" || signals.offerMatch === "weak";
  dims.push(
    dim(
      "Conversion Rate",
      convWeak ? 42 : 66,
      convWeak
        ? "Clicks aren't converting (CTA/offer signals)."
        : "Conversion path shows no clear weakness.",
      signals.confidence
    )
  );

  // Frequency — graded from the value when present.
  if (typeof input.frequency === "number") {
    const f = input.frequency;
    const score = f < 2 ? 88 : f < 3 ? 70 : f < 4 ? 48 : 32;
    dims.push(dim("Frequency", score, `Average frequency ${f.toFixed(2)}.`, "high"));
  } else {
    dims.push(dim("Frequency", 60, "Frequency data not available.", "low"));
  }

  // Budget Usage — requires pacing data we don't have at account level.
  dims.push(
    dim("Budget Usage", 60, "Budget-pacing data not available to grade.", "low")
  );

  // Creative Fatigue — inverse of the derived fatigue score.
  dims.push(
    dim(
      "Creative Fatigue",
      100 - signals.fatigueScore,
      `Derived fatigue ${signals.fatigueScore}/100.`,
      signals.confidence
    )
  );

  // Scaling Potential — high when efficiency looks healthy.
  const stable = signals.fatigueScore < 40 && signals.hookQuality !== "weak";
  dims.push(
    dim(
      "Scaling Potential",
      stable ? 80 : 45,
      stable
        ? "Efficiency signals support careful scaling."
        : "Stabilize efficiency before scaling.",
      signals.confidence
    )
  );

  const overall = Math.round(
    dims.reduce((s, d) => s + d.score, 0) / dims.length
  );

  // Overall confidence = the most common dimension confidence, biased low.
  const lowCount = dims.filter((d) => d.confidence === "low").length;
  const confidence: Confidence =
    lowCount > dims.length / 2 ? "low" : signals.confidence;

  return {
    overall,
    severity: severityForScore(overall),
    dimensions: dims,
    confidence,
  };
}
