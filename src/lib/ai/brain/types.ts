/**
 * Marketing Brain — types (Sprint 39).
 *
 * The reusable intelligence layer above every AI engine. Reasoning only — no
 * execution. All outputs are grounded in the existing engine inputs.
 */

import type { Confidence } from "@/lib/ai/reasoning/types";

export type Severity = "low" | "medium" | "high" | "critical";
export type Priority = "High" | "Medium" | "Low";

/* ── Health ──────────────────────────────────────────────────────────────── */
export interface HealthDimension {
  key: string;
  score: number; // 0–100 (higher = healthier)
  severity: Severity;
  explanation: string;
  confidence: Confidence;
}
export interface HealthReport {
  overall: number;
  severity: Severity;
  dimensions: HealthDimension[];
  confidence: Confidence;
}

/* ── Opportunity graph ───────────────────────────────────────────────────── */
export type OpportunityType =
  | "Scaling"
  | "Creative"
  | "Budget"
  | "Audience"
  | "Placement"
  | "Campaign";
export interface Opportunity {
  type: OpportunityType;
  title: string;
  expectedImpact: string;
  confidence: Confidence;
  priority: Priority;
}

/* ── Risk graph ──────────────────────────────────────────────────────────── */
export type RiskType =
  | "Budget Waste"
  | "Creative Fatigue"
  | "High CPC"
  | "Falling CTR"
  | "Low ROAS"
  | "Learning Limited"
  | "Audience Saturation";
export interface Risk {
  type: RiskType;
  severity: Severity;
  confidence: Confidence;
  mitigation: string;
}

/* ── Executive brain ─────────────────────────────────────────────────────── */
export interface ExecutiveIntelligence {
  executiveSummary: string;
  healthScore: number;
  topOpportunity: Opportunity | null;
  biggestRisk: Risk | null;
  immediateActions: string[];
  expectedOutcome: string | null;
  confidence: Confidence;
}

/* ── Daily pulse ─────────────────────────────────────────────────────────── */
export interface DailyPulse {
  wins: string[];
  problems: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
}

/* ── Knowledge graph (pure TS; no graph DB) ──────────────────────────────── */
export interface GraphNode {
  id: string;
  type: string;
  label: string;
}
export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ── The composed Brain ──────────────────────────────────────────────────── */
export interface MarketingBrain {
  health: HealthReport;
  opportunities: Opportunity[];
  risks: Risk[];
  executive: ExecutiveIntelligence;
  pulse: DailyPulse;
  graph: KnowledgeGraph;
}
