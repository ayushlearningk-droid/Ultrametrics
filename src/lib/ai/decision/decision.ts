/**
 * AI Decision Center — decision graph + explanation engine (Sprint 45).
 *
 * Composes the deterministic decision model: the conclusion graph (Performance
 * → Root Cause → Reasoning → Recommendation → Command → Expected Outcome), one
 * reusable explanation block per command, the confidence breakdown, and the
 * decision timeline. Every string traces to a grounded engine output — no
 * fabrication, no execution, no I/O.
 */

import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type { MarketingBrain } from "@/lib/ai/brain/types";
import type { Command } from "@/lib/ai/command-center/types";
import { buildConfidenceBreakdown } from "./confidence";
import { buildDecisionTimeline } from "./timeline";
import type {
  DecisionGraph,
  DecisionNode,
  DecisionEdge,
  ExplanationBlock,
  ConfidenceBreakdown,
  DecisionModel,
} from "./types";

export interface DecisionInput {
  brain: MarketingBrain;
  reasoning: ReasoningResult;
  commands: Command[];
}

/* ── Decision graph ──────────────────────────────────────────────────────── */

/**
 * Build the conclusion graph. Consistent by construction: every edge references
 * a node added before it. Stages with no grounded content are skipped.
 */
export function buildDecisionGraph(
  reasoning: ReasoningResult,
  commands: Command[]
): DecisionGraph {
  const nodes: DecisionNode[] = [];
  const edges: DecisionEdge[] = [];
  const add = (n: DecisionNode) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
  };

  add({ id: "performance", type: "Performance", label: "Account performance" });

  let prev = "performance";
  if (reasoning.diagnosis) {
    add({ id: "root-cause", type: "RootCause", label: reasoning.diagnosis });
    edges.push({ from: prev, to: "root-cause", relation: "diagnosed as" });
    prev = "root-cause";
  }

  add({ id: "reasoning", type: "Reasoning", label: reasoning.executiveSummary });
  edges.push({ from: prev, to: "reasoning", relation: "analyzed by" });

  const topAction = reasoning.prioritizedActions[0];
  if (topAction) {
    add({ id: "recommendation", type: "Recommendation", label: topAction.action });
    edges.push({ from: "reasoning", to: "recommendation", relation: "produces" });

    // Each command is a concrete realization of the recommendation.
    commands.forEach((c) => {
      add({ id: c.id, type: "Command", label: c.title });
      edges.push({ from: "recommendation", to: c.id, relation: "realized by" });
    });

    add({
      id: "outcome",
      type: "ExpectedOutcome",
      label: reasoning.expectedOutcome ?? "Improved performance",
    });
    // Outcome flows from the recommendation (or its commands when present).
    const sourceForOutcome = commands[0]?.id ?? "recommendation";
    edges.push({ from: sourceForOutcome, to: "outcome", relation: "expected to yield" });
  }

  return { nodes, edges };
}

/* ── Explanation engine ──────────────────────────────────────────────────── */

function ifIgnored(command: Command): string {
  if (command.source === "risk") {
    return `Unaddressed: ${command.description} ${command.estimatedImpact}`;
  }
  if (command.source === "opportunity") {
    return `Forgone upside — ${command.estimatedImpact}`;
  }
  return "The executive plan stalls until this action is decided.";
}

function ifExecuted(command: Command): string {
  const reversible = command.rollbackAvailable
    ? " Reversible via rollback if results regress."
    : " Not auto-reversible — confirm before executing.";
  return `${command.estimatedImpact}${reversible}`;
}

/**
 * One explanation block per command. Answers: what happened, why, evidence,
 * risk, confidence, what-if-ignored, what-if-executed — all grounded.
 */
export function buildExplanations(
  input: DecisionInput,
  confidence: ConfidenceBreakdown
): ExplanationBlock[] {
  const { reasoning, commands } = input;
  const whatHappened = reasoning.diagnosis
    ? `${reasoning.executiveSummary}`
    : reasoning.executiveSummary;

  return commands.map((c) => ({
    commandId: c.id,
    title: c.title,
    whatHappened,
    why: c.description,
    evidence: reasoning.evidence,
    risk: c.risk,
    confidence,
    ifIgnored: ifIgnored(c),
    ifExecuted: ifExecuted(c),
  }));
}

/* ── Composed model ──────────────────────────────────────────────────────── */

export function buildDecision(input: DecisionInput): DecisionModel {
  const confidence = buildConfidenceBreakdown(input.reasoning, input.brain.health);
  return {
    graph: buildDecisionGraph(input.reasoning, input.commands),
    confidence,
    explanations: buildExplanations(input, confidence),
    timeline: buildDecisionTimeline(input.reasoning, input.commands),
  };
}
