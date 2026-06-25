/**
 * AI Evaluation Suite — scenario library (Sprint 33.5, production grade).
 *
 * Deterministic marketing-reasoning scenarios that pin each prompt to the
 * EXPECTED behaviour of the current pipeline: intent, model, required tools,
 * tools that must NOT be forced (anti-misroute), the context source the answer
 * draws from, an eval confidence, and a human reasoning-path note. No answers
 * are hardcoded — the runner derives actual behaviour from routeModel +
 * planRetrieval and scores it. Development-only; never imported by the app.
 *
 * Scope: the DETERMINISTIC routing/planning layer (no live model, no network,
 * no cost). Prose grading needs a live model + grader and is out of scope.
 */

import type { CopilotIntent, ToolName } from "../planner/retrieval-planner";

export const SONNET = "claude-sonnet-4-6";
export const OPUS = "claude-opus-4-8";
export type ModelName = typeof SONNET | typeof OPUS;

export type ScenarioCategory =
  | "change"
  | "diagnose"
  | "ranking"
  | "recommend"
  | "comparison"
  | "overview"
  | "context";

/** Where a grounded answer should come from (documents reasoning path). */
export type ContextSource =
  | "metrics"
  | "change"
  | "recommendations"
  | "executive_summary"
  | "memory"
  | "timeline"
  | "notifications"
  | "reports";

export interface EvalScenario {
  id: string;
  name: string;
  category: ScenarioCategory;
  prompt: string;
  expectedIntent: CopilotIntent;
  expectedModel: ModelName;
  /** Tools that MUST appear in the plan's required set (subset check). */
  expectedTools: ToolName[];
  /** Tools the plan must NOT require (proves no misroute / wasted call). */
  forbiddenTools?: ToolName[];
  expectedConfidence: "high" | "medium" | "low";
  /** Where the grounded answer is sourced from. */
  contextSource: ContextSource;
  /** Human-readable expected reasoning path (documentation only). */
  reasoningPath: string;
}

const CHANGE_TOOLS: ToolName[] = [
  "get_change_analysis",
  "get_root_cause",
  "get_recommendations",
];

export const EVAL_SCENARIOS: EvalScenario[] = [
  // ── Change ("why did X move") ──
  {
    id: "roas-dropped",
    name: "ROAS dropped",
    category: "change",
    prompt: "Why did ROAS drop yesterday?",
    expectedIntent: "change",
    expectedModel: OPUS,
    expectedTools: CHANGE_TOOLS,
    expectedConfidence: "high",
    contextSource: "change",
    reasoningPath: "change-analysis (what) → root-cause (why) → recommendations (do)",
  },
  {
    id: "cpc-increased",
    name: "CPC increased",
    category: "change",
    prompt: "Why did CPC increase this week?",
    expectedIntent: "change",
    expectedModel: OPUS,
    expectedTools: CHANGE_TOOLS,
    expectedConfidence: "high",
    contextSource: "change",
    reasoningPath: "change-analysis → root-cause → recommendations",
  },
  {
    id: "ctr-dropped",
    name: "CTR dropped",
    category: "change",
    prompt: "Why did CTR drop over the last 7 days?",
    expectedIntent: "change",
    expectedModel: OPUS,
    expectedTools: CHANGE_TOOLS,
    expectedConfidence: "high",
    contextSource: "change",
    reasoningPath: "change-analysis → root-cause → recommendations",
  },
  // ── Diagnose ──
  {
    id: "creative-fatigue",
    name: "Creative fatigue",
    category: "diagnose",
    prompt: "Which campaigns are underperforming from creative fatigue?",
    expectedIntent: "diagnose",
    expectedModel: OPUS,
    expectedTools: ["get_root_cause", "get_recommendations"],
    forbiddenTools: ["get_change_analysis"],
    expectedConfidence: "high",
    contextSource: "recommendations",
    reasoningPath: "root-cause (single-window why) → recommendations",
  },
  {
    id: "root-cause",
    name: "Root cause",
    category: "diagnose",
    prompt: "What's the root cause of my poor performance?",
    expectedIntent: "diagnose",
    expectedModel: OPUS,
    expectedTools: ["get_root_cause", "get_recommendations"],
    expectedConfidence: "high",
    contextSource: "recommendations",
    reasoningPath: "root-cause → recommendations",
  },
  // ── Ranking ──
  {
    id: "campaign-ranking",
    name: "Campaign ranking",
    category: "ranking",
    prompt: "Rank my campaigns by ROAS.",
    expectedIntent: "rank",
    expectedModel: OPUS,
    expectedTools: ["get_workspace_metrics"],
    forbiddenTools: ["get_change_analysis", "get_root_cause"],
    expectedConfidence: "high",
    contextSource: "metrics",
    reasoningPath: "campaign-level metrics ranked by ROAS",
  },
  {
    id: "worst-campaign",
    name: "Worst campaign",
    category: "ranking",
    prompt: "What's my worst performing campaign?",
    expectedIntent: "rank",
    expectedModel: OPUS,
    expectedTools: ["get_workspace_metrics"],
    forbiddenTools: ["get_change_analysis", "get_root_cause"],
    expectedConfidence: "high",
    contextSource: "metrics",
    reasoningPath: "campaign-level metrics, lowest performer",
  },
  {
    id: "best-campaign",
    name: "Best campaign",
    category: "ranking",
    prompt: "What's my best performing campaign?",
    expectedIntent: "rank",
    expectedModel: OPUS,
    expectedTools: ["get_workspace_metrics"],
    forbiddenTools: ["get_change_analysis", "get_root_cause"],
    expectedConfidence: "high",
    contextSource: "metrics",
    reasoningPath: "campaign-level metrics, top performer",
  },
  // ── Recommend ──
  {
    id: "budget-exhaustion",
    name: "Budget exhaustion / waste",
    category: "recommend",
    prompt: "Which campaigns are wasting budget?",
    expectedIntent: "recommend",
    expectedModel: OPUS,
    expectedTools: ["get_recommendations"],
    forbiddenTools: ["get_change_analysis"],
    expectedConfidence: "high",
    contextSource: "recommendations",
    reasoningPath: "recommendations (waste) grounded by campaign metrics",
  },
  {
    id: "recommendations",
    name: "Improvement recommendations",
    category: "recommend",
    prompt: "What should I do to improve ROAS?",
    expectedIntent: "recommend",
    expectedModel: OPUS,
    expectedTools: ["get_recommendations"],
    expectedConfidence: "high",
    contextSource: "recommendations",
    reasoningPath: "recommendations ranked by impact",
  },
  // ── Comparison (model-decided; planner leaves tools open) ──
  {
    id: "compare-periods",
    name: "Compare yesterday vs last week",
    category: "comparison",
    prompt: "Compare yesterday vs the last 7 days.",
    expectedIntent: "unknown",
    expectedModel: OPUS,
    expectedTools: [],
    expectedConfidence: "high",
    contextSource: "metrics",
    reasoningPath: "model selects metrics/change-analysis for both windows + delta",
  },
  {
    id: "compare-providers",
    name: "Compare Meta vs Google",
    category: "comparison",
    prompt: "Compare Meta vs Google performance.",
    expectedIntent: "unknown",
    expectedModel: OPUS,
    expectedTools: [],
    expectedConfidence: "high",
    contextSource: "metrics",
    reasoningPath: "per-provider metrics, never blends currencies",
  },
  // ── Overview ──
  {
    id: "executive-summary",
    name: "Executive summary",
    category: "overview",
    prompt: "Summarize today's account.",
    expectedIntent: "overview",
    expectedModel: OPUS,
    expectedTools: ["get_executive_summary"],
    forbiddenTools: ["get_change_analysis", "get_root_cause"],
    expectedConfidence: "high",
    contextSource: "executive_summary",
    reasoningPath: "executive summary per source",
  },
  {
    id: "reports-summary",
    name: "Reports summary",
    category: "overview",
    prompt: "Give me a summary report of performance.",
    expectedIntent: "overview",
    expectedModel: OPUS,
    expectedTools: ["get_executive_summary"],
    expectedConfidence: "high",
    contextSource: "reports",
    reasoningPath: "executive summary → report layout",
  },
  // ── Context awareness (answered from injected context, not heavy tools) ──
  {
    id: "memory-recall",
    name: "Workspace memory recall",
    category: "context",
    prompt: "What ROAS target did we agree on?",
    expectedIntent: "unknown",
    expectedModel: SONNET,
    expectedTools: [],
    forbiddenTools: [
      "get_change_analysis",
      "get_root_cause",
      "get_recommendations",
      "get_executive_summary",
    ],
    expectedConfidence: "high",
    contextSource: "memory",
    reasoningPath: "answered from injected workspace memory; no metric tool needed",
  },
  {
    id: "timeline-awareness",
    name: "Timeline awareness",
    category: "context",
    prompt: "What happened recently in my account?",
    expectedIntent: "unknown",
    expectedModel: SONNET,
    expectedTools: [],
    forbiddenTools: ["get_change_analysis", "get_root_cause"],
    expectedConfidence: "high",
    contextSource: "timeline",
    reasoningPath: "answered from aggregator recent-activity signals",
  },
  {
    id: "notification-awareness",
    name: "Notification awareness",
    category: "context",
    prompt: "Any sync failures I should know about?",
    expectedIntent: "unknown",
    expectedModel: SONNET,
    expectedTools: [],
    forbiddenTools: ["get_change_analysis", "get_root_cause"],
    expectedConfidence: "high",
    contextSource: "notifications",
    reasoningPath: "answered from aggregator recent-activity (sync failures)",
  },
];

/** Context mechanisms that are actually wired into the pipeline (for the
 *  context/memory-usage metric). Reflects real integration, not a guess. */
export const WIRED_CONTEXT_SOURCES: ReadonlySet<ContextSource> = new Set<ContextSource>([
  "metrics",
  "change",
  "recommendations",
  "executive_summary",
  "memory", // Sprint 31: injected every turn + remember tool
  "timeline", // Sprint 32: aggregator recent-activity
  "notifications", // Sprint 32: aggregator recent-activity
  "reports", // executive summary backs the report
]);
