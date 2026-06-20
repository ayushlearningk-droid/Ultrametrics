/**
 * Metrics engine (Step 3).
 *
 * Orchestrates the metrics layer: resolves a workspace's active connectors,
 * runs each provider's adapter in isolation, and turns the raw adapter output
 * (RawMetricResult) into a derived MetricSet via derive.ts. This is the single
 * place ratios (ctr/cpc/cpm/roas) are attached — adapters never derive.
 *
 * Step 3 scope (option c): per-provider results only. No blended/cross-provider
 * aggregation yet (currencies may differ; deferred to a later step).
 *
 * Failure isolation: one connector failing (network/API throw) or returning no
 * data must not abort the others. Per-connector outcomes are captured as a
 * status, never propagated as a thrown error from fetchWorkspaceMetrics.
 *
 * NOT yet wired into any route or UI — additive and currently unused outside
 * the metrics layer.
 */

import type {
  MetricsProvider,
  MetricsQuery,
  MetricsMode,
  MetricsDateRange,
  MetricsGranularity,
  MetricSet,
  RawMetricResult,
} from "@/lib/metrics/types";
import { toTotals } from "@/lib/metrics/derive";
import { getAdapter } from "@/lib/metrics/registry";
import { CAPABILITIES } from "@/lib/metrics/capabilities";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { getCached, setCached } from "@/lib/metrics/cache";

/** Outcome of fetching metrics for a single connector. */
export interface ProviderMetricsResult {
  provider: MetricsProvider;
  connectorId: string;
  /**
   *  - "ok"          → metrics present
   *  - "no_data"     → adapter returned null (not connected / empty)
   *  - "unsupported" → no adapter registered for this provider
   *  - "error"       → adapter threw (network/API/config); see `error`
   */
  status: "ok" | "no_data" | "unsupported" | "error";
  /** Present only when status === "ok". */
  metrics: MetricSet | null;
  /** Present only when status === "error". */
  error?: string;
  /** Which time window produced this result ("range" default, or "lifetime"). */
  windowUsed?: MetricsMode;
}

/** Per-provider workspace metrics (no blended aggregate in Step 3). */
export interface WorkspaceMetrics {
  dateRange: MetricsDateRange;
  granularity: MetricsGranularity;
  providers: ProviderMetricsResult[];
}

/**
 * Turn an adapter's raw result into a derived MetricSet. Totals come from
 * deriving ratios off the summed raw totals; `series` (daily only) passes
 * through unchanged — it already carries raw MetricSeriesPoint rows. When the
 * adapter supplied a per-campaign breakdown (Issue #3), each campaign's raw
 * totals are derived through the SAME toTotals() — no new calculations. The
 * per-creative breakdown (AI-003) is forwarded the same way, carrying creative
 * identity/type/thumbnail through unchanged.
 */
function toMetricSet(raw: RawMetricResult): MetricSet {
  return {
    provider: raw.provider,
    currency: raw.currency,
    dateRange: raw.dateRange,
    granularity: raw.granularity,
    totals: toTotals(raw.rawTotals),
    series: raw.series,
    campaigns: raw.campaigns?.map((c) => ({
      campaignId: c.campaignId,
      campaignName: c.campaignName,
      ...(c.objective ? { objective: c.objective } : {}),
      totals: toTotals(c.rawTotals),
    })),
    assets: raw.assets?.map((a) => ({
      assetId: a.assetId,
      assetName: a.assetName,
      totals: toTotals(a.rawTotals),
    })),
    creatives: raw.creatives?.map((c) => ({
      creativeId: c.creativeId,
      creativeName: c.creativeName,
      creativeType: c.creativeType,
      ...(c.thumbnailUrl ? { thumbnailUrl: c.thumbnailUrl } : {}),
      totals: toTotals(c.rawTotals),
    })),
    // AI-007: funnel counts are raw — passed through, never derived.
    funnel: raw.funnel,
  };
}

/**
 * Fetch + derive metrics for one connector. Never throws: adapter errors are
 * captured into the returned result's status/error fields.
 */
export async function fetchProviderMetrics(
  workspaceId: string,
  connectorId: string,
  provider: MetricsProvider,
  query: MetricsQuery
): Promise<ProviderMetricsResult> {
  const windowUsed: MetricsMode = query.mode ?? "range";
  const adapter = getAdapter(provider);
  if (!adapter) {
    return { provider, connectorId, status: "unsupported", metrics: null, windowUsed };
  }

  try {
    const raw = await adapter.fetch(workspaceId, connectorId, query);
    if (!raw) {
      return { provider, connectorId, status: "no_data", metrics: null, windowUsed };
    }
    return {
      provider,
      connectorId,
      status: "ok",
      metrics: toMetricSet(raw),
      windowUsed,
    };
  } catch (err) {
    return {
      provider,
      connectorId,
      status: "error",
      metrics: null,
      error: err instanceof Error ? err.message : String(err),
      windowUsed,
    };
  }
}

/**
 * Fan out across a workspace's active connectors (one per provider) and return
 * per-provider results. Connectors run concurrently with allSettled isolation
 * so a single failure can't abort the batch.
 */
export async function fetchWorkspaceMetrics(
  workspaceId: string,
  query: MetricsQuery
): Promise<WorkspaceMetrics> {
  const connectors = await getConnectorsByWorkspace(workspaceId);

  // Active connectors only, deduped to one per provider (adapters such as Meta
  // resolve the active connector internally; multiple active rows would
  // otherwise double-count the same account). Connectors whose provider has no
  // CAPABILITIES entry (AI-014: e.g. a Google Sheets connector, provider
  // "google") are skipped so they never enter the metrics pipeline.
  const byProvider = new Map<MetricsProvider, string>();
  for (const c of connectors) {
    if (c.status !== "active") continue;
    if (!(c.provider in CAPABILITIES)) continue;
    const provider = c.provider as MetricsProvider;
    if (!byProvider.has(provider)) byProvider.set(provider, c.id);
  }

  const settled = await Promise.allSettled(
    [...byProvider.entries()].map(([provider, connectorId]) =>
      fetchProviderMetrics(workspaceId, connectorId, provider, query)
    )
  );

  // fetchProviderMetrics never rejects, but guard anyway: a rejected settle is
  // surfaced as an "error" result rather than dropped.
  const providers: ProviderMetricsResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    const [provider, connectorId] = [...byProvider.entries()][i];
    return {
      provider,
      connectorId,
      status: "error",
      metrics: null,
      error:
        s.reason instanceof Error ? s.reason.message : String(s.reason),
    };
  });

  return {
    dateRange: query.dateRange,
    granularity: query.granularity,
    providers,
  };
}

/**
 * Canonical, cached entry point (Phase 4). The single symbol consumers
 * (dashboard, AI tools, reports) should import. Wraps fetchWorkspaceMetrics with
 * the workspace+query-scoped 5-minute cache.
 *
 * Caching policy: only fully-successful results are cached. If ANY provider
 * returned status "error", the result is returned but NOT stored — transient
 * upstream failures (e.g. 429) must not be pinned for the TTL. no_data and
 * unsupported are stable outcomes and are cached normally.
 *
 * MUST be called only AFTER the caller's RBAC gate — the cache is keyed by
 * workspaceId and performs no authorization itself.
 */
export async function getMetrics(
  workspaceId: string,
  query: MetricsQuery
): Promise<WorkspaceMetrics> {
  const cached = getCached(workspaceId, query);
  if (cached) return cached;

  const result = await fetchWorkspaceMetrics(workspaceId, query);

  const hasError = result.providers.some((p) => p.status === "error");
  if (!hasError) setCached(workspaceId, query, result);

  return result;
}

/**
 * Default-range fetch with per-provider lifetime fallback (Phase 4+).
 *
 * Runs the requested (range) query via getMetrics, then — for each provider that
 * came back "no_data" — retries that ONE provider in "lifetime" mode. If the
 * lifetime retry is "ok" it replaces the result; otherwise the original no_data
 * is kept. Providers that already had data, errored, or are unsupported are left
 * untouched. Each result carries windowUsed so consumers can label the window.
 *
 * The base (range) pass is cached by getMetrics; the per-provider lifetime
 * retries are uncached (they only fire on the empty-data path).
 */
export async function getMetricsWithFallback(
  workspaceId: string,
  query: MetricsQuery
): Promise<WorkspaceMetrics> {
  const base = await getMetrics(workspaceId, query);

  const providers = await Promise.all(
    base.providers.map(async (p) => {
      if (p.status !== "no_data") return p;

      const lifetime = await fetchProviderMetrics(
        workspaceId,
        p.connectorId,
        p.provider,
        { ...query, mode: "lifetime" }
      );
      return lifetime.status === "ok" ? lifetime : p;
    })
  );

  return {
    dateRange: base.dateRange,
    granularity: base.granularity,
    providers,
  };
}
