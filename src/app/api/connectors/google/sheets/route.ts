import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { listSpreadsheets } from "@/lib/google/sheets";
import { getConnectorToken } from "@/lib/data/connector-credentials";
import { requireWorkspaceWrite } from "@/lib/api/require-workspace-role";

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

  // RBAC: listing spreadsheets is a privileged setup action (owner/admin only).
  const access = await requireWorkspaceWrite(workspaceId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
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

  // C2 vault-first read with config fallback.
  let accessToken = config.access_token;
  let refreshToken = config.refresh_token;
  try {
    const vault = await getConnectorToken(connector.id);
    if (vault?.accessToken) accessToken = vault.accessToken;
    if (vault?.refreshToken) refreshToken = vault.refreshToken;
  } catch (err) {
    console.error("[C2] google vault read failed, using config fallback:", err);
  }

  const spreadsheets = await listSpreadsheets({
    accessToken,
    refreshToken,
  });

  return NextResponse.json({ spreadsheets });
}
