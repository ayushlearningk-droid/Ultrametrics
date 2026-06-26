/**
 * AI Decision Center — decision timeline (Sprint 45).
 *
 * Builds the chronological history of how a conclusion was reached:
 * Performance → Root Cause → Reasoning → Recommendation → Command. Deterministic
 * — the order is fixed and each label is grounded in an engine output. Pure.
 */

import type { ReasoningResult } from "@/lib/ai/reasoning/types";
import type { Command } from "@/lib/ai/command-center/types";
import type { DecisionTimelineStep, DecisionStage } from "./types";

function step(
  order: number,
  stage: DecisionStage,
  label: string
): DecisionTimelineStep {
  return { order, stage, label };
}

/**
 * Compose the decision timeline. Stages without grounded content are omitted
 * (e.g. no diagnosis → no Root Cause step), and `order` stays contiguous.
 */
export function buildDecisionTimeline(
  reasoning: ReasoningResult,
  commands: Command[]
): DecisionTimelineStep[] {
  const steps: DecisionTimelineStep[] = [];
  let order = 0;

  steps.push(step(order++, "Performance", "Performance observed and aggregated."));

  if (reasoning.diagnosis) {
    steps.push(step(order++, "RootCause", `Root cause diagnosed: ${reasoning.diagnosis}.`));
  }

  steps.push(step(order++, "Reasoning", reasoning.executiveSummary));

  const topAction = reasoning.prioritizedActions[0];
  if (topAction) {
    steps.push(
      step(order++, "Recommendation", `Recommended: ${topAction.action} (${topAction.priority} priority).`)
    );
  }

  const topCommand = commands[0];
  if (topCommand) {
    steps.push(
      step(order++, "Command", `Command prepared: ${topCommand.title} (status: ${topCommand.status}).`)
    );
  }

  return steps;
}
