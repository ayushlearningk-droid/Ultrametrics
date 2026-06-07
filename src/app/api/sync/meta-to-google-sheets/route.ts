import { google } from "googleapis";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import { requireGoogleOAuthConfig } from "@/lib/google/config";
import { getLatestMetaPendingSession } from "@/lib/meta/pending";
import { createAdminClient } from "@/lib/supabase/admin";

const META_GRAPH_VERSION = "v23.0";
const SHEET_HEADERS = ["Date", "Campaign Name", "Spend", "Impressions", "Clicks"] as const;

type MetaInsightRow = {
  date_start?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
};

type GoogleConnectorConfig = {
  access_token?: string;
  refresh_token?: string;
  spreadsheet_id?: string;
};

function normalizeMetaAccountId(accountId: string): string {
  return accountId.startsWith("act_") ? accountId.slice(4) : accountId;
}

async function fetchMetaInsightsLast7Days(
  accessToken: string,
  accountId: string
): Promise<MetaInsightRow[]> {
  const normalizedAccountId = normalizeMetaAccountId(accountId);

  const params = new URLSearchParams({
    fields: "date_start,campaign_name,spend,impressions,clicks",
    level: "campaign",
    time_increment: "1",
    date_preset: "last_30d",
    limit: "5000",
    access_token: accessToken,
  });

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/act_${normalizedAccountId}/insights?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch Meta insights");
  }

  const payload = (await response.json()) as { data?: MetaInsightRow[] };
  return payload.data ?? [];
}

function getGoogleSheetsClient(tokens: {
  accessToken?: string;
  refreshToken?: string;
}) {
  const config = requireGoogleOAuthConfig();

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

async function ensureSheetHeaders(
  spreadsheetId: string,
  tokens: { accessToken?: string; refreshToken?: string }
) {
  const sheets = getGoogleSheetsClient(tokens);

  const headerRange = "A1:E1";
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: headerRange,
  });

  const row = existing.data.values?.[0] ?? [];
  const hasExpectedHeaders = SHEET_HEADERS.every((header, index) => {
    return (row[index] ?? "").toString().trim() === header;
  });

  if (hasExpectedHeaders) {
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: headerRange,
    valueInputOption: "RAW",
    requestBody: {
      values: [Array.from(SHEET_HEADERS)],
    },
  });
}

async function writeInsightRowsFromRow2(
  spreadsheetId: string,
  tokens: { accessToken?: string; refreshToken?: string },
  insights: MetaInsightRow[]
) {
  const sheets = getGoogleSheetsClient(tokens);

  // Keep header row intact, clear all previous data rows.
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "A2:E",
  });

  if (insights.length === 0) {
    return 0;
  }

  const rows = insights.map((row) => [
    row.date_start ?? "",
    row.campaign_name ?? "",
    row.spend ?? "0",
    row.impressions ?? "0",
    row.clicks ?? "0",
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "A2:E",
    valueInputOption: "RAW",
    requestBody: {
      values: rows,
    },
  });

  return rows.length;
}

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

  const admin = createAdminClient();

  const [{ data: googleConnector, error: googleConnectorError }, { data: metaConnectors, error: metaConnectorError }] = await Promise.all([
    admin
      .from("connectors")
      .select("id, config")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google_sheets")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .maybeSingle(),
    admin
      .from("connectors")
      .select("id, external_account_id")
      .eq("workspace_id", workspaceId)
      .eq("provider", "meta_ads")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const metaConnector = metaConnectors?.[0] ?? null;
  const startedAt = new Date().toISOString();

  if (googleConnectorError) {
    return NextResponse.json({ error: googleConnectorError.message }, { status: 500 });
  }

  if (metaConnectorError) {
    return NextResponse.json({ error: metaConnectorError.message }, { status: 500 });
  }

  if (!googleConnector) {
    return NextResponse.json({ error: "Google Sheets connector not found" }, { status: 404 });
  }

  const { data: syncJob, error: syncJobCreateError } = await admin
    .from("sync_jobs")
    .insert({
      connector_id: googleConnector.id,
      workspace_id: workspaceId,
      status: "running",
      started_at: startedAt,
      records_processed: 0,
    })
    .select("id")
    .single();

  if (syncJobCreateError || !syncJob) {
    return NextResponse.json(
      { error: syncJobCreateError?.message ?? "Failed to create sync job" },
      { status: 500 }
    );
  }

  const syncJobId = syncJob.id;

  async function failSyncJob(message: string) {
    await admin
      .from("sync_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        records_processed: 0,
        error_message: message,
      })
      .eq("id", syncJobId);
  }

  if (!metaConnector?.external_account_id) {
    await failSyncJob("Meta Ads connector not found");
    return NextResponse.json({ error: "Meta Ads connector not found" }, { status: 404 });
  }

  const googleConfig = (googleConnector.config ?? {}) as GoogleConnectorConfig;
  const spreadsheetId = googleConfig.spreadsheet_id;

  if (!spreadsheetId) {
    await failSyncJob("No spreadsheet selected");
    return NextResponse.json({ error: "No spreadsheet selected" }, { status: 400 });
  }

  if (!googleConfig.access_token && !googleConfig.refresh_token) {
    await failSyncJob("Google connector is missing OAuth tokens");
    return NextResponse.json({ error: "Google connector is missing OAuth tokens" }, { status: 400 });
  }

  const pendingSession = await getLatestMetaPendingSession(workspaceId);
  if (!pendingSession?.access_token) {
    await failSyncJob("Meta OAuth session not found");
    return NextResponse.json({ error: "Meta OAuth session not found" }, { status: 400 });
  }

  try {
    const insights = await fetchMetaInsightsLast7Days(
      pendingSession.access_token,
      String(metaConnector.external_account_id)
    );

    await ensureSheetHeaders(spreadsheetId, {
      accessToken: googleConfig.access_token,
      refreshToken: googleConfig.refresh_token,
    });

    const rowsWritten = await writeInsightRowsFromRow2(
      spreadsheetId,
      {
        accessToken: googleConfig.access_token,
        refreshToken: googleConfig.refresh_token,
      },
      insights
    );

    const syncedAt = new Date().toISOString();

    await Promise.all([
      admin
        .from("connectors")
        .update({ last_synced_at: syncedAt, updated_at: syncedAt })
        .eq("id", googleConnector.id),
      admin
        .from("connectors")
        .update({ last_synced_at: syncedAt, updated_at: syncedAt })
        .eq("id", metaConnector.id),
      admin
        .from("sync_jobs")
        .update({
          status: "completed",
          completed_at: syncedAt,
          records_processed: rowsWritten,
          error_message: null,
        })
        .eq("id", syncJobId),
    ]);

    return NextResponse.json({
      ok: true,
      rowsWritten,
      spreadsheetId,
    });
  } catch (error) {
    console.error("Meta to Google Sheets sync failed", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    await admin
      .from("sync_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        records_processed: 0,
        error_message: message,
      })
      .eq("id", syncJobId);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}