/**
 * Meta Ads metrics adapter (Step 2).
 *
 * Normalizes Meta insights into raw, additive fields for the metrics engine.
 * Returns RawMetricResult — NO ratio derivation (the engine derives
 * ctr/cpc/cpm/roas via derive.ts). Returns null when Meta is not connected or
 * has no data. Not yet wired into any engine/route.
 *
 * V1: revenue is reported in totals only (series rows carry revenue = 0).
 */

import type {
  ConnectorMetricsAdapter,
  RawMetricResult,
  RawMetricSet,
  MetricSeriesPoint,
  CampaignRawBreakdown,
  AssetRawBreakdown,
} from "@/lib/metrics/types";
import type { MetaMetricsRow } from "@/lib/meta/insights";
import { getActiveMetaToken } from "@/lib/meta/token";
import { getAccountMetrics } from "@/lib/meta/insights";
import { sumRaw } from "@/lib/metrics/derive";

/** Raw additive view of one Meta insights row. */
function toRaw(r: MetaMetricsRow): RawMetricSet {
  return {
    spend: r.spend,
    revenue: r.revenue,
    impressions: r.impressions,
    clicks: r.clicks,
    conversions: r.conversions,
    reach: r.reach,
  };
}

/**
 * Group campaign-level rows by campaign_id into per-campaign raw totals
 * (Issue #3). Rows lacking a campaign_id are skipped. Order is preserved by
 * first appearance; top-K selection happens later in serialization.
 */
function groupByCampaign(rows: MetaMetricsRow[]): CampaignRawBreakdown[] {
  const byId = new Map<string, { name: string; rows: RawMetricSet[] }>();
  for (const r of rows) {
    if (!r.campaign_id) continue;
    const entry = byId.get(r.campaign_id) ?? {
      name: r.campaign_name ?? r.campaign_id,
      rows: [],
    };
    entry.rows.push(toRaw(r));
    byId.set(r.campaign_id, entry);
  }
  return [...byId.entries()].map(([campaignId, { name, rows: campaignRows }]) => ({
    campaignId,
    campaignName: name,
    rawTotals: sumRaw(campaignRows),
  }));
}

/**
 * Group ad-level rows by ad_id into per-ad raw totals (AI-002). Rows lacking an
 * ad_id are skipped. Flat (not nested under campaigns); top-K selection happens
 * later in serialization.
 */
function groupByAsset(rows: MetaMetricsRow[]): AssetRawBreakdown[] {
  const byId = new Map<string, { name: string; rows: RawMetricSet[] }>();
  for (const r of rows) {
    if (!r.ad_id) continue;
    const entry = byId.get(r.ad_id) ?? {
      name: r.ad_name ?? r.ad_id,
      rows: [],
    };
    entry.rows.push(toRaw(r));
    byId.set(r.ad_id, entry);
  }
  return [...byId.entries()].map(([assetId, { name, rows: assetRows }]) => ({
    assetId,
    assetName: name,
    rawTotals: sumRaw(assetRows),
  }));
}

export const metaMetricsAdapter: ConnectorMetricsAdapter = {
  provider: "meta_ads",

  // connectorId is unused: the Meta token (and currency) resolve from the
  // workspace's active connector via getActiveMetaToken.
  async fetch(workspaceId, _connectorId, query): Promise<RawMetricResult | null> {
    const token = await getActiveMetaToken(workspaceId);
    if (token.status !== "ok") return null;

    const rows = await getAccountMetrics(token.accessToken, token.accountId, {
      since: query.dateRange.since,
      until: query.dateRange.until,
      granularity: query.granularity,
      level: query.level,
    });
    if (rows.length === 0) return null;

    const rawRows: RawMetricSet[] = rows.map(toRaw);
    const rawTotals = sumRaw(rawRows);

    // Issue #3 / AI-002: per-campaign or per-ad breakdown only when fetched at
    // that level. Account rawTotals above is unchanged (still the full sum).
    const campaigns =
      query.level === "campaign" ? groupByCampaign(rows) : undefined;
    const assets = query.level === "ad" ? groupByAsset(rows) : undefined;

    // V1: revenue is totals-only — per-day series omits revenue (0).
    const series: MetricSeriesPoint[] | undefined =
      query.granularity === "daily"
        ? rows
            .filter((r) => r.date_start)
            .map((r) => ({
              date: r.date_start as string,
              spend: r.spend,
              revenue: 0,
              impressions: r.impressions,
              clicks: r.clicks,
              conversions: r.conversions,
              reach: r.reach,
            }))
        : undefined;

    return {
      provider: "meta_ads",
      currency: token.currency,
      dateRange: query.dateRange,
      granularity: query.granularity,
      rawTotals,
      series,
      campaigns,
      assets,
    };
  },
};
