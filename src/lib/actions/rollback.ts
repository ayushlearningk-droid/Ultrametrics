/**
 * Action Engine — rollback engine (Sprint 17).
 *
 * Reverses a successful execution by running the INVERSE provider action as a
 * NEW execution, linked to the original. Reuses the existing state machine,
 * audit writer, provider registry, and data layer — no duplicated logic.
 *
 * The original execution is immutable: it stays `succeeded` and only gains
 * rollback linkage columns. The rollback execution carries the rollback
 * lifecycle: rollback_requested → rolling_back → rolled_back | rollback_failed.
 *
 * Meta only (the inverse mapper + Meta adapter); Google Ads is untouched.
 */

import type { ActionQueueRow, ActionExecutionRow, Json } from "@/types/database";
import { assertTransition } from "@/lib/actions/state-machine";
import { appendAudit } from "@/lib/actions/audit";
import {
  createExecution,
  setExecutionState,
  setRollbackLink,
  getExecutionByIdempotencyKey,
} from "@/lib/data/action-executions";
import { getActionAdapter } from "@/lib/actions/registry";
import { inverseActionType } from "@/lib/actions/inverse";
import type {
  ActionRequest,
  ActionContext,
} from "@/lib/actions/providers/types";
import type { ActionType, ActionEntityLevel } from "@/lib/data/action-queue";

export interface RollbackOutcome {
  status: "rolled_back" | "rollback_failed";
  rollbackExecutionId: string;
  originalExecutionId: string;
  inverseActionType: ActionType;
  idempotent: boolean;
  providerRequestId?: string | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorClass?: string | null;
}

function rollbackKey(originalExecutionId: string): string {
  return `rollback:${originalExecutionId}`;
}

function outcomeFromRow(row: ActionExecutionRow, idempotent: boolean): RollbackOutcome {
  const inverse =
    ((row.request_payload as { action_type?: string } | null)?.action_type as
      | ActionType
      | undefined) ?? "PAUSE_CAMPAIGN";
  return {
    status: row.state === "rolled_back" ? "rolled_back" : "rollback_failed",
    rollbackExecutionId: row.id,
    originalExecutionId: row.original_execution_id ?? "",
    inverseActionType: inverse,
    idempotent,
    providerRequestId: row.provider_request_id,
    durationMs: row.duration_ms,
    errorCode: row.error_code,
    errorClass: row.error_class,
  };
}

/**
 * Roll back `original` (a succeeded, non-dry-run execution of `action`) by
 * executing the inverse action. Caller (route) has already validated eligibility
 * and the per-workspace Action Engine flag. `actionEngineEnabled` mirrors the
 * execute path — real provider execution requires it AND an enabled adapter.
 */
export async function rollbackExecution(
  action: ActionQueueRow,
  original: ActionExecutionRow,
  userId: string,
  reason: string | null,
  actionEngineEnabled: boolean
): Promise<RollbackOutcome> {
  const inverse = inverseActionType(action.action_type);
  if (!inverse) {
    throw new Error("Action type is not reversible");
  }

  const base = {
    actionId: action.id,
    workspaceId: action.workspace_id,
    userId,
  };
  const idempotencyKey = rollbackKey(original.id);

  // Idempotency — a prior rollback for this original replays the same row.
  const existing = await getExecutionByIdempotencyKey(idempotencyKey);
  if (existing) return outcomeFromRow(existing, true);

  // Snapshot of the inverse request the rollback will perform.
  const requestPayload: Json = {
    provider: action.provider,
    entity_level: action.entity_level,
    entity_id: action.entity_id,
    action_type: inverse,
    params_json: null,
    rollback_of: original.id,
  } as Json;

  // 1. Create the rollback execution (state rollback_requested), linked to the
  //    original. Conflict-safe on the idempotency key.
  const rollback = await createExecution({
    actionId: action.id,
    workspaceId: action.workspace_id,
    userId,
    provider: action.provider,
    attemptNo: 1,
    state: "rollback_requested",
    dryRun: false,
    requestPayload,
    idempotencyKey,
    originalExecutionId: original.id,
  });
  if (!rollback) {
    const winner = await getExecutionByIdempotencyKey(idempotencyKey);
    if (winner) return outcomeFromRow(winner, true);
    throw new Error("Failed to create rollback execution");
  }

  // 2. Link the original (linkage columns only — original stays immutable).
  await setRollbackLink(original.id, {
    rollbackExecutionId: rollback.id,
    rollbackReason: reason,
  });

  const audit = async (
    event:
      | "rollback_requested"
      | "rollback_started"
      | "rollback_completed"
      | "rollback_failed",
    from: Parameters<typeof assertTransition>[0] | null,
    to: Parameters<typeof assertTransition>[1] | null,
    detail?: Json,
    // The request is user-initiated; the lifecycle transitions are system-driven
    // (mirrors the execute path's actor convention).
    actorType: "user" | "system" = "system"
  ) =>
    appendAudit({
      ...base,
      executionId: rollback.id,
      event,
      actorType,
      fromState: from,
      toState: to,
      ...(detail !== undefined ? { detail } : {}),
    });

  await audit(
    "rollback_requested",
    null,
    "rollback_requested",
    {
      original_execution_id: original.id,
      inverse_action_type: inverse,
      reason,
    } as Json,
    "user"
  );

  // 3. rollback_requested → rolling_back
  assertTransition("rollback_requested", "rolling_back");
  await setExecutionState(rollback.id, "rolling_back", {
    startedAt: new Date().toISOString(),
  });
  await audit("rollback_started", "rollback_requested", "rolling_back");

  // 4. Execute the inverse provider action (Meta). Requires the workspace flag
  //    AND an enabled adapter, mirroring the execute path.
  const adapter = getActionAdapter(action.provider);
  const canExecute =
    actionEngineEnabled &&
    adapter?.enabled === true &&
    action.entity_level === "campaign" &&
    Boolean(action.entity_id);

  const completedAt = () => new Date().toISOString();

  if (!canExecute || !adapter || !action.entity_id || !action.entity_level) {
    // Cannot perform a real inverse → record a clear rollback failure.
    assertTransition("rolling_back", "rollback_failed");
    const row = await setExecutionState(rollback.id, "rollback_failed", {
      completedAt: completedAt(),
      durationMs: 0,
      errorCode: "rollback_execution_disabled",
      errorMessage: "Action execution is not enabled for this rollback",
      errorClass: "permanent",
      retryable: false,
    });
    await audit("rollback_failed", "rolling_back", "rollback_failed", {
      error_code: "rollback_execution_disabled",
    } as Json);
    return outcomeFromRow(row ?? rollback, false);
  }

  const request: ActionRequest = {
    provider: action.provider!,
    entityLevel: action.entity_level as ActionEntityLevel,
    entityId: action.entity_id,
    actionType: inverse,
    params: null,
  };
  const ctx: ActionContext = {
    workspaceId: action.workspace_id,
    connectorId: null,
    actorUserId: userId,
    idempotencyKey,
    dryRun: false,
  };

  const t0 = Date.now();
  const result = await adapter.execute(request, ctx);
  const durationMs = Date.now() - t0;
  const done = completedAt();

  if (result.ok) {
    assertTransition("rolling_back", "rolled_back");
    const row = await setExecutionState(rollback.id, "rolled_back", {
      completedAt: done,
      durationMs,
      providerRequestId: result.providerRequestId ?? null,
      result: (result.result ?? null) as Json,
    });
    // Stamp the original as rolled back (linkage only).
    await setRollbackLink(original.id, { rolledBackAt: done });
    await audit("rollback_completed", "rolling_back", "rolled_back", {
      provider_request_id: result.providerRequestId ?? null,
      duration_ms: durationMs,
    } as Json);
    return outcomeFromRow(row ?? rollback, false);
  }

  assertTransition("rolling_back", "rollback_failed");
  console.error("[action.rollback] provider rollback failed", {
    action_id: action.id,
    original_execution_id: original.id,
    provider: action.provider,
    inverse_action_type: inverse,
    error_code: result.errorCode ?? null,
    error_class: result.errorClass ?? null,
  });
  const row = await setExecutionState(rollback.id, "rollback_failed", {
    completedAt: done,
    durationMs,
    providerRequestId: result.providerRequestId ?? null,
    result: (result.result ?? null) as Json,
    errorCode: result.errorCode ?? null,
    errorMessage: result.errorMessage ?? null,
    errorClass: result.errorClass ?? null,
    retryable: result.retryable ?? false,
  });
  await audit("rollback_failed", "rolling_back", "rollback_failed", {
    error_code: result.errorCode ?? null,
    error_class: result.errorClass ?? null,
    duration_ms: durationMs,
  } as Json);
  return outcomeFromRow(row ?? rollback, false);
}
