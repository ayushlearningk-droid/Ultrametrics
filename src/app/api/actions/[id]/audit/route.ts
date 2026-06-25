/**
 * Action audit — list route (Sprint 14A).
 *
 * GET /api/actions/[id]/audit
 *   Returns the append-only audit trail for one action, chronological. RLS-
 *   scoped to the owner in a member workspace; the trail is read-only here and
 *   immutable at the database level (no UPDATE/DELETE policy).
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { listAudit } from "@/lib/actions/audit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const audit = await listAudit(id);
  return NextResponse.json({ audit });
}
