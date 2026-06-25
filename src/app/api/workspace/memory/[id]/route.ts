/**
 * Workspace memory — single note (Sprint 31).
 *
 * DELETE /api/workspace/memory/[id] → remove a note. Authorization via RLS:
 * deleting a row the user can't see is a no-op (idempotent success).
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { deleteMemory } from "@/lib/data/workspace-memory";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteMemory(id);
  return NextResponse.json({ ok: true });
}
