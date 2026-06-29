/**
 * Workspace memory — data layer (Sprint 31).
 *
 * CRUD over public.workspace_memory through the user's SSR (anon) client, so RLS
 * enforces workspace membership on every call (no service role). Mirrors the
 * workspace-settings/action-queue data layers. Durable AI-grounding notes only.
 */

import { createClient } from "@/lib/supabase/server";
import type { WorkspaceMemoryRow } from "@/types/database";

/** Max stored length for a single memory note. */
export const MEMORY_MAX_LEN = 500;
/** Cap on notes injected into the AI context / returned to the UI. */
export const MEMORY_LIMIT = 50;

export type MemorySource = "user" | "ai";

/** Max chars of a memory search query honoured (after sanitisation). */
const MEMORY_SEARCH_MAX = 100;

/**
 * Sanitise a query for a PostgREST ilike filter: strip structural/wildcard chars
 * so they can't break the filter, trim + cap. "" → caller skips the filter.
 * Mirrors the conversations data layer.
 */
function sanitizeMemorySearch(q: string): string {
  return q.replace(/[,()%*\\_]/g, "").trim().slice(0, MEMORY_SEARCH_MAX);
}

/**
 * List a workspace's memory notes, newest-first (RLS-scoped).
 *  - `q` → substring search across `content` (ilike). Added Sprint 58 (search);
 *    optional + backward compatible (no arg → unchanged behaviour).
 *  - `limit` → override the default cap (MEMORY_LIMIT).
 */
export async function listMemories(
  workspaceId: string,
  opts?: { q?: string; limit?: number }
): Promise<WorkspaceMemoryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("workspace_memory")
    .select("*")
    .eq("workspace_id", workspaceId);

  const safe = opts?.q ? sanitizeMemorySearch(opts.q) : "";
  if (safe) {
    query = query.ilike("content", `%${safe}%`);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? MEMORY_LIMIT);
  return (data ?? []) as WorkspaceMemoryRow[];
}

/** Create a memory note (RLS-scoped). Returns the row, or null when not visible. */
export async function createMemory(input: {
  workspaceId: string;
  content: string;
  source?: MemorySource;
  userId?: string | null;
}): Promise<WorkspaceMemoryRow | null> {
  const content = input.content.trim().slice(0, MEMORY_MAX_LEN);
  if (!content) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_memory")
    .insert({
      workspace_id: input.workspaceId,
      content,
      source: input.source ?? "user",
      ...(input.userId !== undefined ? { created_by: input.userId } : {}),
    })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WorkspaceMemoryRow | null) ?? null;
}

/** Delete a memory note (RLS-scoped; deleting a non-visible row is a no-op). */
export async function deleteMemory(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_memory")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
