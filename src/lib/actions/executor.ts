/**
 * Action Engine — executor (Sprint 14B.1).
 *
 * Orchestrates the lifecycle for ONE approved action. Two modes, chosen
 * deterministically per call:
 *
 *  • DRY-RUN (default / flag off / non-executable target): records the attempt,
 *    advances queued → validating, then halts at `validating` with
 *    `dry_run_halted`. No provider call. Unchanged from Sprint 14A.
 *
 *  • EXECUTE (ENABLE_ACTION_EXECUTION=true AND an enabled adapter AND a valid
 *    campaign-level PAUSE/RESUME target): additionally advances
 *    validating → running → (succeeded | failed), invoking the provider adapter.
 *
 * Idempotency is per-mode: the dedupe key is `exec:<id>` or `dryrun:<id>`, so a
 * dry-run attempt and a real attempt are distinct rows, and a repeated execute
 * never double-applies — it replays the existing terminal attempt.
 *
 * The state machine, retry policy, audit writer, and provider registry are used
 * as-is (no changes to those modules).
 */

import type { ActionQueueRow, Json, ActionExecutionRow } from "@/types/database";
import {
  assertTransition,
  type ExecutionState,
} from "@/lib/actions/state-machine";
import { appendAudit, type AuditEvent } from "@/lib/actions/audit";
import {
  createExecution,
  setExecutionState,
  getExecutionByIdempotencyKey,
} from "@/lib/data/action-executions";
import { getActionAdapter } from "@/lib/actions/registry";
import type {
  ActionRequest,
  ActionContext,
  ValidationResult,
} from "@/lib/actions/providers/types";
import type { ActionType, ActionEntityLevel } from "@/lib/data/action-queue";

export type ExecutionOutcomeStatus = "dry_run" | "succeeded" | "failed";

export interface ExecutionOutcome {
  status: ExecutionOutcomeStatus;
  next: string;
  executionId: string;
  state: ExecutionState;
  dryRun: boolean;
  provider: string | null;
  providerEnabled: boolean;
  validation: ValidationResult | null;
  idempotent: boolean;
  providerRequestId?: string | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorClass?: string | null;
  result?: Json | null;
}

/** The two campaign actions executable in Sprint 14B.1. */
const EXECUTABLE_CAMPAIGN_ACTIONS: ReadonlySet<ActionType> = new Set<ActionType>(
  ["PAUSE_CAMPAIGN", "RESUME_CAMPAIGN"]
);

/** Build the structured request when the action carries a complete target. */
function toActionRequest(action: ActionQueueRow): ActionRequest | null {
  if (
    !action.provider ||
    !action.entity_level ||
    !action.entity_id ||
    !action.action_type
  ) {
    return null;
  }
  return {
    provider: action.provider,
    entityLevel: action.entity_level as ActionEntityLevel,
    entityId: action.entity_id,
    actionType: action.action_type as ActionType,
    params: (action.params_json as Record<string, unknown> | null) ?? null,
  };
}

/** Pure static validation for the action's structured target (no I/O, no audit). */
function computeValidation(action: ActionQueueRow): {
  validation: ValidationResult | null;
  providerEnabled: boolean;
} {
  const adapter = getActionAdapter(action.provider);
  const request = toActionRequest(action);
  let validation: ValidationResult | null = null;
  if (adapter && request) {
    validation = adapter.validate(request);
  } else if (adapter && !request) {
    validation = {
      ok: false,
      errors: ["action has no complete structured target"],
    };
  }
  return { validation, providerEnabled: adapter?.enabled ?? false };
}

/**
 * Decide whether this call performs REAL execution. True only when every guard
 * holds: the per-workspace Action Engine flag (Sprint 16.1), an enabled adapter
 * (server ENABLE_ACTION_EXECUTION), a complete & valid request, a campaign
 * target, and a PAUSE/RESUME action. Anything else → dry-run.
 */
function planExecution(
  action: ActionQueueRow,
  actionEngineEnabled: boolean
): {
  willExecute: boolean;
  request: ActionRequest | null;
} {
  const adapter = getActionAdapter(action.provider);
  const request = toActionRequest(action);
  if (!actionEngineEnabled || !adapter || !adapter.enabled || !request) {
    return { willExecute: false, request };
  }
  const valid = adapter.validate(request).ok;
  const inScope =
    request.entityLevel === "campaign" &&
    EXECUTABLE_CAMPAIGN_ACTIONS.has(request.actionType) &&
    adapter.supports(request.actionType);
  return { willExecute: valid && inScope, request };
}

/** Deterministic, per-mode dedupe key. */
function idempotencyKeyFor(action: ActionQueueRow, willExecute: boolean): string {
  return `${willExecute ? "exec" : "dryrun"}:${action.id}`;
}

/** Snapshot of the request the executor sends, for the attempt/audit row. */
function requestPayload(action: ActionQueueRow): Json {
  return {
    provider: action.provider,
    entity_level: action.entity_level,
    entity_id: action.entity_id,
    action_type: action.action_type,
    params_json: action.params_json ?? null,
  } as Json;
}

/** Map an execution row → the API outcome (used for fresh and replayed rows). */
function outcomeFromRow(
  action: ActionQueueRow,
  row: ActionExecutionRow,
  idempotent: boolean
): ExecutionOutcome {
  const { validation, providerEnabled } = computeValidation(action);
  const status: ExecutionOutcomeStatus = row.dry_run
    ? "dry_run"
    : row.state === "succeeded"
      ? "succeeded"
      : "failed";
  const next =
    status === "dry_run"
      ? "provider_execution_not_enabled"
      : status === "succeeded"
        ? "none"
        : "failed";
  return {
    status,
    next,
    executionId: row.id,
    state: row.state,
    dryRun: row.dry_run,
    provider: action.provider,
    providerEnabled,
    validation,
    idempotent,
    providerRequestId: row.provider_request_id,
    durationMs: row.duration_ms,
    errorCode: row.error_code,
    errorClass: row.error_class,
    result: row.result,
  };
}

/**
 * Run the action lifecycle for an approved action on behalf of `userId`.
 * `action` is assumed RLS-visible to the caller; every persistence call is
 * RLS-scoped to the same user.
 */
export async function executeAction(
  action: ActionQueueRow,
  userId: string,
  opts?: { actionEngineEnabled?: boolean }
): Promise<ExecutionOutcome> {
  const base = {
    actionId: action.id,
    workspaceId: action.workspace_id,
    userId,
  };

  const { willExecute, request } = planExecution(
    action,
    opts?.actionEngineEnabled ?? false
  );
  const idempotencyKey = idempotencyKeyFor(action, willExecute);

  // 0. Idempotency — replay an existing attempt for this (action, mode). No new
  //    rows, no new audit. Prevents a duplicate execution / double-apply.
  const existing = await getExecutionByIdempotencyKey(idempotencyKey);
  if (existing) return outcomeFromRow(action, existing, true);

  // 1. Action-level: an execution was requested.
  await appendAudit({ ...base, event: "execute_requested", actorType: "user" });

  // 2. Create the attempt (conflict-safe on the idempotency key).
  const execution = await createExecution({
    actionId: action.id,
    workspaceId: action.workspace_id,
    userId,
    provider: action.provider,
    attemptNo: 1,
    state: "queued",
    dryRun: !willExecute,
    requestPayload: requestPayload(action),
    idempotencyKey,
  });
  if (!execution) {
    const winner = await getExecutionByIdempotencyKey(idempotencyKey);
    if (winner) return outcomeFromRow(action, winner, true);
    throw new Error("Failed to create execution");
  }

  const audit = async (
    event: AuditEvent,
    from: ExecutionState | null,
    to: ExecutionState | null,
    detail?: Json
  ) =>
    appendAudit({
      ...base,
      executionId: execution.id,
      event,
      actorType: "system",
      fromState: from,
      toState: to,
      ...(detail !== undefined ? { detail } : {}),
    });

  await audit("queued", null, "queued");

  // 3. queued → validating.
  assertTransition("queued", "validating");
  await setExecutionState(execution.id, "validating", {
    startedAt: new Date().toISOString(),
  });
  await audit("validating", "queued", "validating");

  const { validation, providerEnabled } = computeValidation(action);

  // 4a. DRY-RUN: halt at validating (Sprint 14A behaviour, unchanged).
  if (!willExecute) {
    await audit("dry_run_halted", "validating", null, {
      reason: "provider_execution_not_enabled",
      provider: action.provider,
      provider_enabled: providerEnabled,
      validation: validation
        ? { ok: validation.ok, errors: validation.errors }
        : null,
    } as Json);
    return outcomeFromRow(action, execution, false);
  }

  // 4b. EXECUTE: validating → running → (succeeded | failed).
  const adapter = getActionAdapter(action.provider)!;
  const req = request!;
  const ctx: ActionContext = {
    workspaceId: action.workspace_id,
    connectorId: null,
    actorUserId: userId,
    idempotencyKey,
    dryRun: false,
  };

  assertTransition("validating", "running");
  await setExecutionState(execution.id, "running");
  await audit("execution_started", "validating", "running", {
    provider: action.provider,
    action_type: action.action_type,
    entity_id: action.entity_id,
  } as Json);

  const t0 = Date.now();
  const result = await adapter.execute(req, ctx);
  const durationMs = Date.now() - t0;
  const completedAt = new Date().toISOString();

  if (result.ok) {
    assertTransition("running", "succeeded");
    const row = await setExecutionState(execution.id, "succeeded", {
      completedAt,
      durationMs,
      providerRequestId: result.providerRequestId ?? null,
      result: (result.result ?? null) as Json,
    });
    await audit("execution_succeeded", "running", "succeeded", {
      provider_request_id: result.providerRequestId ?? null,
      duration_ms: durationMs,
    } as Json);
    return outcomeFromRow(action, row ?? execution, false);
  }

  assertTransition("running", "failed");
  // Server-side observability for a real provider failure (response payload is
  // also persisted to action_executions.result).
  console.error("[action.execute] provider execution failed", {
    action_id: action.id,
    provider: action.provider,
    action_type: action.action_type,
    error_code: result.errorCode ?? null,
    error_class: result.errorClass ?? null,
    provider_request_id: result.providerRequestId ?? null,
  });
  const row = await setExecutionState(execution.id, "failed", {
    completedAt,
    durationMs,
    providerRequestId: result.providerRequestId ?? null,
    result: (result.result ?? null) as Json,
    errorCode: result.errorCode ?? null,
    errorMessage: result.errorMessage ?? null,
    errorClass: result.errorClass ?? null,
    retryable: result.retryable ?? false,
  });
  await audit("execution_failed", "running", "failed", {
    error_code: result.errorCode ?? null,
    error_class: result.errorClass ?? null,
    retryable: result.retryable ?? false,
    duration_ms: durationMs,
  } as Json);
  return outcomeFromRow(action, row ?? execution, false);
}
