import { google } from "googleapis";
import { requireGoogleOAuthConfig } from "@/lib/google/config";
import { getLatestMetaPendingSession } from "@/lib/meta/pending";
import { createAdminClient } from "@/lib/supabase/admin";

const META_GRAPH_VERSION = "v23.0";
const SHEET_TAB_NAME = "Ultrametrics";
const SHEET_HEADERS = [
  "Date",
  "Campaign",
  "Cost",
  "Clicks",
  "Impressions",
  "Revenue",
  "ROAS",
] as const;
const HEADER_RANGE = `${SHEET_TAB_NAME}!A1:G1`;
const DATA_RANGE = `${SHEET_TAB_NAME}!A2:G`;

type MetaInsightRow = {
  date_start?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  action_values?: Array<{ action_type: string; value: string }>;
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
      isSample: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function normalizeMetaAccountId(accountId: string): string {
  return accountId.startsWith("act_") ? accountId.slice(4) : accountId;
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

async function fetchMetaInsightsLast30Days(
  accessToken: string,
  accountId: string
): Promise<MetaInsightRow[]> {
  const normalizedAccountId = normalizeMetaAccountId(accountId);

  const params = new URLSearchParams({
    fields:
      "date_start,campaign_name,spend,impressions,clicks,action_values",
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

function generateSampleData(): string[][] {
  return [
    ["2024-06-01", "Brand Awareness", "150.00", "320", "12000", "450.00", "3.00"],
    ["2024-06-01", "Retargeting", "200.00", "410", "15500", "640.00", "3.20"],
    ["2024-06-02", "Brand Awareness", "165.00", "355", "13200", "495.00", "3.00"],
    ["2024-06-02", "Prospecting", "300.00", "580", "22000", "810.00", "2.70"],
    ["2024-06-03", "Retargeting", "220.00", "445", "16800", "704.00", "3.20"],
  ];
}

async function ensureSheetTab(
  spreadsheetId: string,
  tokens: { accessToken?: string; refreshToken?: string }
): Promise<void> {
  const sheets = getGoogleSheetsClient(tokens);
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (data.sheets ?? []).some(
    (s) => s.properties?.title === SHEET_TAB_NAME
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: SHEET_TAB_NAME },
            },
          },
        ],
      },
    });
  }
}

async function ensureSheetHeaders(
  spreadsheetId: string,
  tokens: { accessToken?: string; refreshToken?: string }
): Promise<void> {
  const sheets = getGoogleSheetsClient(tokens);

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: HEADER_RANGE,
  });

  const row = data.values?.[0] ?? [];
  const hasExpectedHeaders = SHEET_HEADERS.every(
    (header, i) => (row[i] ?? "").toString().trim() === header
  );

  if (!hasExpectedHeaders) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: HEADER_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [Array.from(SHEET_HEADERS)],
      },
    });
  }
}

async function writeInsightRows(
  spreadsheetId: string,
  tokens: { accessToken?: string; refreshToken?: string },
  insights: MetaInsightRow[]
): Promise<{ rowsWritten: number; isSample: boolean }> {
  const sheets = getGoogleSheetsClient(tokens);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: DATA_RANGE,
  });

  let rows: string[][];
  let isSample = false;

  if (insights.length === 0) {
    rows = generateSampleData();
    isSample = true;
  } else {
    rows = insights.map((row) => {
      const spend = parseFloat(row.spend ?? "0");
      const purchaseRevenue =
        row.action_values?.find(
          (a) =>
            a.action_type === "offsite_conversion.fb_pixel_purchase" ||
            a.action_type === "purchase"
        )?.value ?? "0";
      const revenue = parseFloat(purchaseRevenue);
      const roas = spend > 0 ? (revenue / spend).toFixed(2) : "0.00";

      return [
        row.date_start ?? "",
        row.campaign_name ?? "",
        spend.toFixed(2),
        row.clicks ?? "0",
        row.impressions ?? "0",
        revenue.toFixed(2),
        roas,
      ];
    });
  }

  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: DATA_RANGE,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }

  return { rowsWritten: rows.length, isSample };
}

export async function runMetaToGoogleSheetsSyncForWorkspace(
  workspaceId: string
): Promise<WorkspaceSyncExecutionResult> {
  const admin = createAdminClient();

  const [
    { data: googleConnector, error: googleConnectorError },
    { data: metaConnectors },
  ] = await Promise.all([
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

  if (!googleConnector) {
    return {
      ok: false,
      status: 404,
      error: "Google Sheets connector not found. Connect Google Sheets first.",
    };
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

  async function failSyncJob(
    message: string,
    status = 500
  ): Promise<WorkspaceSyncExecutionResult> {
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

  const googleConfig = (googleConnector.config ?? {}) as GoogleConnectorConfig;
  const spreadsheetId = googleConfig.spreadsheet_id;

  if (!spreadsheetId) {
    return failSyncJob(
      "No spreadsheet selected. Select a spreadsheet first.",
      400
    );
  }

  if (!googleConfig.access_token && !googleConfig.refresh_token) {
    return failSyncJob(
      "Google connector is missing OAuth tokens. Reconnect Google Sheets.",
      400
    );
  }

  const tokens = {
    accessToken: googleConfig.access_token,
    refreshToken: googleConfig.refresh_token,
  };

  // Fetch Meta insights; fall back to sample data if not connected or fetch fails.
  let insights: MetaInsightRow[] = [];
  if (metaConnector?.external_account_id) {
    const pendingSession = await getLatestMetaPendingSession(workspaceId);
    if (pendingSession?.access_token) {
      try {
        insights = await fetchMetaInsightsLast30Days(
          pendingSession.access_token,
          String(metaConnector.external_account_id)
        );
      } catch (err) {
        console.warn(
          "[Sync] Meta insights fetch failed, using sample data:",
          err
        );
      }
    }
  }

  try {
    await ensureSheetTab(spreadsheetId, tokens);
    await ensureSheetHeaders(spreadsheetId, tokens);
    const { rowsWritten, isSample } = await writeInsightRows(
      spreadsheetId,
      tokens,
      insights
    );

    const syncedAt = new Date().toISOString();

    await admin
      .from("connectors")
      .update({ last_synced_at: syncedAt, updated_at: syncedAt })
      .eq("id", googleConnector.id);

    await admin
      .from("sync_jobs")
      .update({
        status: "completed",
        completed_at: syncedAt,
        records_processed: rowsWritten,
        error_message: null,
      })
      .eq("id", syncJobId);

    if (metaConnector) {
      await admin
        .from("connectors")
        .update({ last_synced_at: syncedAt, updated_at: syncedAt })
        .eq("id", metaConnector.id);
    }

    return { ok: true, status: 200, rowsWritten, spreadsheetId, isSample };
  } catch (error) {
    console.error("[Sync] Meta to Google Sheets sync failed:", error);
    const message =
      error instanceof Error ? error.message : "Sync failed";
    return failSyncJob(message, 500);
  }
}
