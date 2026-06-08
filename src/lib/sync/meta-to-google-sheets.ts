import { google } from "googleapis";
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

export type WorkspaceSyncExecutionResult =
  | {
      ok: true;
      status: 200;
      rowsWritten: number;
      spreadsheetId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function normalizeMetaAccountId(accountId: string): string {
  return accountId.startsWith("act_") ? accountId.slice(4) : accountId;
}

async function fetchMetaInsightsLast30Days(
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

export async function runMetaToGoogleSheetsSyncForWorkspace(
  workspaceId: string
): Promise<WorkspaceSyncExecutionResult> {
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
    return { ok: false, status: 500, error: googleConnectorError.message };
  }

  if (metaConnectorError) {
    return { ok: false, status: 500, error: metaConnectorError.message };
  }

  if (!googleConnector) {
    return { ok: false, status: 404, error: "Google Sheets connector not found" };
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
    return {
      ok: false,
      status: 500,
      error: syncJobCreateError?.message ?? "Failed to create sync job",
    };
  }

  const syncJobId = syncJob.id;

  async function failSyncJob(message: string, status = 500): Promise<WorkspaceSyncExecutionResult> {
    await admin
      .from("sync_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        records_processed: 0,
        error_message: message,
      })
      .eq("id", syncJobId);

    return { ok: false, status, error: message };
  }

  if (!metaConnector?.external_account_id) {
    return failSyncJob("Meta Ads connector not found", 404);
  }

  const googleConfig = (googleConnector.config ?? {}) as GoogleConnectorConfig;
  const spreadsheetId = googleConfig.spreadsheet_id;

  if (!spreadsheetId) {
    return failSyncJob("No spreadsheet selected", 400);
  }

  if (!googleConfig.access_token && !googleConfig.refresh_token) {
    return failSyncJob("Google connector is missing OAuth tokens", 400);
  }

  const pendingSession = await getLatestMetaPendingSession(workspaceId);
  if (!pendingSession?.access_token) {
    return failSyncJob("Meta OAuth session not found", 400);
  }

  try {
    const insights = await fetchMetaInsightsLast30Days(
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

    return {
      ok: true,
      status: 200,
      rowsWritten,
      spreadsheetId,
    };
  } catch (error) {
    console.error("Meta to Google Sheets sync failed", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return failSyncJob(message, 500);
  }
}
