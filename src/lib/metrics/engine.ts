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
  MetricsDateRange,
  MetricsGranularity,
  MetricSet,
  RawMetricResult,
} from "@/lib/metrics/types";
import { toTotals } from "@/lib/metrics/derive";
import { getAdapter } from "@/lib/metrics/registry";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";

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
 * through unchanged — it already carries raw MetricSeriesPoint rows.
 */
function toMetricSet(raw: RawMetricResult): MetricSet {
  return {
    provider: raw.provider,
    currency: raw.currency,
    dateRange: raw.dateRange,
    granularity: raw.granularity,
    totals: toTotals(raw.rawTotals),
    series: raw.series,
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
  const adapter = getAdapter(provider);
  if (!adapter) {
    return { provider, connectorId, status: "unsupported", metrics: null };
  }

  try {
    const raw = await adapter.fetch(workspaceId, connectorId, query);
    if (!raw) {
      return { provider, connectorId, status: "no_data", metrics: null };
    }
    return {
      provider,
      connectorId,
      status: "ok",
      metrics: toMetricSet(raw),
    };
  } catch (err) {
    return {
      provider,
      connectorId,
      status: "error",
      metrics: null,
      error: err instanceof Error ? err.message : String(err),
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
  // otherwise double-count the same account).
  const byProvider = new Map<MetricsProvider, string>();
  for (const c of connectors) {
    if (c.status !== "active") continue;
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
