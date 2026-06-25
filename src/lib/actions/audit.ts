/**
 * Action Engine — audit writer (Sprint 14A).
 *
 * Append-only writer for public.action_audit_log. Every state transition the
 * executor performs is recorded here as ONE immutable row. INSERT + SELECT only:
 * the table has no UPDATE/DELETE RLS policy, so the trail cannot be altered or
 * removed by any non-service caller. Goes through the user's SSR (anon) client,
 * so RLS scopes writes to the actor + their member workspaces.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ActionAuditLogRow,
  ActionAuditLogInsert,
  Json,
} from "@/types/database";
import type { ExecutionState } from "@/lib/actions/state-machine";

/** Audit event vocabulary (mirrors the DB CHECK constraint). */
export type AuditEvent = ActionAuditLogInsert["event"];
export type AuditActorType = "user" | "system" | "ai";

/**
 * Append one immutable audit record. Returns the created row. Throws on failure
 * so the executor can abort the transition rather than silently losing history.
 */
export async function appendAudit(input: {
  actionId: string;
  workspaceId: string;
  userId: string;
  event: AuditEvent;
  executionId?: string | null;
  actorType?: AuditActorType;
  fromState?: ExecutionState | null;
  toState?: ExecutionState | null;
  detail?: Json | null;
}): Promise<ActionAuditLogRow> {
  const supabase = await createClient();
  const row: ActionAuditLogInsert = {
    action_id: input.actionId,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    event: input.event,
    ...(input.executionId !== undefined
      ? { execution_id: input.executionId }
      : {}),
    ...(input.actorType !== undefined ? { actor_type: input.actorType } : {}),
    ...(input.fromState !== undefined ? { from_state: input.fromState } : {}),
    ...(input.toState !== undefined ? { to_state: input.toState } : {}),
    ...(input.detail !== undefined ? { detail: input.detail } : {}),
  };
  const { data, error } = await supabase
    .from("action_audit_log")
    .insert(row)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to append audit record");
  return data as ActionAuditLogRow;
}

/** Read the audit trail for one action, chronological (RLS-scoped). */
export async function listAudit(actionId: string): Promise<ActionAuditLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("action_audit_log")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ActionAuditLogRow[];
}
