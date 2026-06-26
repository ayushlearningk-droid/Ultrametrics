/**
 * AI Command Center — command mapping (Sprint 44).
 *
 * Pure mapper: turns the existing Marketing Brain (opportunity graph, risk
 * graph, executive intelligence) into reusable AI Commands. Every field is
 * carried from a grounded engine output — nothing is invented. Deterministic:
 * the same brain always yields the same commands in the same order. No I/O.
 */

import type {
  MarketingBrain,
  Opportunity,
  Risk,
  Priority,
  Severity,
} from "@/lib/ai/brain/types";
import type {
  Command,
  CommandCategory,
  ExecutionType,
} from "./types";

/** Severity → priority, so risks rank alongside opportunities consistently. */
function severityToPriority(severity: Severity): Priority {
  if (severity === "critical" || severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

/** Execution policy per type: does it require approval, can it be rolled back? */
const EXECUTION_POLICY: Record<
  ExecutionType,
  { requiresApproval: boolean; rollbackAvailable: boolean }
> = {
  pause: { requiresApproval: true, rollbackAvailable: true },
  budget_adjustment: { requiresApproval: true, rollbackAvailable: true },
  scale: { requiresApproval: true, rollbackAvailable: true },
  bid_review: { requiresApproval: true, rollbackAvailable: true },
  audience_expansion: { requiresApproval: true, rollbackAvailable: false },
  placement_shift: { requiresApproval: true, rollbackAvailable: false },
  creative_refresh: { requiresApproval: true, rollbackAvailable: false },
  // Human-review only — never mutates a campaign, so no approval gate.
  review: { requiresApproval: false, rollbackAvailable: false },
};

/** Opportunity type → execution type (the change the opportunity implies). */
function opportunityExecutionType(type: Opportunity["type"]): ExecutionType {
  switch (type) {
    case "Scaling":
      return "scale";
    case "Creative":
      return "creative_refresh";
    case "Budget":
      return "budget_adjustment";
    case "Audience":
      return "audience_expansion";
    case "Placement":
      return "placement_shift";
    case "Campaign":
      return "review";
  }
}

/** Risk type → the mitigating execution type. */
function riskExecutionType(type: Risk["type"]): ExecutionType {
  switch (type) {
    case "Budget Waste":
    case "Low ROAS":
      return "budget_adjustment";
    case "Creative Fatigue":
    case "Falling CTR":
      return "creative_refresh";
    case "High CPC":
      return "bid_review";
    case "Audience Saturation":
      return "audience_expansion";
    case "Learning Limited":
      return "review";
  }
}

function buildCommand(args: {
  id: string;
  title: string;
  description: string;
  category: CommandCategory;
  source: Command["source"];
  confidence: Command["confidence"];
  priority: Priority;
  estimatedImpact: string;
  risk: string;
  executionType: ExecutionType;
}): Command {
  const policy = EXECUTION_POLICY[args.executionType];
  return {
    ...args,
    requiresApproval: policy.requiresApproval,
    rollbackAvailable: policy.rollbackAvailable,
    status: "pending",
  };
}

/**
 * Map a composed Marketing Brain into the full command set: one command per
 * opportunity, per risk, and per executive immediate-action. Order is stable:
 * opportunities (engine-ranked) → risks (engine-ranked) → executive actions.
 */
export function mapBrainToCommands(brain: MarketingBrain): Command[] {
  const commands: Command[] = [];

  brain.opportunities.forEach((o, i) => {
    const executionType = opportunityExecutionType(o.type);
    commands.push(
      buildCommand({
        id: `cmd-opp-${i}`,
        title: o.title,
        description: `Opportunity (${o.type}) surfaced by the marketing brain.`,
        category: o.type as CommandCategory,
        source: "opportunity",
        confidence: o.confidence,
        priority: o.priority,
        estimatedImpact: o.expectedImpact,
        risk: "Reversible change — validate with a controlled test before scaling.",
        executionType,
      })
    );
  });

  brain.risks.forEach((r, i) => {
    commands.push(
      buildCommand({
        id: `cmd-risk-${i}`,
        title: r.mitigation,
        description: `Mitigation for detected risk: ${r.type} (${r.severity}).`,
        category: "Risk",
        source: "risk",
        confidence: r.confidence,
        priority: severityToPriority(r.severity),
        estimatedImpact: `Reduces exposure to ${r.type.toLowerCase()}.`,
        risk: `Active risk severity: ${r.severity}.`,
        executionType: riskExecutionType(r.type),
      })
    );
  });

  brain.executive.immediateActions.forEach((action, i) => {
    commands.push(
      buildCommand({
        id: `cmd-exec-${i}`,
        title: action,
        description: "Immediate action from the executive brief.",
        category: "Executive",
        source: "executive",
        confidence: brain.executive.confidence,
        priority: "High",
        estimatedImpact:
          brain.executive.expectedOutcome ??
          "Directional — supports the executive plan.",
        risk: "Review before execution; impact is plan-level.",
        executionType: "review",
      })
    );
  });

  return commands;
}
