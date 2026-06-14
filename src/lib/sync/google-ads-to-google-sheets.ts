import { google } from "googleapis";
import { requireGoogleOAuthConfig } from "@/lib/google/config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCampaignInsights,
  refreshGoogleAdsAccessToken,
  type GoogleAdsCampaignRow,
} from "@/lib/google-ads/insights";

const SHEET_TAB_NAME = "Google Ads";
const SHEET_HEADERS = [
  "Date",
  "Campaign",
  "Cost",
  "Clicks",
  "Impressions",
  "Conversions",
  "Revenue",
  "ROAS",
] as const;
const HEADER_RANGE = `${SHEET_TAB_NAME}!A1:H1`;
const DATA_RANGE = `${SHEET_TAB_NAME}!A2:H`;

type GoogleSheetsConnectorConfig = {
  access_token?: string;
  refresh_token?: string;
  spreadsheet_id?: string;
};

type GoogleAdsConnectorConfig = {
  currency?: string;
  refresh_token?: string | null;
};

export type GoogleAdsSheetsSyncResult =
  | { ok: true; status: 200; rowsWritten: number; spreadsheetId: string; isSample: boolean }
  | { ok: false; status: number; error: string };

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
        requests: [{ addSheet: { properties: { title: SHEET_TAB_NAME } } }],
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
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [Array.from(SHEET_HEADERS)] },
    });
  }
}

async function writeInsightRows(
  spreadsheetId: string,
  tokens: { accessToken?: string; refreshToken?: string },
  insights: GoogleAdsCampaignRow[]
): Promise<{ rowsWritten: number; isSample: false }> {
  const sheets = getGoogleSheetsClient(tokens);

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: DATA_RANGE });

  // C1: never fabricate data. Empty insights → write nothing (real data only).
  let rows: (string | number)[][];

  if (insights.length === 0) {
    rows = [];
  } else {
    rows = insights.map((row) => {
      const roas =
        row.costCurrency > 0
          ? parseFloat((row.conversionsValue / row.costCurrency).toFixed(2))
          : 0;
      return [
        row.date,
        row.campaignName,
        row.costCurrency,
        row.clicks,
        row.impressions,
        row.conversions,
        row.conversionsValue,
        roas,
      ];
    });
  }

  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: DATA_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });
  }

  // C1: isSample retained in shape for response/UI compatibility, always false.
  return { rowsWritten: rows.length, isSample: false };
}

export async function runGoogleAdsToGoogleSheetsSyncForWorkspace(
  workspaceId: string
): Promise<GoogleAdsSheetsSyncResult> {
  const admin = createAdminClient();

  const [
    { data: sheetsConnector, error: sheetsConnectorError },
    { data: adsConnectors },
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
      .select("id, external_account_id, config")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google_ads")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const adsConnector = adsConnectors?.[0] ?? null;
  const startedAt = new Date().toISOString();

  if (sheetsConnectorError) {
    return { ok: false, status: 500, error: sheetsConnectorError.message };
  }

  if (!sheetsConnector) {
    return {
      ok: false,
      status: 404,
      error: "Google Sheets connector not found. Connect Google Sheets first.",
    };
  }

  const { data: syncJob, error: syncJobCreateError } = await admin
    .from("sync_jobs")
    .insert({
      connector_id: sheetsConnector.id,
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
  ): Promise<GoogleAdsSheetsSyncResult> {
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

  const sheetsConfig = (sheetsConnector.config ?? {}) as GoogleSheetsConnectorConfig;
  const spreadsheetId = sheetsConfig.spreadsheet_id;

  if (!spreadsheetId) {
    return failSyncJob("No spreadsheet selected. Select a spreadsheet first.", 400);
  }

  if (!sheetsConfig.access_token && !sheetsConfig.refresh_token) {
    return failSyncJob(
      "Google Sheets connector is missing OAuth tokens. Reconnect Google Sheets.",
      400
    );
  }

  const tokens = {
    accessToken: sheetsConfig.access_token,
    refreshToken: sheetsConfig.refresh_token,
  };

  // Fetch Google Ads insights; if not connected or fetch fails, insights stay empty
  // and nothing is written to the customer sheet (C1 — no fabricated data).
  let insights: GoogleAdsCampaignRow[] = [];
  const adsConfig = (adsConnector?.config ?? {}) as GoogleAdsConnectorConfig;

  if (adsConnector?.external_account_id && adsConfig.refresh_token) {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
    const mccCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.trim();

    if (developerToken && mccCustomerId) {
      try {
        const accessToken = await refreshGoogleAdsAccessToken(adsConfig.refresh_token);
        insights = await getCampaignInsights(
          accessToken,
          developerToken,
          String(adsConnector.external_account_id),
          mccCustomerId
        );
      } catch (err) {
        console.warn("[GoogleAdsSync] insights fetch failed; writing no rows:", err);
      }
    } else {
      console.warn(
        "[GoogleAdsSync] GOOGLE_ADS_DEVELOPER_TOKEN or GOOGLE_ADS_MCC_CUSTOMER_ID not set"
      );
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
      .eq("id", sheetsConnector.id);

    await admin
      .from("sync_jobs")
      .update({
        status: "completed",
        completed_at: syncedAt,
        records_processed: rowsWritten,
        error_message: null,
      })
      .eq("id", syncJobId);

    if (adsConnector) {
      await admin
        .from("connectors")
        .update({ last_synced_at: syncedAt, updated_at: syncedAt })
        .eq("id", adsConnector.id);
    }

    return { ok: true, status: 200, rowsWritten, spreadsheetId, isSample };
  } catch (error) {
    console.error("[GoogleAdsSync] sync failed:", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return failSyncJob(message, 500);
  }
}
