import { NextResponse } from "next/server";
import {
  getCurrentWorkspaceId,
  getUserWorkspaces,
} from "@/lib/data/workspaces";
import { getAccountInsights } from "@/lib/meta/insights";
import { getLatestMetaPendingSession } from "@/lib/meta/pending";

export async function GET() {
  try {
    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 400 }
      );
    }

    const session = await getLatestMetaPendingSession(workspaceId);

    if (!session) {
      return NextResponse.json(
        { error: "No Meta session found" },
        { status: 404 }
      );
    }

    const insights = await getAccountInsights(
      session.access_token as string,
      "1715428908615854"
    );
    console.log("META INSIGHTS:", insights);
    
    return NextResponse.json({ success: true, insights });
  } catch (error) {
    console.error("Meta test-insights failed", error);
    return NextResponse.json(
      { error: "Failed to fetch Meta insights" },
      { status: 500 }
    );
  }
}
