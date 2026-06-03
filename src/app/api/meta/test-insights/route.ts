import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const admin = createAdminClient();
    const { data: connector, error: connectorError } = await admin
      .from("connectors")
      .select("external_account_id, external_account_name, config")
      .eq("workspace_id", workspaceId)
      .eq("provider", "meta_ads")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connectorError) {
      console.error("Meta test-insights connector lookup failed", connectorError);
      return NextResponse.json(
        { error: "Failed to resolve Meta connector" },
        { status: 500 }
      );
    }

    if (!connector?.external_account_id) {
      return NextResponse.json(
        { error: "No active Meta connector found" },
        { status: 404 }
      );
    }

    const insights = await getAccountInsights(
      session.access_token as string,
      String(connector.external_account_id)
    );

    const config = (connector.config ?? {}) as { currency?: string };

    return NextResponse.json({
      success: true,
      insights,
      accountId: connector.external_account_id,
      accountName: connector.external_account_name,
      currency: config.currency ?? "INR",
    });
  } catch (error) {
    console.error("Meta test-insights failed", error);
    return NextResponse.json(
      { error: "Failed to fetch Meta insights" },
      { status: 500 }
    );
  }
}
