/**
 * Google Ads metrics adapter (Step 2).
 *
 * Normalizes Google Ads campaign insights into raw, additive fields for the
 * metrics engine. Returns RawMetricResult — NO ratio derivation (the engine
 * derives ctr/cpc/cpm/roas via derive.ts). Returns null when not connected,
 * misconfigured, or empty. Not yet wired into any engine/route.
 *
 * Token resolution mirrors the sync path: refresh token is read vault-first
 * (getConnectorToken) with a connectors.config fallback; developer/MCC tokens
 * come from env.
 *
 * Currency precedence: customer.currency_code → connector.config.currency → USD.
 */

import type {
  ConnectorMetricsAdapter,
  RawMetricResult,
  RawMetricSet,
  MetricSeriesPoint,
  CampaignRawBreakdown,
} from "@/lib/metrics/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectorToken } from "@/lib/data/connector-credentials";
import {
  refreshGoogleAdsAccessToken,
  getCampaignInsights,
  type GoogleAdsCampaignRow,
} from "@/lib/google-ads/insights";
import { sumRaw, emptyRaw } from "@/lib/metrics/derive";

type GoogleAdsConfig = { currency?: string; refresh_token?: string | null };

function toRaw(row: GoogleAdsCampaignRow): RawMetricSet {
  return {
    spend: row.costCurrency,
    revenue: row.conversionsValue,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    reach: 0,
  };
}

/** Group campaign×day rows into one raw point per date. */
function seriesByDate(rows: GoogleAdsCampaignRow[]): MetricSeriesPoint[] {
  const byDate = new Map<string, RawMetricSet>();
  for (const row of rows) {
    if (!row.date) continue;
    const acc = byDate.get(row.date) ?? emptyRaw();
    byDate.set(row.date, sumRaw([acc, toRaw(row)]));
  }
  return [...byDate.entries()]
    .map(([date, raw]) => ({ date, ...raw }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group campaign×day rows by campaignId into per-campaign raw totals (Issue #3).
 * Rows lacking a campaignId are skipped. Order preserved by first appearance;
 * top-K selection happens later in serialization.
 */
function groupByCampaign(rows: GoogleAdsCampaignRow[]): CampaignRawBreakdown[] {
  const byId = new Map<string, { name: string; acc: RawMetricSet }>();
  for (const row of rows) {
    if (!row.campaignId) continue;
    const entry = byId.get(row.campaignId) ?? {
      name: row.campaignName || row.campaignId,
      acc: emptyRaw(),
    };
    entry.acc = sumRaw([entry.acc, toRaw(row)]);
    byId.set(row.campaignId, entry);
  }
  return [...byId.entries()].map(([campaignId, { name, acc }]) => ({
    campaignId,
    campaignName: name,
    rawTotals: acc,
  }));
}

export const googleAdsMetricsAdapter: ConnectorMetricsAdapter = {
  provider: "google_ads",

  async fetch(_workspaceId, connectorId, query): Promise<RawMetricResult | null> {
    const admin = createAdminClient();
    const { data: connector } = await admin
      .from("connectors")
      .select("id, external_account_id, config")
      .eq("id", connectorId)
      .maybeSingle();

    if (!connector?.external_account_id) return null;

    const config = (connector.config ?? {}) as GoogleAdsConfig;

    // Vault-first refresh token, config fallback.
    let refreshToken = config.refresh_token ?? null;
    try {
      const vault = await getConnectorToken(connectorId);
      if (vault?.refreshToken) refreshToken = vault.refreshToken;
    } catch {
      // Vault read failed — fall back to config refresh token.
    }
    if (!refreshToken) return null;

    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
    const mccCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.trim();
    if (!developerToken || !mccCustomerId) return null;

    // Google Ads (GAQL) has no all-time preset, so lifetime is a wide explicit
    // window: 2015-01-01 → today. Range mode uses the requested dateRange.
    const range =
      query.mode === "lifetime"
        ? { since: "2015-01-01", until: new Date().toISOString().slice(0, 10) }
        : { since: query.dateRange.since, until: query.dateRange.until };

    const accessToken = await refreshGoogleAdsAccessToken(refreshToken);
    const rows = await getCampaignInsights(
      accessToken,
      developerToken,
      String(connector.external_account_id),
      mccCustomerId,
      range
    );
    if (rows.length === 0) return null;

    const rawTotals = sumRaw(rows.map(toRaw));
    const currency =
      rows.find((r) => r.currencyCode)?.currencyCode ??
      config.currency ??
      "USD";

    const series =
      query.granularity === "daily" ? seriesByDate(rows) : undefined;

    // Issue #3: per-campaign breakdown only when fetched at campaign level.
    // Account rawTotals above is unchanged (still the full sum of all rows).
    const campaigns =
      query.level === "campaign" ? groupByCampaign(rows) : undefined;

    return {
      provider: "google_ads",
      currency,
      dateRange: range,
      granularity: query.granularity,
      rawTotals,
      series,
      campaigns,
    };
  },
};
