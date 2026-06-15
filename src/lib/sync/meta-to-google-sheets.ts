import { google } from "googleapis";
import { requireGoogleOAuthConfig } from "@/lib/google/config";
import { getActiveMetaToken, markMetaConnectorTokenError } from "@/lib/meta/token";
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
  token_expires_at?: string;
  spreadsheet_id?: string;
  spreadsheet_name?: string;
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

/**
 * Creates a Google Sheets API client that:
 * - Sets token expiry so googleapis can auto-refresh when access_token expires
 * - Persists the refreshed access_token back to the DB via the `tokens` event
 */
function createSheetsClient(
  config: GoogleConnectorConfig,
  connectorId: string,
  admin: ReturnType<typeof createAdminClient>
) {
  const oauthConfig = requireGoogleOAuthConfig();
  const oauth2Client = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );

  const credentials: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  } = {
    access_token: config.access_token,
    refresh_token: config.refresh_token,
  };

  if (config.token_expires_at) {
    credentials.expiry_date = new Date(config.token_expires_at).getTime();
  }

  oauth2Client.setCredentials(credentials);

  // When googleapis auto-refreshes the access_token, persist the new token to DB
  oauth2Client.on("tokens", (newTokens) => {
    if (newTokens.access_token) {
      const newExpiresAt = newTokens.expiry_date
        ? new Date(newTokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600_000).toISOString();

      void admin
        .from("connectors")
        .update({
          config: {
            ...config,
            access_token: newTokens.access_token,
            token_expires_at: newExpiresAt,
            ...(newTokens.refresh_token ? { refresh_token: newTokens.refresh_token } : {}),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectorId);
    }
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

async function fetchMetaInsightsLast30Days(
  accessToken: string,
  accountId: string
): Promise<MetaInsightRow[]> {
  const normalizedAccountId = normalizeMetaAccountId(accountId);

  const params = new URLSearchParams({
    fields: "date_start,campaign_name,spend,impressions,clicks,action_values",
    level: "campaign",
    time_increment: "1",
    date_preset: "last_30d",
    limit: "5000",
    access_token: accessToken,
  });

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/act_${normalizedAccountId}/insights?${params.toString()}`;

  // TEMP LOG: remove after debugging account-id resolution
  console.log("[Sync][TEMP] raw accountId param:", accountId);
  console.log("[Sync][TEMP] normalized accountId:", normalizedAccountId);
  console.log(
    "[Sync][TEMP] Meta Insights URL:",
    url.replace(/access_token=[^&]+/, "access_token=***REDACTED***")
  );

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch Meta insights");
  }

  const payload = (await response.json()) as { data?: MetaInsightRow[] };
  return payload.data ?? [];
}

async function ensureSheetTab(
  spreadsheetId: string,
  sheets: ReturnType<typeof google.sheets>
): Promise<void> {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (data.sheets ?? []).some(
    (s) => s.properties?.title === SHEET_TAB_NAME
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_TAB_NAME } } }],
      },
    });
  }
}

async function ensureSheetHeaders(
  spreadsheetId: string,
  sheets: ReturnType<typeof google.sheets>
): Promise<void> {
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
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [Array.from(SHEET_HEADERS)] },
    });
  }
}

async function writeInsightRows(
  spreadsheetId: string,
  sheets: ReturnType<typeof google.sheets>,
  insights: MetaInsightRow[]
): Promise<{ rowsWritten: number; isSample: false }> {
  // Never fabricate data. Empty insights → write no rows (real data only).
  let rows: (string | number)[][];

  if (insights.length === 0) {
    rows = [];
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
      const roas = spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0;

      return [
        row.date_start ?? "",
        row.campaign_name ?? "",
        spend,
        parseInt(row.clicks ?? "0", 10),
        parseInt(row.impressions ?? "0", 10),
        revenue,
        roas,
      ];
    });
  }

  if (rows.length > 0) {
    // Write new data FIRST — if this fails, existing data is preserved
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TAB_NAME}!A2:G${rows.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });
    // Clear any stale rows below the new data (best-effort, non-critical)
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_TAB_NAME}!A${rows.length + 2}:G`,
      });
    } catch {
      // Non-critical: extra rows may remain but new data is written correctly
    }
  } else {
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: DATA_RANGE });
  }

  // isSample retained in shape for response/UI compatibility, always false.
  return { rowsWritten: rows.length, isSample: false };
}

export async function runMetaToGoogleSheetsSyncForWorkspace(
  workspaceId: string
): Promise<WorkspaceSyncExecutionResult> {
  const admin = createAdminClient();

  const { data: googleConnector, error: googleConnectorError } = await admin
    .from("connectors")
    .select("id, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google_sheets")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .maybeSingle();

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

  // Resolve Meta Ads data — fail loudly for expired/missing tokens so the user knows
  let insights: MetaInsightRow[] = [];
  let metaConnectorId: string | null = null;

  const metaToken = await getActiveMetaToken(workspaceId);

  if (metaToken.status === "ok") {
    metaConnectorId = metaToken.connectorId;
    // TEMP LOG: connector external_account_id (source of the insights account id)
    console.log(
      "[Sync][TEMP] connector external_account_id:",
      metaToken.accountId
    );
    try {
      insights = await fetchMetaInsightsLast30Days(
        metaToken.accessToken,
        metaToken.accountId
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[Sync] Meta insights fetch failed:", message);
      if (message.includes('"code":190') || message.includes("Invalid OAuth")) {
        await markMetaConnectorTokenError(metaToken.connectorId);
      }
      return failSyncJob(`Meta Ads API error: ${message}`, 500);
    }
  } else if (metaToken.status === "expired") {
    return failSyncJob(
      "Meta Ads token has expired. Reconnect Meta Ads to sync real data.",
      400
    );
  } else if (metaToken.status === "missing") {
    return failSyncJob(
      "Meta Ads access token is missing. Reconnect Meta Ads.",
      400
    );
  }
  // status === "not_connected": fall through with empty insights → nothing written

  // Create the sheets client once; it will auto-refresh the token and persist it if needed
  const sheets = createSheetsClient(googleConfig, googleConnector.id, admin);

  try {
    await ensureSheetTab(spreadsheetId, sheets);
    await ensureSheetHeaders(spreadsheetId, sheets);
    const { rowsWritten, isSample } = await writeInsightRows(
      spreadsheetId,
      sheets,
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

    if (metaConnectorId) {
      await admin
        .from("connectors")
        .update({ last_synced_at: syncedAt, updated_at: syncedAt })
        .eq("id", metaConnectorId);
    }

    return { ok: true, status: 200, rowsWritten, spreadsheetId, isSample };
  } catch (error) {
    console.error("[Sync] Meta to Google Sheets sync failed:", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return failSyncJob(message, 500);
  }
}
