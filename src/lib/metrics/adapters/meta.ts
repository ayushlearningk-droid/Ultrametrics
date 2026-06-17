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
} from "@/lib/metrics/types";
import { getActiveMetaToken } from "@/lib/meta/token";
import { getAccountMetrics } from "@/lib/meta/insights";
import { sumRaw } from "@/lib/metrics/derive";

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

    const rawRows: RawMetricSet[] = rows.map((r) => ({
      spend: r.spend,
      revenue: r.revenue,
      impressions: r.impressions,
      clicks: r.clicks,
      conversions: r.conversions,
      reach: r.reach,
    }));
    const rawTotals = sumRaw(rawRows);

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
    };
  },
};
