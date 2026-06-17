/**
 * Metrics adapter registry (Step 3).
 *
 * Static, provider-agnostic lookup mapping MetricsProvider → the connector
 * adapter that knows how to fetch raw metrics for it. Pure: no I/O, no runtime
 * logic beyond map access. The map is PARTIAL — providers in the MetricsProvider
 * union without an adapter (ga4/shopify/tiktok today) simply have no entry, and
 * callers must treat a missing adapter as "unsupported" rather than an error.
 *
 * NOT yet wired into any route/engine consumer — the engine (same step) reads
 * this, but nothing outside the metrics layer imports it.
 */

import type {
  ConnectorMetricsAdapter,
  MetricsProvider,
} from "@/lib/metrics/types";
import {
  CAPABILITIES,
  type ProviderCapabilities,
} from "@/lib/metrics/capabilities";
import { metaMetricsAdapter } from "@/lib/metrics/adapters/meta";
import { googleAdsMetricsAdapter } from "@/lib/metrics/adapters/google-ads";

/**
 * Provider → adapter map. Partial by design: only providers with a shipped
 * adapter (a live fetch path) appear here. Extend as new connectors land
 * (ga4, shopify, tiktok, amazon_ads, linkedin_ads).
 *
 * Capabilities are tracked SEPARATELY (see getCapabilities) and exist for every
 * provider, adapter or not — capabilities-first registration lets the UI/AI
 * describe a provider before its adapter ships.
 */
const ADAPTERS: Partial<Record<MetricsProvider, ConnectorMetricsAdapter>> = {
  meta_ads: metaMetricsAdapter,
  google_ads: googleAdsMetricsAdapter,
};

/** Resolve the adapter for a provider, or null when none is registered. */
export function getAdapter(
  provider: MetricsProvider
): ConnectorMetricsAdapter | null {
  return ADAPTERS[provider] ?? null;
}

/** Whether a provider has a registered adapter. */
export function hasAdapter(provider: MetricsProvider): boolean {
  return getAdapter(provider) !== null;
}

/** The providers that currently have a registered adapter. */
export function supportedProviders(): MetricsProvider[] {
  return Object.keys(ADAPTERS) as MetricsProvider[];
}

/**
 * Capability descriptor for a provider. Always available (descriptor-first):
 * returns capabilities even for providers without a registered adapter, so
 * consumers can render/describe a provider before its fetch path exists.
 */
export function getCapabilities(
  provider: MetricsProvider
): ProviderCapabilities {
  return CAPABILITIES[provider];
}
