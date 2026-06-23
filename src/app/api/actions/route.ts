/**
 * Action Queue — collection route (Sprint 10).
 *
 * GET  /api/actions          → list the current user's actions in the active
 *                              workspace (optional ?status= filter).
 * POST /api/actions          → create an action { title, source?, type?,
 *                              rationale?, expectedImpact?, priority?, status? }.
 *
 * workspaceId is resolved SERVER-SIDE from the user's workspaces (never client
 * input); RLS double-guards per-user-private + membership on every write.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
} from "@/lib/data/workspaces";
import {
  listActions,
  createAction,
  type ActionStatus,
  type ActionPriority,
} from "@/lib/data/action-queue";

export const runtime = "nodejs";

const TITLE_MAX = 200;
const STATUSES: readonly ActionStatus[] = ["pending", "approved", "dismissed"];
const PRIORITIES: readonly ActionPriority[] = ["High", "Medium", "Low"];

async function resolveWorkspaceId(): Promise<string | null> {
  const workspaces = await getUserWorkspaces();
  return getCurrentWorkspaceId(workspaces);
}

/** Trimmed non-empty string, or undefined. */
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function GET(request: Request) {
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

  const statusParam = new URL(request.url).searchParams.get("status");
  const status =
    statusParam && (STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as ActionStatus)
      : undefined;

  const actions = await listActions(
    workspaceId,
    status ? { status } : undefined
  );
  return NextResponse.json({ actions });
}

export async function POST(request: Request) {
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

  let body: {
    title?: unknown;
    source?: unknown;
    type?: unknown;
    rationale?: unknown;
    expectedImpact?: unknown;
    priority?: unknown;
    status?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const source = str(body.source);
  const type = str(body.type);
  const rationale = str(body.rationale);
  const expectedImpact = str(body.expectedImpact);
  const priority =
    typeof body.priority === "string" &&
    (PRIORITIES as readonly string[]).includes(body.priority)
      ? (body.priority as ActionPriority)
      : undefined;
  const status =
    typeof body.status === "string" &&
    (STATUSES as readonly string[]).includes(body.status)
      ? (body.status as ActionStatus)
      : undefined;

  const action = await createAction({
    workspaceId,
    userId: user.id,
    title: body.title.trim().slice(0, TITLE_MAX),
    ...(source ? { source } : {}),
    ...(type ? { type } : {}),
    ...(rationale ? { rationale } : {}),
    ...(expectedImpact ? { expectedImpact } : {}),
    ...(priority ? { priority } : {}),
    ...(status ? { status } : {}),
  });
  if (!action) {
    return NextResponse.json(
      { error: "Failed to create action" },
      { status: 500 }
    );
  }
  return NextResponse.json({ action }, { status: 201 });
}
