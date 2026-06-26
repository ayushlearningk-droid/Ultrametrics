/**
 * AI Decision Center — shared types (Sprint 45).
 *
 * A pure, deterministic EXPLANATION layer over the existing intelligence stack
 * (Marketing Brain · Reasoning Engine · Command Center). It explains HOW the AI
 * reached each conclusion — it never executes, calls a provider, or invents
 * data. Every field traces to a grounded engine output. No I/O.
 */

import type { Confidence } from "@/lib/ai/reasoning/types";
import type { Command } from "@/lib/ai/command-center/types";

export type { Confidence, Command };

/* ── Decision graph ──────────────────────────────────────────────────────── */
export type DecisionNodeType =
  | "Performance"
  | "RootCause"
  | "Reasoning"
  | "Recommendation"
  | "Command"
  | "ExpectedOutcome";

export interface DecisionNode {
  id: string;
  type: DecisionNodeType;
  label: string;
}
export interface DecisionEdge {
  from: string;
  to: string;
  relation: string;
}
export interface DecisionGraph {
  nodes: DecisionNode[];
  edges: DecisionEdge[];
}

/* ── Confidence breakdown ────────────────────────────────────────────────── */
export type ConfidenceFactorKey =
  | "dataQuality"
  | "signalStrength"
  | "evidence"
  | "reasoning";

export interface ConfidenceFactor {
  key: ConfidenceFactorKey;
  level: Confidence;
  /** Representative 0–100 band for the qualitative level (not a probability). */
  score: number;
  rationale: string;
}
export interface ConfidenceBreakdown {
  dataQuality: ConfidenceFactor;
  signalStrength: ConfidenceFactor;
  evidence: ConfidenceFactor;
  reasoning: ConfidenceFactor;
  overall: Confidence;
  overallScore: number;
}

/* ── Explanation blocks ──────────────────────────────────────────────────── */
export interface ExplanationBlock {
  commandId: string;
  title: string;
  whatHappened: string;
  why: string;
  evidence: string[];
  risk: string;
  confidence: ConfidenceBreakdown;
  ifIgnored: string;
  ifExecuted: string;
}

/* ── Decision timeline ───────────────────────────────────────────────────── */
export type DecisionStage =
  | "Performance"
  | "RootCause"
  | "Reasoning"
  | "Recommendation"
  | "Command";

export interface DecisionTimelineStep {
  order: number;
  stage: DecisionStage;
  label: string;
}

/* ── The composed decision model ─────────────────────────────────────────── */
export interface DecisionModel {
  graph: DecisionGraph;
  confidence: ConfidenceBreakdown;
  explanations: ExplanationBlock[];
  timeline: DecisionTimelineStep[];
}
