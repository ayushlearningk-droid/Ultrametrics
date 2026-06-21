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
  CreativeRawBreakdown,
  CreativeType,
  FunnelEvents,
} from "@/lib/metrics/types";
import type { MetaMetricsRow, ResolvedAdCreative } from "@/lib/meta/insights";
import { getActiveMetaToken } from "@/lib/meta/token";
import { getAccountMetrics, getAdCreatives } from "@/lib/meta/insights";
import { sumRaw } from "@/lib/metrics/derive";

/**
 * Account-level funnel totals (AI-007): sum the per-row ad-attributed event
 * counts across all returned rows. Account-level only — not per entity.
 */
function sumFunnel(rows: MetaMetricsRow[]): FunnelEvents {
  return rows.reduce<FunnelEvents>(
    (acc, r) => ({
      viewContent: acc.viewContent + r.viewContent,
      addToCart: acc.addToCart + r.addToCart,
      initiateCheckout: acc.initiateCheckout + r.initiateCheckout,
      purchase: acc.purchase + r.purchaseEvents,
      pageView: acc.pageView + r.pageView,
    }),
    { viewContent: 0, addToCart: 0, initiateCheckout: 0, purchase: 0, pageView: 0 }
  );
}

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
  const byId = new Map<
    string,
    {
      name: string;
      objective?: string;
      rows: RawMetricSet[];
      postEngagement: number;
      pageEngagement: number;
      linkClicks: number;
    }
  >();
  for (const r of rows) {
    if (!r.campaign_id) continue;
    const entry = byId.get(r.campaign_id) ?? {
      name: r.campaign_name ?? r.campaign_id,
      objective: r.objective,
      rows: [],
      postEngagement: 0,
      pageEngagement: 0,
      linkClicks: 0,
    };
    // First non-empty objective wins (campaign objective is constant per id).
    if (!entry.objective && r.objective) entry.objective = r.objective;
    entry.rows.push(toRaw(r));
    entry.postEngagement += r.postEngagement;
    entry.pageEngagement += r.pageEngagement;
    entry.linkClicks += r.linkClicks;
    byId.set(r.campaign_id, entry);
  }
  return [...byId.entries()].map(
    ([
      campaignId,
      { name, objective, rows: campaignRows, postEngagement, pageEngagement, linkClicks },
    ]) => ({
      campaignId,
      campaignName: name,
      ...(objective ? { objective } : {}),
      rawTotals: sumRaw(campaignRows),
      engagement: { postEngagement, pageEngagement, linkClicks },
    })
  );
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

/**
 * Map Meta's creative type signals onto the canonical CreativeType (AI-003).
 * Best-effort: a video_id (or VIDEO object_type) → "video", an image_url (or
 * PHOTO) → "image", text-only stories → "text"; anything unresolved → "other".
 */
function creativeTypeFrom(creative: ResolvedAdCreative): CreativeType {
  const ot = creative.objectType?.toUpperCase();
  if (creative.videoId || ot === "VIDEO") return "video";
  if (creative.imageUrl || ot === "PHOTO" || ot === "SHARE") return "image";
  if (ot === "STATUS" || ot === "TEXT") return "text";
  return "other";
}

/**
 * Group ad-level rows into per-creative raw totals (AI-003). Ads are mapped to
 * their creative via the resolved side-map; ads sharing a creative collapse into
 * one entry. Rows whose ad has no resolvable creative are bucketed under the
 * ad_id with type "other" so no spend is dropped. Rows lacking an ad_id are
 * skipped. Top-K selection happens later in serialization.
 */
function groupByCreative(
  rows: MetaMetricsRow[],
  creatives: Map<string, ResolvedAdCreative>
): CreativeRawBreakdown[] {
  const byId = new Map<
    string,
    {
      name: string;
      type: CreativeType;
      thumbnailUrl?: string;
      rows: RawMetricSet[];
    }
  >();

  for (const r of rows) {
    if (!r.ad_id) continue;
    const resolved = creatives.get(r.ad_id);
    const creativeId = resolved?.creativeId ?? r.ad_id;
    const entry = byId.get(creativeId) ?? {
      name: resolved?.creativeName ?? r.ad_name ?? creativeId,
      type: resolved ? creativeTypeFrom(resolved) : "other",
      thumbnailUrl: resolved?.thumbnailUrl,
      rows: [],
    };
    entry.rows.push(toRaw(r));
    byId.set(creativeId, entry);
  }

  return [...byId.entries()].map(
    ([creativeId, { name, type, thumbnailUrl, rows: creativeRows }]) => ({
      creativeId,
      creativeName: name,
      creativeType: type,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
      rawTotals: sumRaw(creativeRows),
    })
  );
}

export const metaMetricsAdapter: ConnectorMetricsAdapter = {
  provider: "meta_ads",

  // connectorId is unused: the Meta token (and currency) resolve from the
  // workspace's active connector via getActiveMetaToken.
  async fetch(workspaceId, _connectorId, query): Promise<RawMetricResult | null> {
    const token = await getActiveMetaToken(workspaceId);
    if (token.status !== "ok") return null;

    // AI-003: creative breakdown is built from ad-level insights (Meta has no
    // "creative" insights level), then ads are mapped to creatives via a side
    // call. All other levels pass through unchanged.
    const insightsLevel =
      query.level === "creative" ? "ad" : query.level;

    const rows = await getAccountMetrics(token.accessToken, token.accountId, {
      since: query.dateRange.since,
      until: query.dateRange.until,
      granularity: query.granularity,
      level: insightsLevel,
    });
    if (rows.length === 0) return null;

    const rawRows: RawMetricSet[] = rows.map(toRaw);
    const rawTotals = sumRaw(rawRows);

    // Issue #3 / AI-002: per-campaign or per-ad breakdown only when fetched at
    // that level. Account rawTotals above is unchanged (still the full sum).
    const campaigns =
      query.level === "campaign" ? groupByCampaign(rows) : undefined;
    const assets = query.level === "ad" ? groupByAsset(rows) : undefined;

    // AI-003: resolve ad → creative and group, only at level "creative".
    let creatives: CreativeRawBreakdown[] | undefined;
    if (query.level === "creative") {
      const adIds = rows.map((r) => r.ad_id).filter((id): id is string => !!id);
      const resolved = await getAdCreatives(token.accessToken, adIds);
      creatives = groupByCreative(rows, resolved);
    }

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
      creatives,
      // AI-007: account-level ad-attributed funnel counts (sum of all rows).
      funnel: sumFunnel(rows),
    };
  },
};
