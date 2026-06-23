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
