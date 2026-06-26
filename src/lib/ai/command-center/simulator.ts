/**
 * AI Command Center — deterministic simulation (Sprint 44).
 *
 * Produces a grounded, repeatable simulation for a command. It NEVER fabricates
 * numbers: the expected improvement is the engine's grounded impact text, and a
 * quantified flag marks whether that text carries real ranges. The estimated
 * execution time is a fixed effort constant per execution type (a process-time
 * estimate, not a performance metric). Pure — no I/O, no randomness, no model.
 */

import type { Command, ExecutionType, SimulationResult } from "./types";

/** Fixed effort estimate per execution type. Process time, not a metric. */
const EXECUTION_TIME: Record<ExecutionType, string> = {
  pause: "~1 min",
  budget_adjustment: "~2 min",
  scale: "~2 min",
  bid_review: "~5 min",
  audience_expansion: "~5 min",
  placement_shift: "~5 min",
  creative_refresh: "~1 day (asset production)",
  review: "Manual review",
};

/** A grounded impact string is "quantified" only when it cites a real range. */
function isQuantified(estimatedImpact: string): boolean {
  return /\d+\s*[–-]\s*\d+%|\d+%/.test(estimatedImpact);
}

/** Qualitative downside grounded in the command's reversibility + source. */
function downsideFor(command: Command): string {
  if (command.rollbackAvailable) {
    return "Limited — change is reversible via rollback if results regress.";
  }
  if (command.executionType === "creative_refresh") {
    return "Production cost/time; no spend change until new assets go live.";
  }
  if (command.executionType === "review") {
    return "None — review only; nothing is changed or spent.";
  }
  return "Change is not auto-reversible; confirm before executing.";
}

/**
 * Simulate a single command deterministically. Same command → same result.
 */
export function simulateCommand(command: Command): SimulationResult {
  const quantified = isQuantified(command.estimatedImpact);
  return {
    commandId: command.id,
    expectedImprovement: quantified
      ? command.estimatedImpact
      : `Directional: ${command.estimatedImpact}`,
    possibleDownside: downsideFor(command),
    confidence: command.confidence,
    estimatedExecutionTime: EXECUTION_TIME[command.executionType],
    quantified,
  };
}

/** Simulate a batch of commands, preserving order. */
export function simulateCommands(commands: Command[]): SimulationResult[] {
  return commands.map(simulateCommand);
}
