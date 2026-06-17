import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { requireWorkspaceWrite } from "@/lib/api/require-workspace-role";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { runMetaToGoogleSheetsSyncForWorkspace } from "@/lib/sync/meta-to-google-sheets";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace found" }, { status: 400 });
  }

  // RBAC: running a sync is an owner/admin action (members are read-only).
  const access = await requireWorkspaceWrite(workspaceId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const result = await runMetaToGoogleSheetsSyncForWorkspace(workspaceId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      ok: true,
      rowsWritten: result.rowsWritten,
      spreadsheetId: result.spreadsheetId,
      isSample: result.isSample,
    },
    { status: result.status }
  );
}