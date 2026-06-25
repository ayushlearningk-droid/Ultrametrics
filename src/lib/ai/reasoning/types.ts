/**
 * Marketing Reasoning Engine — shared types (Sprint 34).
 *
 * Provider-agnostic, grounded input/output contracts for the deterministic
 * reasoning layer. Inputs mirror the shapes the existing tool handlers already
 * return (recommendations, root causes, trends, headline). Outputs are the
 * structured analyst narrative. No I/O, no model calls — pure data.
 */

export type Confidence = "high" | "medium" | "low";
export type Priority = "High" | "Medium" | "Low";
export type EvidenceLevel = "strong" | "moderate" | "limited";

export interface ImpactRange {
  metric: string;
  direction: "increase" | "decrease" | "recover";
  lowPct: number;
  highPct: number;
}

/** One recommendation, normalized from the get_recommendations tool result. */
export interface RecInput {
  action: string;
  impact: string;
  kind?: string;
  opportunityScore?: number; // 0..100, grounded composite
  evidenceLevel?: EvidenceLevel;
  impactRanges?: ImpactRange[];
  impactAssumption?: string;
}

/** One root cause, normalized from the get_root_cause tool result. */
export interface CauseInput {
  primaryCause: string;
  severity?: string; // critical | high | medium | low
  confidence?: string; // high | medium | low
  evidence?: string;
}

export interface TrendInput {
  metric: string;
  changeLabel: string; // e.g. "+18%"
  status: string; // improving | declining | stable
}

export interface ReasoningInput {
  headline: { spend: number; roas: number; revenue?: number; ctr?: number };
  currency?: string;
  trends: TrendInput[];
  causes: CauseInput[];
  recommendations: RecInput[];
  /** Durable workspace memory notes (preferences/goals), for grounding only. */
  memories?: string[];
  /** Watch-outs surfaced by the executive-summary tool. */
  watchOuts?: string[];
}

export interface PrioritizedAction {
  action: string;
  priority: Priority;
  /** Composite ranking score (higher = act first). Internal, not a metric. */
  score: number;
  confidence: Confidence;
}

export interface BusinessImpact {
  /** One-line grounded statement, or a clear "not quantified" note. */
  summary: string;
  /** The assumptions behind every range cited (verbatim from the tool). */
  assumptions: string[];
  /** True only when the tool provided estimated-impact ranges. */
  quantified: boolean;
}

export interface ReasoningResult {
  executiveSummary: string;
  diagnosis: string | null;
  evidence: string[];
  businessImpact: BusinessImpact;
  risks: string[];
  opportunities: string[];
  prioritizedActions: PrioritizedAction[];
  expectedOutcome: string | null;
  confidence: Confidence;
}
