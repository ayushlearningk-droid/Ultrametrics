/**
 * AI Decision Center (Sprint 45) — single entry point.
 *
 * The reusable, deterministic explanation layer over the Marketing Brain,
 * Reasoning Engine, and Command Center. It explains HOW the AI reached each
 * conclusion (decision graph · confidence breakdown · explanation blocks ·
 * decision timeline). Reasoning only — no execution, no provider calls, no I/O.
 */

export * from "./types";
export {
  buildDecision,
  buildDecisionGraph,
  buildExplanations,
  type DecisionInput,
} from "./decision";
export {
  buildConfidenceBreakdown,
  confidenceRank,
} from "./confidence";
export { buildDecisionTimeline } from "./timeline";
export {
  validateGraph,
  nodesOfType,
  outgoing,
  incoming,
  hasFullChain,
  type GraphIntegrity,
} from "./relationships";
