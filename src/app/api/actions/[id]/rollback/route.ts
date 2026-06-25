/**
 * Action rollback — trigger (Sprint 17).
 *
 * POST /api/actions/[id]/rollback
 *   Reverses the action's latest SUCCEEDED real execution by running the inverse
 *   provider action as a NEW execution (Meta only). The original execution is
 *   never overwritten. Body: { reason?: string }.
 *
 * Validation → HTTP codes:
 *   401 unauthorized · 404 action not found ·
 *   403 Action Engine disabled for this workspace ·
 *   409 nothing to roll back / still running / not succeeded / already rolled back ·
 *   422 action type not reversible.
 *
 * Authorization via RLS (getActionById); the per-workspace Action Engine flag is
 * enforced exactly like /execute. Idempotency is handled in the rollback engine.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { getActionById } from "@/lib/data/action-queue";
import { listExecutions } from "@/lib/data/action-executions";
import { rollbackExecution } from "@/lib/actions/rollback";
import { inverseActionType } from "@/lib/actions/inverse";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const action = await getActionById(id);
  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  // Per-workspace Action Engine gate (same as /execute).
  const settings = toSettingsValues(
    await getWorkspaceSettings(action.workspace_id)
  );
  if (!settings.action_engine_enabled) {
    return NextResponse.json(
      { error: "Action Engine disabled for this workspace." },
      { status: 403 }
    );
  }

  // The action type must be reversible.
  if (!inverseActionType(action.action_type)) {
    return NextResponse.json(
      { error: "This action type cannot be rolled back." },
      { status: 422 }
    );
  }

  const executions = await listExecutions(action.id);
  if (executions.length === 0) {
    return NextResponse.json(
      { error: "No execution to roll back." },
      { status: 409 }
    );
  }

  // Refuse while an attempt is in flight.
  const inFlight = executions.find(
    (e) =>
      e.state === "running" ||
      e.state === "rolling_back" ||
      e.state === "validating" ||
      e.state === "queued"
  );
  if (inFlight) {
    return NextResponse.json(
      { error: "An execution is still in progress." },
      { status: 409 }
    );
  }

  // Roll back the latest SUCCEEDED, real (non-dry-run) execution.
  const target = executions.find(
    (e) => e.state === "succeeded" && !e.dry_run
  );
  if (!target) {
    return NextResponse.json(
      { error: "Only a succeeded execution can be rolled back." },
      { status: 409 }
    );
  }

  // Already rolled back (linked, or a rollback execution already exists).
  const alreadyRolledBack =
    target.rollback_execution_id != null ||
    executions.some((e) => e.original_execution_id === target.id);
  if (alreadyRolledBack) {
    return NextResponse.json(
      { error: "Execution already rolled back." },
      { status: 409 }
    );
  }

  let reason: string | null = null;
  try {
    const body = (await request.json()) as { reason?: unknown };
    if (typeof body.reason === "string" && body.reason.trim()) {
      reason = body.reason.trim().slice(0, 280);
    }
  } catch {
    // No/invalid body is fine — reason is optional.
  }

  const outcome = await rollbackExecution(
    action,
    target,
    user.id,
    reason,
    settings.action_engine_enabled
  );

  const httpStatus = outcome.status === "rolled_back" ? 200 : 502;
  return NextResponse.json(outcome, { status: httpStatus });
}
