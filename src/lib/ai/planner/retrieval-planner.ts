/**
 * Universal AI Copilot — Retrieval Planner (Sprint 32, Phase 2).
 *
 * A deterministic planning layer that decides, per turn, WHICH existing tools an
 * intent requires (and which to skip), then instructs the model to merge their
 * outputs into a single, de-duplicated executive answer. Pure functions, no I/O,
 * no new models — it emits an additive system-prompt directive that steers the
 * EXISTING tool loop; it never filters tools structurally (the model keeps the
 * autonomy to deviate when a question genuinely needs more).
 *
 *   classifyIntent → selectTools (Tool Selection Planner)
 *                  → planRetrieval (Retrieval Planner: intent + ordered tools)
 *                  → planToPromptBlock (Context Deduplicator + Response Composer
 *                    directives: one merged answer, no repeated figures)
 *
 * Why prompt-directive, not code dedup: the Anthropic API requires exactly one
 * tool_result per tool_use, so dropping/merging result blocks in the loop would
 * break pairing. Dedup/compose are therefore deterministic INSTRUCTIONS the
 * instruction-following model applies while composing.
 */

import { detectChangeIntent } from "@/lib/ai/change/change-intent";

export type CopilotIntent =
  | "change"
  | "diagnose"
  | "recommend"
  | "rank"
  | "overview"
  | "factual"
  | "memory"
  | "unknown";

export type ToolName =
  | "get_workspace_metrics"
  | "get_provider_metrics"
  | "get_recommendations"
  | "get_executive_summary"
  | "get_change_analysis"
  | "get_root_cause"
  | "remember_fact";

export interface RetrievalPlan {
  intent: CopilotIntent;
  /** Tools the intent requires (call only these unless the question needs more). */
  required: ToolName[];
  /** Tools that are unnecessary for this intent (avoid the wasted call). */
  skip: ToolName[];
}

const RE = {
  memory: /\b(remember|note that|keep in mind|save this|don't forget|make a note)\b/i,
  overview:
    /\b(summar(?:y|ise|ize)|overview|big picture|how(?:'s| is| are)\s+(?:my|the)\s+account|today'?s account)\b/i,
  recommend:
    /\b(recommend|what should i|should i\s+(?:scale|pause|cut|kill|do|fix)|wast(?:e|ing)|optimi[sz]e|improve|where.*(?:spend|budget))\b/i,
  diagnose: /\b(why is|why are|root cause|underperform|diagnos|problem|issue|concern)\b/i,
  rank: /\b(top|worst|best|highest|lowest|which campaigns?|high cpc|low ctr|low cpc|high ctr|rank)\b/i,
  factual:
    /\b(what(?:'s| is| are| was)|show(?: me)?|how much|how many)\b.*\b(ctr|cpc|cpm|roas|spend|clicks|impressions|conversions|revenue)\b/i,
};

/** Deterministic intent classification (first match wins, in priority order). */
export function classifyIntent(message: string): CopilotIntent {
  if (RE.memory.test(message)) return "memory";
  if (detectChangeIntent(message) !== null) return "change";
  if (RE.overview.test(message)) return "overview";
  if (RE.recommend.test(message)) return "recommend";
  if (RE.diagnose.test(message)) return "diagnose";
  if (RE.rank.test(message)) return "rank";
  if (RE.factual.test(message)) return "factual";
  return "unknown";
}

const ALL_METRIC_TOOLS: ToolName[] = [
  "get_workspace_metrics",
  "get_provider_metrics",
  "get_recommendations",
  "get_executive_summary",
  "get_change_analysis",
  "get_root_cause",
];

/** Tool Selection Planner: required + skip tools for an intent. */
export function selectTools(intent: CopilotIntent): {
  required: ToolName[];
  skip: ToolName[];
} {
  const not = (keep: ToolName[]): ToolName[] =>
    ALL_METRIC_TOOLS.filter((t) => !keep.includes(t));

  switch (intent) {
    case "change": {
      const req: ToolName[] = [
        "get_change_analysis",
        "get_root_cause",
        "get_recommendations",
      ];
      return { required: req, skip: not(req) };
    }
    case "diagnose": {
      const req: ToolName[] = ["get_root_cause", "get_recommendations"];
      return { required: req, skip: not(req) };
    }
    case "recommend": {
      const req: ToolName[] = ["get_recommendations", "get_workspace_metrics"];
      return { required: req, skip: not(req) };
    }
    case "rank":
      return {
        required: ["get_workspace_metrics"],
        skip: not(["get_workspace_metrics", "get_provider_metrics"]),
      };
    case "overview":
      return {
        required: ["get_executive_summary"],
        skip: not(["get_executive_summary"]),
      };
    case "factual":
      return {
        required: ["get_workspace_metrics"],
        skip: not(["get_workspace_metrics", "get_provider_metrics"]),
      };
    case "memory":
      return { required: ["remember_fact"], skip: ALL_METRIC_TOOLS };
    default:
      return { required: [], skip: [] }; // unknown → let the model decide
  }
}

/** Retrieval Planner: full per-turn plan for the latest user message. */
export function planRetrieval(message: string): RetrievalPlan {
  const intent = classifyIntent(message);
  const { required, skip } = selectTools(intent);
  return { intent, required, skip };
}

/** Context Deduplicator + Response Composer directives (always applied). */
const COMPOSE_DIRECTIVE =
  "Merge the tool outputs into ONE executive answer. Remove duplicate figures and repeated per-provider blocks — never state the same number twice. Make the minimum tool calls needed.";

/**
 * Render the plan as an additive system-prompt block. For a known intent it
 * names the required tools and the ones to skip; for "unknown" it only enforces
 * minimal-calls + single-answer composition (no constraint on tool choice).
 */
export function planToPromptBlock(plan: RetrievalPlan): string {
  if (plan.intent === "unknown") {
    return `\n\nRETRIEVAL PLAN: Use the fewest tools needed to answer. ${COMPOSE_DIRECTIVE}`;
  }
  const lines = [`RETRIEVAL PLAN (intent: ${plan.intent}):`];
  if (plan.required.length > 0) {
    lines.push(
      `- Prefer ONLY these tools: ${plan.required.join(", ")} (call others only if the question clearly requires them).`
    );
  }
  if (plan.skip.length > 0) {
    lines.push(`- Skip (not needed here): ${plan.skip.join(", ")}.`);
  }
  lines.push(`- ${COMPOSE_DIRECTIVE}`);
  return `\n\n${lines.join("\n")}`;
}
