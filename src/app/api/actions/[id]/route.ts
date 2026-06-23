/**
 * Action Queue — single action route (Sprint 10).
 *
 * PATCH  /api/actions/[id]  → update status { status: pending|approved|dismissed }
 * DELETE /api/actions/[id]  → delete (e.g. un-approve a recommendation)
 *
 * Authorization is delegated to RLS: updateActionStatus/deleteAction only
 * resolve rows the authenticated user owns in a workspace they belong to. A row
 * that isn't visible reads back as null → 404.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import {
  updateActionStatus,
  deleteAction,
  type ActionStatus,
} from "@/lib/data/action-queue";

export const runtime = "nodejs";

const STATUSES: readonly ActionStatus[] = ["pending", "approved", "dismissed"];

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { status?: unknown } = {};
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.status !== "string" ||
    !(STATUSES as readonly string[]).includes(body.status)
  ) {
    return NextResponse.json(
      { error: "status must be one of pending, approved, dismissed" },
      { status: 400 }
    );
  }

  const action = await updateActionStatus(id, body.status as ActionStatus);
  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }
  return NextResponse.json({ action });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Existence/ownership is enforced by RLS; deleting a non-visible row is a
  // no-op, reported as success (idempotent).
  await deleteAction(id);
  return NextResponse.json({ ok: true });
}
