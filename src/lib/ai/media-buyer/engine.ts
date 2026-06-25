/**
 * AI Media Buyer — Optimization Engine (Sprint 38).
 *
 * Deterministically derives Budget / Audience / Placement / Creative / Bidding /
 * Scaling recommendations from the grounded creative signals + metrics. Planning
 * only — nothing is executed. Each rec carries why / expected outcome / risk /
 * confidence / estimated impact. No invented performance; impact stays
 * "directional" unless a grounded estimate is supplied.
 */

import type { CreativeInput, CreativeSignals } from "@/lib/ai/creative/types";
import type { OptimizationRec, OptPriority } from "./types";

const PRIORITY_RANK: Record<OptPriority, number> = { High: 3, Medium: 2, Low: 1 };

function causesText(input: CreativeInput): string {
  return (input.causes ?? []).join(" ").toLowerCase();
}

/** Generate the six optimization recommendations. `impactHint` is a grounded
 *  business-impact line (from the reasoning engine) used where applicable. */
export function generateOptimizations(
  input: CreativeInput,
  signals: CreativeSignals,
  opts: { impactHint?: string } = {}
): OptimizationRec[] {
  const directional = "Directional — quantify with a controlled 7-day test.";
  const impact = opts.impactHint ?? directional;
  const recs: OptimizationRec[] = [];

  // ── Budget ──
  const wasteful = signals.ctaQuality === "weak" || signals.offerMatch === "weak";
  recs.push({
    category: "Budget",
    action: wasteful
      ? "Reallocate budget away from non-converting campaigns toward proven converters."
      : "Hold budgets steady; reallocate only after the creative refresh proves out.",
    why: wasteful
      ? "Spend is reaching clicks that aren't converting (weak CTA/offer signals)."
      : "No clear budget-waste signal in the current data.",
    expectedOutcome: wasteful
      ? "Higher blended ROAS as spend concentrates on efficient campaigns."
      : "Stable efficiency while creative is validated.",
    risk: wasteful
      ? "Short-term volume dip while reallocating."
      : "Opportunity cost if a winner is under-funded.",
    confidence: signals.confidence,
    estimatedImpact: wasteful ? impact : directional,
    priority: wasteful ? "High" : "Low",
  });

  // ── Audience ──
  const audWeak = signals.audienceMatch === "weak" || signals.fatigueScore >= 60;
  recs.push({
    category: "Audience",
    action: audWeak
      ? "Expand/refresh audiences (broad + fresh lookalikes) to lower frequency."
      : "Keep current audiences; the bottleneck is creative/offer, not targeting.",
    why: audWeak
      ? "High frequency / saturation signals indicate audience fatigue."
      : "No saturation signal detected in the data.",
    expectedOutcome: audWeak
      ? "Lower frequency and renewed CTR as reach widens."
      : "Stable targeting while creative is refreshed.",
    risk: audWeak
      ? "New audiences need a short learning phase."
      : "Minimal.",
    confidence: signals.confidence,
    estimatedImpact: directional,
    priority: audWeak ? "High" : "Low",
  });

  // ── Placement (advisory review; account-level data only) ──
  recs.push({
    category: "Placement",
    action:
      "Review the placement breakdown and shift spend toward the placements with the best ROAS.",
    why: "Placement mix often hides efficiency differences not visible at the account level.",
    expectedOutcome: "Improved efficiency by concentrating on top placements.",
    risk: "Over-concentration can cap reach — keep a small test budget on others.",
    confidence: "medium",
    estimatedImpact: directional,
    priority: "Medium",
  });

  // ── Creative ──
  const creWeak = signals.hookQuality === "weak" || signals.fatigueScore >= 60;
  recs.push({
    category: "Creative",
    action: creWeak
      ? "Launch the new variants from Creative Studio (new hook + angle)."
      : "Queue 1–2 fresh variants to pre-empt fatigue.",
    why: creWeak
      ? "Weak/declining hook and fatigue signals are dragging CTR."
      : "Performance is stable; rotate creative proactively.",
    expectedOutcome: "Higher CTR / lower CPC as fresh creative re-engages the audience.",
    risk: "New creative needs a short learning phase.",
    confidence: signals.confidence,
    estimatedImpact: directional,
    priority: creWeak ? "High" : "Medium",
  });

  // ── Bidding ──
  const cpcIssue = /cpc/.test(causesText(input));
  recs.push({
    category: "Bidding",
    action: cpcIssue
      ? "Test cost caps or step bids down on rising-CPC campaigns; re-check the bid strategy."
      : "Keep current bidding; no CPC pressure detected.",
    why: cpcIssue
      ? "Root cause flags rising CPC."
      : "No CPC pressure in the current data.",
    expectedOutcome: cpcIssue
      ? "Lower CPC at a controlled volume trade-off."
      : "Stable cost efficiency.",
    risk: cpcIssue ? "Tighter caps can reduce delivery." : "Minimal.",
    confidence: signals.confidence,
    estimatedImpact: directional,
    priority: cpcIssue ? "High" : "Low",
  });

  // ── Scaling ──
  const stable = signals.fatigueScore < 40 && signals.hookQuality !== "weak";
  recs.push({
    category: "Scaling",
    action: stable
      ? "Scale proven winners in 15–20% steps every 3–4 days."
      : "Hold scaling until efficiency stabilizes after the creative refresh.",
    why: stable
      ? "Efficiency signals are healthy enough to scale carefully."
      : "Scaling into fatigue/weak creative would raise costs.",
    expectedOutcome: stable
      ? "Incremental volume at maintained ROAS."
      : "Avoids amplifying inefficiency.",
    risk: stable ? "Scaling too fast resets the learning phase." : "Opportunity cost.",
    confidence: signals.confidence,
    estimatedImpact: stable ? impact : directional,
    priority: stable ? "High" : "Medium",
  });

  return recs.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
}
