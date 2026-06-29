/**
 * Universal AI Copilot — Workspace Context Aggregator (Sprint 32, Phase 1).
 *
 * The orchestration FOUNDATION: assembles lightweight, prioritized workspace
 * signals so the assistant is context-aware without the user pointing it
 * anywhere. It does NOT redesign chat, the model router, or the tool loop — it
 * only produces an additive context block injected into the system prompt.
 *
 *   ┌──────────────── ContextAggregator ────────────────┐
 *   │ Priority (high→low):                               │
 *   │   1. Workspace Memory     (durable user intent)    │
 *   │   2. Connected connectors (what data exists)       │
 *   │   3. Recent activity      (sync failures / actions)│
 *   │   4. Recent topics        (conversation continuity)│
 *   │                                                    │
 *   │ EAGER (cheap, cached 60s): the four signals above. │
 *   │ LAZY  (on demand via existing tools, NEVER eagerly │
 *   │   fetched here): account KPIs, Morning Brief,       │
 *   │   Reports, Timeline detail, recommendations.        │
 *   └────────────────────────────────────────────────────┘
 *           │ feeds                       ▲ reuses
 *           ▼                             │
 *   WorkspaceContext.contextBlock   existing data layers (RLS-scoped)
 *           │
 *   buildSystemPrompt → existing routeModel + dispatchTool loop (unchanged)
 *
 * Token budget: each source is capped (constants below) so the injected block
 * stays small. Cache: a 60s in-memory TTL per workspace avoids re-aggregating on
 * every turn within a session. Grounding contract is preserved — signals convey
 * AWARENESS ("there were 2 sync failures"); the model still fetches every number
 * it states via the metrics tools.
 */

import "server-only";
import { listMemories } from "@/lib/data/workspace-memory";
import { getSyncJobsByWorkspace } from "@/lib/data/dashboard";
import { listActions } from "@/lib/data/action-queue";
import { listConversations } from "@/lib/data/conversations";
import type { KnowledgeGraph } from "@/lib/ai/brain";

/* ── Token-budget caps (keep the injected block small) ─────────────────────── */
const MAX_MEMORIES = 10;
const MAX_ACTIVITY = 4;
const MAX_TOPICS = 3;
/** Cap on relationship phrases in the marketing-graph awareness line. */
const MAX_GRAPH_RELATIONS = 6;
const RECENT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Entity node types added by Sprint 61 (the marketing graph). */
const ENTITY_NODE_TYPES = new Set(["Campaign", "Creative", "Audience"]);

/**
 * Summarise the Marketing Graph (Sprint 61) as awareness only — STRUCTURE, not
 * values. It lists relationship phrases built from node TYPES + edge relations
 * (e.g. "Campaign uses Creative"), restricted to edges touching an entity node.
 * It deliberately ignores node labels, so no metric/number ever leaks: grounding
 * is preserved and there is no numerical duplication. Returns "" when there are
 * no entity relationships. Pure — consumes the graph buildMarketingBrain()
 * already produced; it does not build or fetch anything.
 */
export function summarizeMarketingGraph(graph: KnowledgeGraph): string {
  const typeById = new Map(graph.nodes.map((n) => [n.id, n.type]));
  const phrases: string[] = [];
  const seen = new Set<string>();

  for (const edge of graph.edges) {
    const fromType = typeById.get(edge.from);
    const toType = typeById.get(edge.to);
    if (!fromType || !toType) continue;
    if (!ENTITY_NODE_TYPES.has(fromType) && !ENTITY_NODE_TYPES.has(toType)) {
      continue; // only edges involving Campaign / Creative / Audience
    }
    const phrase = `${fromType} ${edge.relation} ${toType}`;
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    phrases.push(phrase);
    if (phrases.length >= MAX_GRAPH_RELATIONS) break;
  }

  return phrases.join("; ");
}

/* ── Cache (60s TTL per workspace) ─────────────────────────────────────────── */
const CACHE_TTL_MS = 60_000;
interface CacheEntry {
  expires: number;
  signals: WorkspaceSignals;
}
const cache = new Map<string, CacheEntry>();

/** The prioritized, lightweight signals gathered eagerly each turn. */
export interface WorkspaceSignals {
  /** 1 — durable user intent (preferences/goals/rules). */
  memories: string[];
  /** 3 — what just happened (sync failures, actions awaiting execution). */
  recentActivity: string[];
  /** 4 — recent conversation titles (continuity). */
  recentTopics: string[];
  /**
   * 5 — Marketing Graph awareness (Sprint 61). Populated ONLY when the caller
   * already built the brain and passes its graph; structural relationships only,
   * never numbers. Omitted otherwise (no eager brain build, no added cost).
   */
  marketingGraphSummary?: string;
}

/** Optional inputs the caller may supply (no eager fetching is triggered). */
export interface AggregateOptions {
  /** The Marketing Graph from buildMarketingBrain(), if the caller has one. */
  marketingGraph?: KnowledgeGraph;
}

/**
 * Attach the marketing-graph awareness summary when a graph is supplied. Pure;
 * does not mutate or cache the base signals (so the cache stays graph-free).
 */
function withMarketingGraph(
  base: WorkspaceSignals,
  opts?: AggregateOptions
): WorkspaceSignals {
  if (!opts?.marketingGraph) return base;
  const summary = summarizeMarketingGraph(opts.marketingGraph);
  return summary ? { ...base, marketingGraphSummary: summary } : base;
}

/**
 * Aggregate the eager workspace signals (RLS-scoped via the data layers; safe to
 * call from a server route with the user's session). Cached for 60s per
 * workspace. Failures degrade gracefully to empty signals — never throws.
 */
export async function aggregateWorkspaceContext(
  workspaceId: string,
  opts?: AggregateOptions
): Promise<WorkspaceSignals> {
  const now = Date.now();
  const hit = cache.get(workspaceId);
  if (hit && hit.expires > now) return withMarketingGraph(hit.signals, opts);

  const signals: WorkspaceSignals = {
    memories: [],
    recentActivity: [],
    recentTopics: [],
  };

  // Priority 1 — durable memory (cap to the most recent notes).
  try {
    signals.memories = (await listMemories(workspaceId))
      .slice(0, MAX_MEMORIES)
      .map((m) => m.content);
  } catch {
    /* degrade */
  }

  // Priority 3 — recent activity (sync failures in 24h + approved actions).
  try {
    const [jobs, approved] = await Promise.all([
      getSyncJobsByWorkspace(workspaceId, 20),
      listActions(workspaceId, { status: "approved" }),
    ]);
    const cutoff = now - RECENT_FAILURE_WINDOW_MS;
    const failed = jobs.filter(
      (j) => j.status === "failed" && new Date(j.created_at).getTime() >= cutoff
    ).length;
    const inFlight = jobs.filter(
      (j) => j.status === "running" || j.status === "pending"
    ).length;
    if (failed > 0)
      signals.recentActivity.push(
        `${failed} sync failure${failed === 1 ? "" : "s"} in the last 24h`
      );
    if (inFlight > 0)
      signals.recentActivity.push(
        `${inFlight} sync${inFlight === 1 ? "" : "s"} in progress`
      );
    if (approved.length > 0)
      signals.recentActivity.push(
        `${approved.length} approved action${approved.length === 1 ? "" : "s"} awaiting execution`
      );
    signals.recentActivity = signals.recentActivity.slice(0, MAX_ACTIVITY);
  } catch {
    /* degrade */
  }

  // Priority 4 — recent conversation topics (continuity).
  try {
    signals.recentTopics = (await listConversations(workspaceId))
      .map((c) => c.title)
      .filter((t): t is string => Boolean(t && t.trim()))
      .slice(0, MAX_TOPICS);
  } catch {
    /* degrade */
  }

  cache.set(workspaceId, { expires: now + CACHE_TTL_MS, signals });
  return withMarketingGraph(signals, opts);
}

/**
 * Render the eager signals as a compact, additive system-prompt block. Awareness
 * only — it explicitly points the model at the LAZY tools for detail and never
 * asserts numbers. Returns "" when there is nothing useful to add.
 */
export function signalsToPromptBlock(signals: WorkspaceSignals): string {
  const lines: string[] = [];
  if (signals.recentActivity.length > 0) {
    lines.push(`- Recent activity: ${signals.recentActivity.join("; ")}.`);
  }
  if (signals.recentTopics.length > 0) {
    lines.push(`- Recent topics discussed: ${signals.recentTopics.join("; ")}.`);
  }
  if (signals.marketingGraphSummary) {
    // Awareness of HOW entities relate — structure only, no metrics.
    lines.push(
      `- Marketing graph (relationships only): ${signals.marketingGraphSummary}.`
    );
  }
  if (lines.length === 0) return "";
  return `\n\nRECENT WORKSPACE SIGNALS (awareness only — fetch any detail with the tools; never state a number you have not retrieved):\n${lines.join(
    "\n"
  )}\n- Deeper context is available ON DEMAND: account KPIs & the Morning Brief via get_executive_summary; metrics, rankings & comparisons via get_workspace_metrics / get_provider_metrics; recommendations via get_recommendations; change analysis via get_change_analysis. Prefer calling these over guessing.`;
}
