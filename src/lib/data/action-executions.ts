/**
 * Action executions — data layer (Sprint 14A).
 *
 * CRUD over public.action_executions through the user's SSR (anon) client, so
 * RLS enforces per-user-private + workspace-membership scoping on every call (no
 * service role). Mirrors the action-queue data layer.
 *
 * Records execution ATTEMPTS only. Dry-run in Sprint 14A: rows are created and
 * advanced to `validating`, then halted — no provider is ever called.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ActionExecutionRow,
  ActionExecutionInsert,
  Json,
} from "@/types/database";
import type { ExecutionState } from "@/lib/actions/state-machine";

/** Fetch a single execution attempt by id (RLS-scoped). */
export async function getExecutionById(
  id: string
): Promise<ActionExecutionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_executions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ActionExecutionRow | null) ?? null;
}

/** Look up an execution attempt by its deterministic idempotency key (RLS-scoped). */
export async function getExecutionByIdempotencyKey(
  idempotencyKey: string
): Promise<ActionExecutionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_executions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ActionExecutionRow | null) ?? null;
}

/**
 * Create a new execution attempt (defaults: state 'queued', dry_run true).
 *
 * When `idempotencyKey` is supplied, the insert is conflict-safe: a concurrent
 * attempt that already claimed the key is ignored (returns null) rather than
 * raising a unique violation, so the caller can resolve the existing row. The
 * key is backed by a partial UNIQUE index (uq_action_executions_idempotency_key).
 */
export async function createExecution(input: {
  actionId: string;
  workspaceId: string;
  userId: string;
  provider?: string | null;
  attemptNo?: number;
  state?: ExecutionState;
  dryRun?: boolean;
  requestPayload?: Json | null;
  idempotencyKey?: string;
  originalExecutionId?: string;
}): Promise<ActionExecutionRow | null> {
  const supabase = await createClient();
  const row: ActionExecutionInsert = {
    action_id: input.actionId,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    ...(input.provider !== undefined ? { provider: input.provider } : {}),
    ...(input.attemptNo !== undefined ? { attempt_no: input.attemptNo } : {}),
    ...(input.state !== undefined ? { state: input.state } : {}),
    ...(input.dryRun !== undefined ? { dry_run: input.dryRun } : {}),
    ...(input.requestPayload !== undefined
      ? { request_payload: input.requestPayload }
      : {}),
    ...(input.idempotencyKey !== undefined
      ? { idempotency_key: input.idempotencyKey }
      : {}),
    ...(input.originalExecutionId !== undefined
      ? { original_execution_id: input.originalExecutionId }
      : {}),
  };

  // With an idempotency key, ignore a duplicate-key conflict (concurrent
  // execute) instead of erroring; the executor resolves the winning row.
  if (input.idempotencyKey !== undefined) {
    const { data, error } = await supabase
      .from("action_executions")
      .upsert(row, {
        onConflict: "idempotency_key",
        ignoreDuplicates: true,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as ActionExecutionRow | null) ?? null;
  }

  const { data, error } = await supabase
    .from("action_executions")
    .insert(row)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ActionExecutionRow | null) ?? null;
}

/**
 * Advance an execution to a new state, optionally stamping lifecycle timestamps.
 * Transition legality is enforced by the executor (state-machine) BEFORE calling
 * this; the data layer only persists.
 */
export async function setExecutionState(
  id: string,
  state: ExecutionState,
  patch?: {
    startedAt?: string;
    completedAt?: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    errorClass?:
      | "transient"
      | "rate_limited"
      | "auth"
      | "validation"
      | "permanent"
      | null;
    durationMs?: number | null;
    providerRequestId?: string | null;
    result?: Json | null;
    retryable?: boolean;
    nextRetryAt?: string | null;
  }
): Promise<ActionExecutionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_executions")
    .update({
      state,
      ...(patch?.startedAt !== undefined ? { started_at: patch.startedAt } : {}),
      ...(patch?.completedAt !== undefined
        ? { completed_at: patch.completedAt }
        : {}),
      ...(patch?.errorCode !== undefined ? { error_code: patch.errorCode } : {}),
      ...(patch?.errorMessage !== undefined
        ? { error_message: patch.errorMessage }
        : {}),
      ...(patch?.errorClass !== undefined
        ? { error_class: patch.errorClass }
        : {}),
      ...(patch?.durationMs !== undefined
        ? { duration_ms: patch.durationMs }
        : {}),
      ...(patch?.providerRequestId !== undefined
        ? { provider_request_id: patch.providerRequestId }
        : {}),
      ...(patch?.result !== undefined ? { result: patch.result } : {}),
      ...(patch?.retryable !== undefined ? { retryable: patch.retryable } : {}),
      ...(patch?.nextRetryAt !== undefined
        ? { next_retry_at: patch.nextRetryAt }
        : {}),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ActionExecutionRow | null) ?? null;
}

/**
 * Set rollback linkage on the ORIGINAL execution (Sprint 17). The original's
 * execution record (state/result/request_payload) is never changed — only these
 * linkage columns are written, preserving its immutability.
 */
export async function setRollbackLink(
  originalExecutionId: string,
  patch: {
    rollbackExecutionId?: string;
    rollbackReason?: string | null;
    rolledBackAt?: string | null;
  }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("action_executions")
    .update({
      ...(patch.rollbackExecutionId !== undefined
        ? { rollback_execution_id: patch.rollbackExecutionId }
        : {}),
      ...(patch.rollbackReason !== undefined
        ? { rollback_reason: patch.rollbackReason }
        : {}),
      ...(patch.rolledBackAt !== undefined
        ? { rolled_back_at: patch.rolledBackAt }
        : {}),
    })
    .eq("id", originalExecutionId);
  if (error) throw new Error(error.message);
}

/** List execution attempts for one action, newest-first (RLS-scoped). */
export async function listExecutions(
  actionId: string
): Promise<ActionExecutionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("action_executions")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ActionExecutionRow[];
}
