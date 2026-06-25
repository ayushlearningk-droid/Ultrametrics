/**
 * Workspace memory — collection route (Sprint 31).
 *
 * GET  /api/workspace/memory  → list the active workspace's memory notes.
 * POST /api/workspace/memory  → create a note { content }.
 *
 * workspaceId resolved SERVER-SIDE; RLS double-guards workspace membership.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
} from "@/lib/data/workspaces";
import {
  listMemories,
  createMemory,
  MEMORY_MAX_LEN,
} from "@/lib/data/workspace-memory";

export const runtime = "nodejs";

async function resolveWorkspaceId(): Promise<string | null> {
  const workspaces = await getUserWorkspaces();
  return getCurrentWorkspaceId(workspaces);
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace found" }, { status: 400 });
  }
  const memories = await listMemories(workspaceId);
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace found" }, { status: 400 });
  }

  let body: { content?: unknown } = {};
  try {
    body = (await request.json()) as { content?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const memory = await createMemory({
    workspaceId,
    content: body.content.trim().slice(0, MEMORY_MAX_LEN),
    source: "user",
    userId: user.id,
  });
  if (!memory) {
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
  return NextResponse.json({ memory }, { status: 201 });
}
