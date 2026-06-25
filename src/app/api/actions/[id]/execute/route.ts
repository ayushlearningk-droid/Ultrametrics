/**
 * Action execution — dry-run trigger (Sprint 14A).
 *
 * POST /api/actions/[id]/execute
 *   Runs the executor for an approved action. With ENABLE_ACTION_EXECUTION off
 *   (default) this is dry-run: records an attempt + audit trail, validates, and
 *   HALTS before any provider call (202, status "dry_run"). With the flag on and
 *   a valid campaign-level Meta PAUSE/RESUME target, it executes against the Meta
 *   Marketing API and returns the terminal outcome (200, "succeeded"/"failed").
 *
 * Authorization is delegated to RLS: getActionById only resolves a row the
 * authenticated user owns in a member workspace; an invisible row → 404.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { getActionById } from "@/lib/data/action-queue";
import { executeAction } from "@/lib/actions/executor";
import {
  getWorkspaceSettings,
  toSettingsValues,
} from "@/lib/data/workspace-settings";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const action = await getActionById(id);
  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  // Only approved actions are eligible to (dry-run) execute.
  if (action.status !== "approved") {
    return NextResponse.json(
      { error: "Action must be approved before execution" },
      { status: 409 }
    );
  }

  // Sprint 16.1: Action Engine is gated per-workspace. Real execution requires
  // BOTH the server kill-switch (ENABLE_ACTION_EXECUTION, checked in the
  // executor/adapter) AND this workspace preference. When the workspace flag is
  // off, the Action Engine is unavailable here — refuse with a clear message.
  const settings = toSettingsValues(
    await getWorkspaceSettings(action.workspace_id)
  );
  if (!settings.action_engine_enabled) {
    return NextResponse.json(
      { error: "Action Engine disabled for this workspace." },
      { status: 403 }
    );
  }

  const outcome = await executeAction(action, user.id, {
    actionEngineEnabled: settings.action_engine_enabled,
  });
  // 200 for a completed real execution (succeeded/failed); 202 for an accepted
  // dry-run that intentionally halts before provider execution.
  const httpStatus = outcome.status === "dry_run" ? 202 : 200;
  return NextResponse.json(outcome, { status: httpStatus });
}
