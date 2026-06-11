import { NextResponse } from "next/server";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { getAccountInsightsByDay } from "@/lib/meta/insights";
import { getActiveMetaToken, markMetaConnectorTokenError } from "@/lib/meta/token";

export async function GET() {
  try {
    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "No workspace" }, { status: 400 });
    }

    const token = await getActiveMetaToken(workspaceId);

    if (token.status !== "ok") {
      return NextResponse.json({ success: false, error: "Not connected" }, { status: 401 });
    }

    try {
      const rows = await getAccountInsightsByDay(token.accessToken, token.accountId, 14);
      return NextResponse.json({ success: true, days: rows, currency: token.currency });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('"code":190') || message.includes("Invalid OAuth")) {
        await markMetaConnectorTokenError(token.connectorId);
        return NextResponse.json({ success: false, error: "Token rejected" }, { status: 401 });
      }
      return NextResponse.json({ success: false, error: "Fetch failed" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
