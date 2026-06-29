/**
 * Universal Search — read-only API (Sprint 58).
 *
 * GET /api/search?q=…&limit=…  → grouped search results across all registered
 * providers for the user's active workspace. Search only: no AI, no execution,
 * no mutation. workspaceId is resolved SERVER-SIDE; RLS scopes every provider.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
} from "@/lib/data/workspaces";
import { runSearch, DEFAULT_SEARCH_LIMIT } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT_MAX = 50;

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace found" },
      { status: 400 }
    );
  }

  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";

  const limitParam = Number.parseInt(params.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), LIMIT_MAX)
    : DEFAULT_SEARCH_LIMIT;

  const result = await runSearch({ q, workspaceId, limit });
  return NextResponse.json(result);
}
