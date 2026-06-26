/**
 * AI Command Center — shared types (Sprint 44).
 *
 * The reusable orchestration layer that turns Marketing Brain intelligence
 * (opportunities · risks · executive actions) into actionable AI Commands. Pure
 * data contracts — no I/O, no execution, no model calls, no provider APIs. The
 * future UI and the (separate) Action Engine execution path consume these.
 */

import type { Priority, Severity } from "@/lib/ai/brain/types";
import type { Confidence } from "@/lib/ai/reasoning/types";

export type { Confidence, Priority, Severity };

/** Where a command originated inside the Marketing Brain. */
export type CommandSource = "opportunity" | "risk" | "executive";

/** Functional grouping for a command (reuses the Brain's vocabulary + Risk). */
export type CommandCategory =
  | "Scaling"
  | "Creative"
  | "Budget"
  | "Audience"
  | "Placement"
  | "Campaign"
  | "Risk"
  | "Executive";

/**
 * The kind of change a command represents. Maps 1:1 to a (future) Action Engine
 * handler; today it only drives approval/rollback policy + simulation timing.
 * `review` is a non-mutating, human-review-only command (never executes).
 */
export type ExecutionType =
  | "pause"
  | "budget_adjustment"
  | "scale"
  | "creative_refresh"
  | "audience_expansion"
  | "placement_shift"
  | "bid_review"
  | "review";

/**
 * Approval lifecycle. `executed` / `rolled_back` are reserved for a FUTURE
 * execution pipeline — this sprint never transitions into them.
 */
export type ApprovalState =
  | "pending"
  | "simulated"
  | "approved"
  | "rejected"
  | "executed"
  | "rolled_back";

/** A reusable, grounded AI Command — the unit the Command Center orchestrates. */
export interface Command {
  id: string;
  title: string;
  description: string;
  category: CommandCategory;
  source: CommandSource;
  confidence: Confidence;
  priority: Priority;
  /** Grounded impact text carried verbatim from the engine (never fabricated). */
  estimatedImpact: string;
  /** Qualitative downside/risk note (grounded in the source signal). */
  risk: string;
  requiresApproval: boolean;
  executionType: ExecutionType;
  rollbackAvailable: boolean;
  status: ApprovalState;
}

/** Deterministic simulation of a command — grounded, never fabricated. */
export interface SimulationResult {
  commandId: string;
  /** Grounded expected-improvement statement (verbatim from the engine). */
  expectedImprovement: string;
  /** Grounded qualitative downside if the command is executed. */
  possibleDownside: string;
  confidence: Confidence;
  /** Deterministic effort estimate (process time, not a performance metric). */
  estimatedExecutionTime: string;
  /** True when the source carried a quantified impact; false = directional. */
  quantified: boolean;
}

/** Result of an approval-state transition request. */
export interface ApprovalTransition {
  ok: boolean;
  state: ApprovalState;
  reason?: string;
}
