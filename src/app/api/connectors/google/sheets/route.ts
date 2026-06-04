import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { listSpreadsheets } from "@/lib/google/sheets";

export async function GET(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace found" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: connector, error } = await admin
    .from("connectors")
    .select("id, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google_sheets")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!connector) {
    return NextResponse.json({ spreadsheets: [] }, { status: 200 });
  }

  const config = (connector.config ?? {}) as {
    access_token?: string;
    refresh_token?: string;
  };

  const spreadsheets = await listSpreadsheets({
    accessToken: config.access_token,
    refreshToken: config.refresh_token,
  });

  return NextResponse.json({ spreadsheets });
}
