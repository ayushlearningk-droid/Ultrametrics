/**
 * AI Creative Intelligence — shared types (Sprint 35).
 *
 * Grounded contracts for the deterministic creative layer. Inputs are real
 * performance metrics + the diagnosis the existing engines already produce
 * (root causes, recommendations) + workspace memory. Outputs are DERIVED
 * creative SIGNALS (clearly heuristic, never provider metrics), a deterministic
 * strategy, and a structured creative brief. Pure data — no I/O, no model calls,
 * no image/video generation.
 */

export type Quality = "strong" | "moderate" | "weak" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type CreativeAngle = "Emotional" | "Educational" | "UGC" | "Comparison";

export interface CreativeInput {
  roas?: number;
  ctr?: number; // fraction (0.015 = 1.5%)
  cpc?: number;
  frequency?: number;
  spend?: number;
  conversions?: number;
  /** Account/campaign CTR trend, when known. */
  ctrTrend?: "improving" | "declining" | "stable";
  /** Root-cause keys/strings from get_root_cause (e.g. "creative_fatigue"). */
  causes?: string[];
  /** Recommendation action strings (advisory context). */
  recommendations?: string[];
  /** Durable workspace memory notes (preferences/goals). */
  memories?: string[];
}

export interface CreativeSignals {
  /** 0–100 derived fatigue indicator (heuristic, not a provider metric). */
  fatigueScore: number;
  hookQuality: Quality;
  visualQuality: Quality;
  ctaQuality: Quality;
  audienceMatch: Quality;
  offerMatch: Quality;
  messagingProblems: string[];
  confidence: Confidence;
}

export interface CreativeStrategy {
  /** Concrete creative actions (Replace hook, New CTA, New Offer, …). */
  actions: string[];
  /** Recommended creative angles to explore. */
  angles: CreativeAngle[];
  testRecommendation: string;
}

export interface CreativeBrief {
  executiveGoal: string;
  problem: string;
  evidence: string[];
  targetAudience: string;
  hookIdeas: string[];
  creativeDirection: string;
  sceneSuggestions: string[];
  scriptDirection: string;
  cta: string;
  successMetric: string;
  confidence: Confidence;
}
