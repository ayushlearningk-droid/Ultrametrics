/**
 * Action Queue — data layer (Sprint 10).
 *
 * CRUD over public.action_queue through the user's SSR (anon) client, so RLS
 * enforces per-user-private + workspace-membership scoping on every call (no
 * service role). Mirrors the conversations data layer: callers authenticate via
 * requireUser() first; authorization itself is delegated to RLS.
 *
 * Records decisions only — no Meta/Google execution.
 */

import { createClient } from "@/lib/supabase/server";
import type { ActionQueueRow } from "@/types/database";

export type ActionStatus = "pending" | "approved" | "dismissed";
export type ActionPriority = "High" | "Medium" | "Low";

/**
 * List the current user's actions in a workspace (RLS-scoped). Optionally filter
 * by status. Ordered newest-first (matches the (workspace_id, user_id,
 * created_at DESC) index).
 */
export async function listActions(
  workspaceId: string,
  opts?: { status?: ActionStatus }
): Promise<ActionQueueRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("action_queue")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (opts?.status) query = query.eq("status", opts.status);

  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as ActionQueueRow[];
}

/** Create an action owned by `userId` in `workspaceId`. Status defaults to 'approved'. */
export async function createAction(input: {
  workspaceId: string;
  userId: string;
  title: string;
  source?: string | null;
  type?: string | null;
  rationale?: string | null;
  expectedImpact?: string | null;
  priority?: ActionPriority | null;
  status?: ActionStatus;
}): Promise<ActionQueueRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_queue")
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      title: input.title,
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.rationale !== undefined ? { rationale: input.rationale } : {}),
      ...(input.expectedImpact !== undefined
        ? { expected_impact: input.expectedImpact }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ActionQueueRow | null) ?? null;
}

/** Update an action's status (Approve / Dismiss). Returns the updated row, or null when not visible. */
export async function updateActionStatus(
  id: string,
  status: ActionStatus
): Promise<ActionQueueRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_queue")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ActionQueueRow | null) ?? null;
}

/** Delete an action (e.g. the user un-approves a recommendation). */
export async function deleteAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("action_queue").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
