/**
 * Workspace settings — collection route (Sprint 16).
 *
 * GET  /api/workspace/settings  → the active workspace's settings (defaults when
 *                                 none saved yet).
 * PUT  /api/workspace/settings  → create-or-update the active workspace's
 *                                 settings. Validated against typed vocabularies;
 *                                 unknown fields are ignored.
 *
 * workspaceId is resolved SERVER-SIDE (never client input); RLS double-guards
 * workspace membership on every read/write. Preferences only — no connector or
 * Action Engine behaviour is changed here.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
} from "@/lib/data/workspaces";
import {
  getWorkspaceSettings,
  upsertWorkspaceSettings,
  toSettingsValues,
  type WorkspaceSettingsValues,
  type DateFormat,
  type Environment,
} from "@/lib/data/workspace-settings";

export const runtime = "nodejs";

const DATE_FORMATS: readonly DateFormat[] = [
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "D MMM YYYY",
];
const ENVIRONMENTS: readonly Environment[] = ["production", "sandbox"];
const BOOLEAN_KEYS = [
  "ai_insights_enabled",
  "action_engine_enabled",
  "scheduled_actions_enabled",
  "autonomous_ai_enabled",
  "beta_features_enabled",
  "notify_email",
  "notify_in_app",
  "notify_failed_sync",
  "notify_ai_opportunities",
] as const;

/** Trimmed, length-bounded string or undefined. */
function str(v: unknown, max = 64): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

async function resolveWorkspaceId(): Promise<string | null> {
  const workspaces = await getUserWorkspaces();
  return getCurrentWorkspaceId(workspaces);
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace found" },
      { status: 400 }
    );
  }
  const row = await getWorkspaceSettings(workspaceId);
  return NextResponse.json({ settings: toSettingsValues(row) });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace found" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Start from the current persisted values so a partial PUT is a safe merge.
  const current = toSettingsValues(await getWorkspaceSettings(workspaceId));
  const next: WorkspaceSettingsValues = { ...current };

  for (const key of BOOLEAN_KEYS) {
    if (typeof body[key] === "boolean") next[key] = body[key] as boolean;
  }

  const timezone = str(body.timezone);
  if (timezone) next.timezone = timezone;

  const currency = str(body.currency, 8);
  if (currency) next.currency = currency;

  if (
    typeof body.date_format === "string" &&
    (DATE_FORMATS as readonly string[]).includes(body.date_format)
  ) {
    next.date_format = body.date_format as DateFormat;
  }

  if (
    typeof body.environment === "string" &&
    (ENVIRONMENTS as readonly string[]).includes(body.environment)
  ) {
    next.environment = body.environment as Environment;
  }

  const row = await upsertWorkspaceSettings(workspaceId, next, user.id);
  if (!row) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
  return NextResponse.json({ settings: toSettingsValues(row) });
}
