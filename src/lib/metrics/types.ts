/**
 * Metrics abstraction layer — canonical types (Step 1).
 *
 * Provider-agnostic contracts that sit between connectors and consumers
 * (AI tools, API routes, dashboard cards, sync). NOT yet wired into anything —
 * adapters, registry, and engine are later steps. Pure type definitions plus the
 * adapter interface; no runtime logic and no imports.
 *
 * Design rules encoded here:
 *  - RawMetricSet holds only ADDITIVE quantities (safe to sum across rows).
 *  - DerivedMetrics (ctr/cpc/cpm/roas) are NEVER stored by adapters — they are
 *    computed once, from summed totals, in derive.ts.
 *  - null means "no data" (preserves the no-fabricated-data rule); 0 is a real
 *    measured value.
 */

/** Supported metric providers. New connectors extend this union. */
export type MetricsProvider =
  | "meta_ads"
  | "google_ads"
  | "ga4"
  | "shopify"
  | "tiktok"
  | "amazon_ads"
  | "linkedin_ads";

/**
 * Canonical raw-metric catalog (Phase 4). The superset of additive raw metrics
 * any provider can report. Provider capability descriptors declare which subset
 * they populate (see ProviderCapabilities.rawMetrics in capabilities.ts).
 *
 * Additive by contract: new providers APPEND keys, never repurpose existing
 * ones. RawMetricSet keeps its named ad-centric fields for now (Steps 1–2); the
 * generalization of RawMetricSet to a catalog-keyed shape is a later, separate
 * step — this union exists so capability descriptors can reference it today.
 */
export type MetricKey =
  // Ads (Meta / Google / TikTok / Amazon / LinkedIn)
  | "spend"
  | "impressions"
  | "clicks"
  | "conversions"
  | "reach"
  | "revenue"
  | "video_views"
  | "leads"
  // Analytics (GA4)
  | "sessions"
  | "users"
  | "engaged_sessions"
  // Commerce (Shopify)
  | "orders"
  | "refunds";

/**
 * Canonical derived-metric catalog (Phase 4). Ratios computed centrally in
 * derive.ts from raw totals. A provider only exposes a derived key when its
 * inputs are supported raw metrics (declared in ProviderCapabilities).
 *  - ctr/cpc/cpm/roas: classic ad ratios (already produced by Steps 1–3)
 *  - acos: spend / revenue (Amazon Ads; inverse of roas)
 *  - aov: revenue / orders (commerce)
 *  - conversion_rate: conversions / clicks
 *  - engagement_rate: engaged_sessions / sessions (analytics)
 */
export type DerivedKey =
  | "ctr"
  | "cpc"
  | "cpm"
  | "roas"
  | "acos"
  | "aov"
  | "conversion_rate"
  | "engagement_rate";

/** Time granularity of a metric result. */
export type MetricsGranularity = "total" | "daily";

/**
 * Which time window a fetch targeted (default-range policy, Phase 4+):
 *  - "range"    → an explicit/default bounded window (e.g. the trailing 180 days)
 *  - "lifetime" → all-time (Meta date_preset=maximum; Google a wide BETWEEN)
 *
 * Carried on MetricsQuery as the requested mode, and reported back per provider
 * as `windowUsed` (on ProviderMetricsResult in engine.ts) so consumers can label
 * results and never compare metrics across different windows.
 */
export type MetricsMode = "range" | "lifetime";

/** Aggregation level requested from a provider, when applicable. */
export type MetricsLevel = "account" | "campaign";

/** A closed date range, inclusive, as ISO date strings (YYYY-MM-DD). */
export interface MetricsDateRange {
  since: string;
  until: string;
}

/**
 * Additive, provider-agnostic raw quantities. Every field is safe to sum across
 * rows. Adapters populate this from provider responses (normalizing units, e.g.
 * Google Ads micros → currency). `revenue` is the monetary value of conversions
 * (Meta action_values purchase, Google Ads conversions_value, etc.).
 */
export interface RawMetricSet {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  /** Optional — not every provider reports reach. */
  reach?: number | null;
}

/**
 * Ratio metrics derived from RawMetricSet totals. Computed centrally in
 * derive.ts — adapters must not produce these.
 *  - ctr  = clicks / impressions        (fraction, e.g. 0.015 = 1.5%)
 *  - cpc  = spend / clicks
 *  - cpm  = spend / impressions * 1000
 *  - roas = revenue / spend
 */
export interface DerivedMetrics {
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
}

/** Raw totals plus the metrics derived from them. */
export type MetricTotals = RawMetricSet & DerivedMetrics;

/** A single dated row of raw metrics (used for granularity = "daily"). */
export interface MetricSeriesPoint extends RawMetricSet {
  /** ISO date (YYYY-MM-DD) for this point. */
  date: string;
}

/**
 * The canonical result returned by the engine for one provider (or blended).
 * `currency` is the ISO code the monetary fields are expressed in. `series` is
 * present only for daily granularity.
 */
export interface MetricSet {
  provider: MetricsProvider;
  currency: string;
  dateRange: MetricsDateRange;
  granularity: MetricsGranularity;
  totals: MetricTotals;
  series?: MetricSeriesPoint[];
}

/** Query parameters for a metrics fetch. */
export interface MetricsQuery {
  dateRange: MetricsDateRange;
  granularity: MetricsGranularity;
  level?: MetricsLevel;
  /**
   * Time-window mode. Defaults to "range" (the bounded dateRange) when omitted;
   * "lifetime" requests all-time and ignores dateRange at the adapter level.
   */
  mode?: MetricsMode;
}

/**
 * Raw, un-derived result returned by a connector adapter (Step 2). Adapters
 * normalize a provider response into additive raw fields + currency only — they
 * do NOT compute ctr/cpc/cpm/roas. The engine (Step 3) turns this into a full
 * MetricSet via derive.ts. `rawTotals` is authoritative for totals; `series`
 * (daily only) carries per-day raw rows.
 */
export interface RawMetricResult {
  provider: MetricsProvider;
  currency: string;
  dateRange: MetricsDateRange;
  granularity: MetricsGranularity;
  rawTotals: RawMetricSet;
  series?: MetricSeriesPoint[];
}

/**
 * Contract every connector adapter implements (Step 2). The adapter normalizes
 * a provider's response into raw, additive fields + currency; the engine derives
 * ratios. Returns null when the connector has no data / is not connected.
 */
export interface ConnectorMetricsAdapter {
  readonly provider: MetricsProvider;
  fetch(
    workspaceId: string,
    connectorId: string,
    query: MetricsQuery
  ): Promise<RawMetricResult | null>;
}
