/**
 * AI Usage — telemetry persistence (Sprint 11).
 *
 * Best-effort write of one UsageLogEntry per completed Ask turn into ai_usage,
 * through the user's SSR (anon) client so RLS enforces workspace-shared scoping.
 * Mirrors the conversations data layer, with ONE deliberate difference: this is
 * fire-and-forget telemetry, so it NEVER throws — any failure is logged and
 * swallowed so the chat turn is never affected.
 *
 * Analytics only — nothing here gates or enforces a request.
 */

import { createClient } from "@/lib/supabase/server";
import type { UsageLogEntry } from "@/lib/ai/limits";
import type { AiUsageRow } from "@/types/database";

/** Persist a usage entry. Best-effort: warns on failure, never throws. */
export async function recordUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_usage").insert({
      workspace_id: entry.workspaceId,
      user_id: entry.userId,
      model: entry.model,
      escalated: entry.escalated,
      route_reason: entry.routeReason || null,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      tool_rounds: entry.toolRounds,
      stop_reason: entry.stopReason,
    });
    if (error) {
      console.warn(`[ai.usage.persist] insert failed: ${error.message}`);
    }
  } catch (err) {
    console.warn(
      `[ai.usage.persist] failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

// ── Read layer (Sprint 11 Step 4) — RLS-scoped, read-only, JS aggregation ────

export interface AiUsageSummary {
  requestsToday: number;
  totalRequests: number;
  sonnetRequests: number;
  opusRequests: number;
  sonnetPercent: number;
  opusPercent: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgToolRounds: number;
}

/** One row of the recent-usage list (read-only projection). */
export type RecentAiUsage = Pick<
  AiUsageRow,
  | "model"
  | "input_tokens"
  | "output_tokens"
  | "tool_rounds"
  | "stop_reason"
  | "created_at"
>;

/** Start of the server's local day, for the "requests today" bucket. */
function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Aggregate a workspace's AI usage in JS (no RPC, no aggregate SQL). RLS-scoped;
 * read-only. Returns all-zero metrics for an empty/absent dataset — never throws
 * on empty results.
 */
export async function getAiUsageSummary(
  workspaceId: string
): Promise<AiUsageSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_usage")
    .select("model, input_tokens, output_tokens, tool_rounds, created_at")
    .eq("workspace_id", workspaceId);

  const rows = data ?? [];
  const totalRequests = rows.length;

  if (totalRequests === 0) {
    return {
      requestsToday: 0,
      totalRequests: 0,
      sonnetRequests: 0,
      opusRequests: 0,
      sonnetPercent: 0,
      opusPercent: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      avgInputTokens: 0,
      avgOutputTokens: 0,
      avgToolRounds: 0,
    };
  }

  const todayStart = startOfTodayMs();
  let requestsToday = 0;
  let sonnetRequests = 0;
  let opusRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalToolRounds = 0;

  for (const r of rows) {
    if (new Date(r.created_at).getTime() >= todayStart) requestsToday += 1;
    const model = (r.model ?? "").toLowerCase();
    if (model.includes("sonnet")) sonnetRequests += 1;
    else if (model.includes("opus")) opusRequests += 1;
    totalInputTokens += r.input_tokens ?? 0;
    totalOutputTokens += r.output_tokens ?? 0;
    totalToolRounds += r.tool_rounds ?? 0;
  }

  const pct = (n: number) => Math.round((n / totalRequests) * 100);
  const avg = (n: number) => Math.round(n / totalRequests);

  return {
    requestsToday,
    totalRequests,
    sonnetRequests,
    opusRequests,
    sonnetPercent: pct(sonnetRequests),
    opusPercent: pct(opusRequests),
    totalInputTokens,
    totalOutputTokens,
    avgInputTokens: avg(totalInputTokens),
    avgOutputTokens: avg(totalOutputTokens),
    avgToolRounds: Math.round((totalToolRounds / totalRequests) * 10) / 10,
  };
}

/** The most recent usage rows for a workspace (RLS-scoped, read-only). */
export async function getRecentAiUsage(
  workspaceId: string,
  limit = 20
): Promise<RecentAiUsage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_usage")
    .select(
      "model, input_tokens, output_tokens, tool_rounds, stop_reason, created_at"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentAiUsage[];
}
