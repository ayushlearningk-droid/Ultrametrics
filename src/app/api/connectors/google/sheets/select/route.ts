import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { requireWorkspaceWrite } from "@/lib/api/require-workspace-role";

type SelectSpreadsheetBody = {
  spreadsheetId?: string;
  spreadsheetName?: string;
};

export async function POST(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const body = (await request.json().catch(() => ({}))) as SelectSpreadsheetBody;
  const spreadsheetId = body.spreadsheetId?.trim();
  const spreadsheetName = body.spreadsheetName?.trim();

  if (!spreadsheetId) {
    return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 });
  }

  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace found" },
      { status: 400 }
    );
  }

  // RBAC: selecting the destination spreadsheet is an owner/admin action.
  const access = await requireWorkspaceWrite(workspaceId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const admin = createAdminClient();

  const { data: connector, error: connectorError } = await admin
    .from("connectors")
    .select("id, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google_sheets")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (connectorError) {
    return NextResponse.json({ error: connectorError.message }, { status: 500 });
  }

  if (!connector) {
    return NextResponse.json(
      { error: "Google connector not found" },
      { status: 404 }
    );
  }

  const nextConfig = {
    ...(connector.config ?? {}),
    spreadsheet_id: spreadsheetId,
    spreadsheet_name: spreadsheetName ?? null,
  };

  const { error: updateError } = await admin
    .from("connectors")
    .update({
      config: nextConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connector.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
