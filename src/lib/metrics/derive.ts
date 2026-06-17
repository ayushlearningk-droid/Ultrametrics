/**
 * Metrics abstraction layer — derivation (Step 1).
 *
 * The single source of truth for ratio metrics. Pure functions, no imports
 * beyond local types, no I/O. NOT yet wired into anything.
 *
 * Invariants:
 *  - Ratios are computed from SUMMED totals, never averaged across rows
 *    (averaging ratios like CTR/CPC is mathematically wrong).
 *  - Divide-by-zero yields 0, never NaN/Infinity.
 *  - emptyRaw() / sumRaw() treat missing data as 0 for aggregation; callers
 *    decide whether a connector had "no data" before calling (null vs zeros).
 */

import type {
  RawMetricSet,
  DerivedMetrics,
  DerivedKey,
  MetricTotals,
  MetricSeriesPoint,
} from "@/lib/metrics/types";
import type { ProviderCapabilities } from "@/lib/metrics/capabilities";

/** A zeroed raw metric set — the identity for summation. */
export function emptyRaw(): RawMetricSet {
  return {
    spend: 0,
    revenue: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    reach: 0,
  };
}

/** Safe division: returns 0 when the denominator is 0 or non-finite. */
function safeDiv(numerator: number, denominator: number): number {
  if (!denominator || !Number.isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

/** Sum any number of raw metric sets into one additive total. */
export function sumRaw(rows: RawMetricSet[]): RawMetricSet {
  return rows.reduce<RawMetricSet>((acc, r) => {
    acc.spend += r.spend;
    acc.revenue += r.revenue;
    acc.impressions += r.impressions;
    acc.clicks += r.clicks;
    acc.conversions += r.conversions;
    acc.reach = (acc.reach ?? 0) + (r.reach ?? 0);
    return acc;
  }, emptyRaw());
}

/**
 * Derive ratio metrics from a single raw total.
 *  - ctr  = clicks / impressions   (fraction; multiply by 100 for percent)
 *  - cpc  = spend / clicks
 *  - cpm  = spend / impressions * 1000
 *  - roas = revenue / spend
 */
export function deriveMetrics(raw: RawMetricSet): DerivedMetrics {
  return {
    ctr: safeDiv(raw.clicks, raw.impressions),
    cpc: safeDiv(raw.spend, raw.clicks),
    cpm: safeDiv(raw.spend, raw.impressions) * 1000,
    roas: safeDiv(raw.revenue, raw.spend),
  };
}

/** Combine a raw total with its derived ratios. */
export function toTotals(raw: RawMetricSet): MetricTotals {
  return { ...raw, ...deriveMetrics(raw) };
}

/**
 * Descriptor-aware derivation (Phase 4). Computes ONLY the derived ratios a
 * provider's capabilities declare, and only those whose raw inputs are present
 * on the current (not-yet-generalized) RawMetricSet. Keys whose inputs are not
 * yet modeled on RawMetricSet (e.g. aov needs `orders`, engagement_rate needs
 * `engaged_sessions`/`sessions`) are OMITTED rather than fabricated as 0 — they
 * become computable once RawMetricSet is generalized to the MetricKey catalog.
 *
 * Returns a partial map: absence means "not applicable / not yet derivable",
 * distinct from a present 0 (a real measured ratio). Does NOT replace
 * deriveMetrics/toTotals — those preserve the Step 1–3 MetricTotals contract.
 */
export function deriveByCapability(
  raw: RawMetricSet,
  capabilities: ProviderCapabilities
): Partial<Record<DerivedKey, number>> {
  // Inputs available on the current RawMetricSet shape. Keys requiring raw
  // metrics not yet on RawMetricSet are intentionally absent here.
  const computable: Partial<Record<DerivedKey, number>> = {
    ctr: safeDiv(raw.clicks, raw.impressions),
    cpc: safeDiv(raw.spend, raw.clicks),
    cpm: safeDiv(raw.spend, raw.impressions) * 1000,
    roas: safeDiv(raw.revenue, raw.spend),
    acos: safeDiv(raw.spend, raw.revenue),
    conversion_rate: safeDiv(raw.conversions, raw.clicks),
  };

  const out: Partial<Record<DerivedKey, number>> = {};
  for (const key of capabilities.derivedMetrics) {
    if (key in computable) out[key] = computable[key];
  }
  return out;
}

/**
 * Aggregate raw rows into totals + derived ratios in one step. Ratios are
 * derived from the SUMMED raw values, not per-row then averaged.
 */
export function aggregate(rows: RawMetricSet[]): MetricTotals {
  return toTotals(sumRaw(rows));
}

/** Sum the raw portion of a daily series into totals + derived ratios. */
export function totalsFromSeries(series: MetricSeriesPoint[]): MetricTotals {
  return aggregate(
    series.map((p) => ({
      spend: p.spend,
      revenue: p.revenue,
      impressions: p.impressions,
      clicks: p.clicks,
      conversions: p.conversions,
      reach: p.reach ?? 0,
    }))
  );
}
