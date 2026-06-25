/**
 * Action executions — list route (Sprint 14A).
 *
 * GET /api/actions/[id]/executions
 *   Returns the execution attempts for one action, newest-first. RLS-scoped:
 *   only the owner in a member workspace sees rows; an invisible action yields
 *   an empty list.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { listExecutions } from "@/lib/data/action-executions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const executions = await listExecutions(id);
  return NextResponse.json({ executions });
}
