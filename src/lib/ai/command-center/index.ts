/**
 * AI Command Center (Sprint 44) — single entry point.
 *
 * The reusable orchestration layer that maps Marketing Brain intelligence into
 * actionable AI Commands, simulates them deterministically, models approval,
 * and provides queue helpers. Reasoning + orchestration only — no execution, no
 * provider APIs, no I/O. Future UI and the Action Engine execution path consume
 * these exports.
 */

export * from "./types";
export { mapBrainToCommands } from "./command";
export { simulateCommand, simulateCommands } from "./simulator";
export {
  initialApprovalState,
  canTransition,
  transition,
  applyDecision,
  isActionable,
  isApproved,
  isTerminal,
} from "./approval";
export {
  groupByPriority,
  groupByCategory,
  groupByApproval,
  getNextRecommended,
  orderByRecommendation,
} from "./queue";
