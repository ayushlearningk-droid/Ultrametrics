/**
 * AI Media Buyer — types (Sprint 38).
 *
 * Planning-only contracts. Recommendations are PROPOSALS a senior media buyer
 * would prepare from the data — they are never executed and never edit a
 * campaign. Grounded in the existing engines; no invented performance.
 */

import type { Confidence } from "@/lib/ai/reasoning/types";

export type OptCategory =
  | "Budget"
  | "Audience"
  | "Placement"
  | "Creative"
  | "Bidding"
  | "Scaling";

export type OptPriority = "High" | "Medium" | "Low";

export interface OptimizationRec {
  category: OptCategory;
  /** The proposed change (planning only — not executed). */
  action: string;
  why: string;
  expectedOutcome: string;
  risk: string;
  confidence: Confidence;
  /** Grounded estimate or an explicit "directional" note — never invented. */
  estimatedImpact: string;
  priority: OptPriority;
}

export interface OptimizationPlan {
  executiveSummary: string;
  problemsFound: string[];
  opportunities: string[];
  recommendations: OptimizationRec[];
  confidence: Confidence;
}
