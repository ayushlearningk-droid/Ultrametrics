import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
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

  const result = await runMetaToGoogleSheetsSyncForWorkspace(workspaceId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      ok: true,
      rowsWritten: result.rowsWritten,
      spreadsheetId: result.spreadsheetId,
    },
    { status: result.status }
  );
}