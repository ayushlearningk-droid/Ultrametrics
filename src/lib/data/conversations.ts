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

/** List the current user's non-archived conversations in a workspace. */
export async function listConversations(
  workspaceId: string
): Promise<AiConversation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
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

/** Patch a conversation (rename, archive, preview). Returns the updated row. */
export async function updateConversation(
  id: string,
  patch: {
    title?: string;
    titleGenerated?: boolean;
    lastMessagePreview?: string | null;
    archived?: boolean;
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
