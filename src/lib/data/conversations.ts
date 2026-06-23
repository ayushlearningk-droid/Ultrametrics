/**
 * Ask Ultrametrics — conversation data layer (U1 Phase 1).
 *
 * CRUD over ai_conversations / ai_messages through the user's SSR (anon) client,
 * so RLS enforces per-user-private + workspace-membership scoping on every call
 * (no service role). All functions assume the caller already authenticated via
 * requireUser(); authorization itself is delegated to RLS.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  AiConversation,
  AiMessage,
  AiMessageRole,
} from "@/types/database";

/** Max chars stored in last_message_preview (sidebar snippet). */
const PREVIEW_MAX = 140;

/** Max chars of a search query honoured (after sanitisation). */
const SEARCH_MAX = 100;

/**
 * Sanitise a search query for a PostgREST `.or()` ilike expression: strip the
 * chars that have structural (`, ( )`) or wildcard/escape (`% * _ \`) meaning so
 * they can't break the filter, then trim + cap. Returns "" when nothing usable
 * remains (caller then skips the filter).
 */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()%*\\_]/g, "").trim().slice(0, SEARCH_MAX);
}

/**
 * List the current user's conversations in a workspace (Sprint 5).
 *  - `archived: false` (default) → non-archived; `true` → archived only.
 *  - `q` → substring search across title + last_message_preview (ilike).
 * Ordered pinned-first (pinned_at DESC NULLS LAST), then updated_at DESC.
 */
export async function listConversations(
  workspaceId: string,
  opts?: { q?: string; archived?: boolean }
): Promise<AiConversation[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_conversations")
    .select("*")
    .eq("workspace_id", workspaceId);

  query = opts?.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  const safe = opts?.q ? sanitizeSearch(opts.q) : "";
  if (safe) {
    query = query.or(
      `title.ilike.%${safe}%,last_message_preview.ilike.%${safe}%`
    );
  }

  const { data } = await query
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  return (data ?? []) as AiConversation[];
}

/** Create a new conversation owned by `userId` in `workspaceId`. */
export async function createConversation(input: {
  workspaceId: string;
  userId: string;
  title?: string;
  titleGenerated?: boolean;
}): Promise<AiConversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      ...(input.title ? { title: input.title } : {}),
      ...(input.titleGenerated !== undefined
        ? { title_generated: input.titleGenerated }
        : {}),
    })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AiConversation | null) ?? null;
}

/** Fetch one conversation (RLS scopes to the owner; null when not visible). */
export async function getConversation(
  id: string
): Promise<AiConversation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as AiConversation | null) ?? null;
}

/** Fetch a conversation's messages in chronological order. */
export async function getMessages(
  conversationId: string
): Promise<AiMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []) as AiMessage[];
}

/** Patch a conversation (rename, archive, pin, preview). Returns the updated row. */
export async function updateConversation(
  id: string,
  patch: {
    title?: string;
    titleGenerated?: boolean;
    lastMessagePreview?: string | null;
    archived?: boolean;
    pinned?: boolean;
  }
): Promise<AiConversation | null> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.titleGenerated !== undefined)
    update.title_generated = patch.titleGenerated;
  if (patch.lastMessagePreview !== undefined)
    update.last_message_preview = patch.lastMessagePreview;
  if (patch.archived !== undefined)
    update.archived_at = patch.archived ? new Date().toISOString() : null;
  if (patch.pinned !== undefined)
    update.pinned_at = patch.pinned ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("ai_conversations")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AiConversation | null) ?? null;
}

/** Delete a conversation (messages cascade via FK). */
export async function deleteConversation(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Append a message to a conversation and refresh the parent's preview (the
 * BEFORE UPDATE trigger bumps updated_at). Used by the chat route in Phase 2;
 * available now so the API surface is complete.
 */
export async function appendMessage(input: {
  conversationId: string;
  role: AiMessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
}): Promise<AiMessage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);

  // Refresh the sidebar preview; the updated_at trigger re-orders the list.
  await supabase
    .from("ai_conversations")
    .update({ last_message_preview: input.content.slice(0, PREVIEW_MAX) })
    .eq("id", input.conversationId);

  return (data as AiMessage | null) ?? null;
}
