/**
 * Provider capability descriptors (Phase 4).
 *
 * Declares, per provider, WHICH raw metrics are populated and WHICH derived
 * ratios are meaningful — so consumers (dashboard cards, AI serialization,
 * derive.ts) can distinguish "0 because measured" from "absent because not
 * applicable" without per-provider branching.
 *
 * Pure data. No logic, no I/O. The only dependency is the type catalog in
 * types.ts. Descriptors may exist for providers that have NO adapter yet
 * (ga4/shopify/tiktok/amazon/linkedin) — capabilities-first registration lets
 * the UI/AI describe a provider before its fetch path ships; the engine still
 * returns "unsupported" until an adapter is registered.
 *
 * RawMetricSet is NOT yet catalog-keyed (Steps 1–2 named fields remain); these
 * descriptors reference the MetricKey/DerivedKey catalog so the generalization
 * can land later as a separate mechanical step.
 */

import type {
  MetricsProvider,
  MetricKey,
  DerivedKey,
} from "@/lib/metrics/types";

/** Coarse provider family — drives UI grouping and AI comparability hints. */
export type ProviderKind = "ads" | "analytics" | "commerce";

/**
 * What a provider can report. `rawMetrics` / `derivedMetrics` are the source of
 * truth for which fields a consumer should render or compute for this provider.
 */
export interface ProviderCapabilities {
  provider: MetricsProvider;
  kind: ProviderKind;
  /** Raw metrics this provider populates (subset of the MetricKey catalog). */
  rawMetrics: MetricKey[];
  /** Derived ratios meaningful for this provider (computable from rawMetrics). */
  derivedMetrics: DerivedKey[];
  /** Whether daily series granularity is available. */
  supportsDaily: boolean;
  /** Whether MetricsLevel "campaign" is a valid query level. */
  supportsCampaignLevel: boolean;
  /** Whether MetricsLevel "creative" is a valid query level (AI-003). */
  supportsCreativeLevel?: boolean;
  /** Whether account-level ad-attributed funnel event counts are available (AI-007). */
  supportsFunnel?: boolean;
  /** "native" → monetary fields carry a currency; "none" → no monetary data. */
  currency: "native" | "none";
  /** Whether the provider reports in its own account/property timezone. */
  nativeTimezone: boolean;
  /** Documented fetch row cap (truncation signal), or null when unbounded. */
  maxRows: number | null;
}

const META_ADS: ProviderCapabilities = {
  provider: "meta_ads",
  kind: "ads",
  rawMetrics: ["spend", "impressions", "clicks", "conversions", "reach", "revenue"],
  // conversion_rate is in the DerivedKey catalog but is NOT computed by toTotals/
  // derive.ts nor serialized by the metrics tools, so advertising it here caused
  // the model to invent a value when asked. Removed until it is actually derived.
  derivedMetrics: ["ctr", "cpc", "cpm", "roas"],
  supportsDaily: true,
  supportsCampaignLevel: true,
  supportsCreativeLevel: true,
  supportsFunnel: true,
  currency: "native",
  nativeTimezone: true,
  maxRows: 5000,
};

const GOOGLE_ADS: ProviderCapabilities = {
  provider: "google_ads",
  kind: "ads",
  rawMetrics: ["spend", "impressions", "clicks", "conversions", "revenue"],
  // conversion_rate is in the DerivedKey catalog but is NOT computed by toTotals/
  // derive.ts nor serialized by the metrics tools, so advertising it here caused
  // the model to invent a value when asked. Removed until it is actually derived.
  derivedMetrics: ["ctr", "cpc", "cpm", "roas"],
  supportsDaily: true,
  supportsCampaignLevel: true,
  currency: "native",
  nativeTimezone: true,
  maxRows: 2000,
};

const GA4: ProviderCapabilities = {
  provider: "ga4",
  kind: "analytics",
  // sessions/users/engaged_sessions are in the MetricKey catalog but are NOT
  // modeled on RawMetricSet nor serialized by the metrics tools, so advertising
  // them caused the model to invent values. Removed until they are serializable.
  rawMetrics: ["conversions", "revenue"],
  // engagement_rate is declared in the DerivedKey catalog but is NOT computed by
  // derive.ts nor serialized by the metrics tools, so advertising it here caused
  // the model to invent a value when asked. Removed until it is actually derived.
  derivedMetrics: [],
  supportsDaily: true,
  supportsCampaignLevel: false,
  currency: "native",
  nativeTimezone: true,
  maxRows: null,
};

const SHOPIFY: ProviderCapabilities = {
  provider: "shopify",
  kind: "commerce",
  // orders/refunds/sessions (raw) and aov/conversion_rate (derived) are in the
  // catalogs but are NOT modeled on RawMetricSet/computed by toTotals nor
  // serialized by the metrics tools, so advertising them caused the model to
  // invent values. Removed until they are serializable.
  rawMetrics: ["revenue"],
  derivedMetrics: [],
  supportsDaily: true,
  supportsCampaignLevel: false,
  currency: "native",
  nativeTimezone: true,
  maxRows: null,
};

const TIKTOK: ProviderCapabilities = {
  provider: "tiktok",
  kind: "ads",
  // video_views (raw) and conversion_rate (derived) are in the catalogs but are
  // NOT modeled on RawMetricSet/computed by toTotals nor serialized by the
  // metrics tools, so advertising them caused the model to invent values.
  // Removed until they are serializable.
  rawMetrics: ["spend", "impressions", "clicks", "conversions", "reach", "revenue"],
  derivedMetrics: ["ctr", "cpc", "cpm", "roas"],
  supportsDaily: true,
  supportsCampaignLevel: true,
  currency: "native",
  nativeTimezone: true,
  maxRows: null,
};

const AMAZON_ADS: ProviderCapabilities = {
  provider: "amazon_ads",
  kind: "ads",
  rawMetrics: ["spend", "impressions", "clicks", "conversions", "revenue"],
  // acos/conversion_rate are in the DerivedKey catalog but are NOT computed by
  // toTotals nor serialized by the metrics tools, so advertising them caused the
  // model to invent values. Removed until they are serializable.
  derivedMetrics: ["ctr", "cpc", "cpm", "roas"],
  supportsDaily: true,
  supportsCampaignLevel: true,
  currency: "native",
  nativeTimezone: true,
  maxRows: null,
};

const LINKEDIN_ADS: ProviderCapabilities = {
  provider: "linkedin_ads",
  kind: "ads",
  // leads (raw) and conversion_rate (derived) are in the catalogs but are NOT
  // modeled on RawMetricSet/computed by toTotals nor serialized by the metrics
  // tools, so advertising them caused the model to invent values. Removed until
  // they are serializable.
  rawMetrics: ["spend", "impressions", "clicks", "conversions", "revenue"],
  derivedMetrics: ["ctr", "cpc", "cpm", "roas"],
  supportsDaily: true,
  supportsCampaignLevel: true,
  currency: "native",
  nativeTimezone: true,
  maxRows: null,
};

/**
 * Full capability catalog, keyed by provider. Complete for every provider in
 * the MetricsProvider union (descriptor-first; adapters land later).
 */
export const CAPABILITIES: Record<MetricsProvider, ProviderCapabilities> = {
  meta_ads: META_ADS,
  google_ads: GOOGLE_ADS,
  ga4: GA4,
  shopify: SHOPIFY,
  tiktok: TIKTOK,
  amazon_ads: AMAZON_ADS,
  linkedin_ads: LINKEDIN_ADS,
};
