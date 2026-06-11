import { NextResponse } from "next/server";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { getAccountInsights } from "@/lib/meta/insights";
import { getActiveMetaToken, markMetaConnectorTokenError } from "@/lib/meta/token";

export async function GET() {
  try {
    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const token = await getActiveMetaToken(workspaceId);

    if (token.status === "not_connected") {
      return NextResponse.json({ error: "No active Meta connector" }, { status: 404 });
    }

    if (token.status === "missing") {
      return NextResponse.json(
        { error: "Meta connector has no stored token. Reconnect Meta Ads.", needs_reconnect: true },
        { status: 401 }
      );
    }

    if (token.status === "expired") {
      return NextResponse.json(
        { error: "Meta access token has expired. Reconnect Meta Ads.", needs_reconnect: true, token_expired: true },
        { status: 401 }
      );
    }

    try {
      const insights = await getAccountInsights(token.accessToken, token.accountId);
      return NextResponse.json({
        success: true,
        insights,
        accountId: token.accountId,
        currency: token.currency,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Meta error code 190 = invalid/expired OAuth token
      if (message.includes('"code":190') || message.includes("Invalid OAuth")) {
        await markMetaConnectorTokenError(token.connectorId);
        return NextResponse.json(
          { error: "Meta token rejected by API. Reconnect Meta Ads.", needs_reconnect: true },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: "Failed to fetch Meta insights" }, { status: 500 });
    }
  } catch (error) {
    console.error("Meta test-insights failed", error);
    return NextResponse.json({ error: "Failed to fetch Meta insights" }, { status: 500 });
  }
}
