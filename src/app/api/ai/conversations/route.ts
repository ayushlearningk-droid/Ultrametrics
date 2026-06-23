/**
 * Ask Ultrametrics — conversations collection route (U1 Phase 1).
 *
 * GET  /api/ai/conversations  → list the current user's conversations in the
 *                               active workspace (sidebar).
 * POST /api/ai/conversations  → create a new conversation { title? }.
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
  listConversations,
  createConversation,
} from "@/lib/data/conversations";

export const runtime = "nodejs";

const TITLE_MAX = 200;

async function resolveWorkspaceId(): Promise<string | null> {
  const workspaces = await getUserWorkspaces();
  return getCurrentWorkspaceId(workspaces);
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

  // Sprint 5: optional search (?q=) + archived-only (?archived=true) filters.
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? undefined;
  const archived = params.get("archived") === "true";

  const conversations = await listConversations(workspaceId, { q, archived });
  return NextResponse.json({ conversations });
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

  let body: { title?: unknown } = {};
  try {
    body = (await request.json()) as { title?: unknown };
  } catch {
    // Empty body is fine — defaults to "New chat".
  }
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, TITLE_MAX)
      : undefined;

  const conversation = await createConversation({
    workspaceId,
    userId: user.id,
    ...(title ? { title } : {}),
  });
  if (!conversation) {
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
  return NextResponse.json({ conversation }, { status: 201 });
}
