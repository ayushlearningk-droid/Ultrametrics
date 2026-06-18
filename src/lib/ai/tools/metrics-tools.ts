/**
 * Ask Ultrametrics — read-only metrics tools (Phase 1).
 *
 * The grounding tool surface. Every handler reads through the Metrics Engine
 * (getMetrics / fetchProviderMetrics) — the ONLY data source — and binds
 * workspaceId from the server-resolved WorkspaceContext, never from model input.
 * Serialization is token-compact, passes provider `status` through verbatim, and
 * omits metrics the capability descriptor doesn't mark as meaningful (so the
 * model never sees a fabricated ratio, e.g. roas for a commerce source).
 *
 * READ-ONLY: no tool here mutates anything. No campaign/budget/write tools exist.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type {
  MetricsProvider,
  MetricsQuery,
  MetricsDateRange,
  MetricsGranularity,
  MetricsLevel,
  MetricSet,
  RawMetricSet,
  DerivedMetrics,
  CampaignBreakdown,
} from "@/lib/metrics/types";
import type { WorkspaceContext } from "@/lib/ai/types";
import type { ProviderMetricsResult } from "@/lib/metrics/engine";
import { getMetricsWithFallback } from "@/lib/metrics/engine";
import { getCapabilities } from "@/lib/metrics/registry";
import { CAPABILITIES } from "@/lib/metrics/capabilities";

/** A read tool handler: model-supplied input + server-bound context → JSON string. */
export type ReadToolHandler = (
  input: Record<string, unknown>,
  ctx: WorkspaceContext
) => Promise<string>;

// Keys actually present on the current (not-yet-generalized) totals shape.
const RAW_KEYS_ON_TOTALS = [
  "spend",
  "revenue",
  "impressions",
  "clicks",
  "conversions",
  "reach",
] as const satisfies readonly (keyof RawMetricSet)[];

const DERIVED_KEYS_ON_TOTALS = [
  "ctr",
  "cpc",
  "cpm",
  "roas",
] as const satisfies readonly (keyof DerivedMetrics)[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function asDate(value: unknown, field: string): string {
  if (typeof value === "string" && ISO_DATE.test(value)) return value;
  throw new Error(`"${field}" must be an ISO date (YYYY-MM-DD)`);
}

function asGranularity(value: unknown): MetricsGranularity {
  return value === "daily" ? "daily" : "total";
}

function asLevel(value: unknown): MetricsLevel | undefined {
  return value === "campaign" || value === "account" ? value : undefined;
}

function asProvider(value: unknown): MetricsProvider {
  if (typeof value === "string" && value in CAPABILITIES) {
    return value as MetricsProvider;
  }
  throw new Error(
    `"provider" must be one of: ${Object.keys(CAPABILITIES).join(", ")}`
  );
}

/** The trailing-180-day window ending at todayISO (inclusive), as ISO dates. */
function last180(todayISO: string): MetricsDateRange {
  const d = new Date(`${todayISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 180);
  return { since: d.toISOString().slice(0, 10), until: todayISO };
}

/**
 * Build a MetricsQuery from model input. When the model supplies both since and
 * until, use them (mode "range"). When dates are omitted, default to the trailing
 * 180 days, total granularity, mode "range" — the engine then falls back to
 * lifetime per-provider when 180 days is empty.
 */
function buildQuery(
  input: Record<string, unknown>,
  todayISO: string
): MetricsQuery {
  const hasDates =
    typeof input.since === "string" &&
    ISO_DATE.test(input.since) &&
    typeof input.until === "string" &&
    ISO_DATE.test(input.until);

  if (hasDates) {
    return {
      dateRange: {
        since: asDate(input.since, "since"),
        until: asDate(input.until, "until"),
      },
      granularity: asGranularity(input.granularity),
      level: asLevel(input.level),
      mode: "range",
    };
  }

  return {
    dateRange: last180(todayISO),
    granularity: "total",
    level: asLevel(input.level),
    mode: "range",
  };
}

/** Compact, capability-gated view of a single MetricSet's totals. */
function serializeTotals(provider: MetricsProvider, set: MetricSet) {
  const cap = getCapabilities(provider);
  const totals = set.totals;

  const raw: Record<string, number> = {};
  for (const key of RAW_KEYS_ON_TOTALS) {
    if (!cap.rawMetrics.includes(key)) continue;
    const v = totals[key];
    if (v !== null && v !== undefined) raw[key] = v;
  }

  const derived: Record<string, number> = {};
  for (const key of DERIVED_KEYS_ON_TOTALS) {
    if (cap.derivedMetrics.includes(key)) derived[key] = totals[key];
  }

  return {
    currency: set.currency,
    dateRange: set.dateRange,
    granularity: set.granularity,
    raw,
    derived,
  };
}

/** Issue #3 V1: cap to the top 15 campaigns by spend. */
const TOP_K_CAMPAIGNS = 15;

/**
 * Serialize a provider's campaign breakdown (Issue #3): sort by spend desc, cap
 * to the top 15, capability-gate the same raw/derived keys as totals, and report
 * how many were omitted. Returns null when there is no breakdown.
 */
function serializeCampaigns(
  provider: MetricsProvider,
  campaigns: CampaignBreakdown[]
) {
  const cap = getCapabilities(provider);
  const sorted = [...campaigns].sort(
    (a, b) => b.totals.spend - a.totals.spend
  );
  const top = sorted.slice(0, TOP_K_CAMPAIGNS);

  const list = top.map((c) => {
    const raw: Record<string, number> = {};
    for (const key of RAW_KEYS_ON_TOTALS) {
      if (!cap.rawMetrics.includes(key)) continue;
      const v = c.totals[key];
      if (v !== null && v !== undefined) raw[key] = v;
    }
    const derived: Record<string, number> = {};
    for (const key of DERIVED_KEYS_ON_TOTALS) {
      if (cap.derivedMetrics.includes(key)) derived[key] = c.totals[key];
    }
    return {
      campaign_id: c.campaignId,
      campaign_name: c.campaignName,
      raw,
      derived,
    };
  });

  return {
    campaigns: list,
    campaigns_omitted: Math.max(0, campaigns.length - top.length),
  };
}

/** Serialize one provider result, preserving status verbatim. */
function serializeProviderResult(r: ProviderMetricsResult) {
  if (r.status !== "ok" || !r.metrics) {
    return {
      provider: r.provider,
      status: r.status,
      window_used: r.windowUsed ?? "range",
      ...(r.error ? { error: r.error } : {}),
    };
  }
  return {
    provider: r.provider,
    status: r.status,
    window_used: r.windowUsed ?? "range",
    ...serializeTotals(r.provider, r.metrics),
    ...(r.metrics.campaigns
      ? serializeCampaigns(r.provider, r.metrics.campaigns)
      : {}),
  };
}

export const metricsToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_workspace_metrics",
    description:
      "Get advertising/commerce metrics for ALL connected sources in the current workspace. Omit since/until to use the default window (last 180 days, with automatic per-source fallback to all-time when 180 days is empty). Returns one entry per source with its status (ok/no_data/unsupported/error), window_used, currency, raw metrics, and derived ratios. Use this for cross-source or 'overall' questions. IMPORTANT: when the user asks about individual campaigns — top/best/worst campaigns, a campaign breakdown, or which campaign has the highest ROAS / lowest CTR / most spend — set level:\"campaign\" so each source also returns a per-campaign list; otherwise you only get account totals and cannot answer campaign questions.",
    input_schema: {
      type: "object",
      properties: {
        since: { type: "string", description: "Optional start date, inclusive (YYYY-MM-DD). Omit for the default window." },
        until: { type: "string", description: "Optional end date, inclusive (YYYY-MM-DD). Omit for the default window." },
        granularity: {
          type: "string",
          enum: ["total", "daily"],
          description: "total = one aggregate; daily = per-day series. Default total.",
        },
        level: {
          type: "string",
          enum: ["account", "campaign"],
          description: "account = workspace/account totals only (default). campaign = also return a per-campaign breakdown. Use \"campaign\" whenever the question is about specific campaigns: top/best/worst campaigns, campaign breakdown, highest-ROAS campaign, lowest-CTR campaign, or which campaign to fund.",
        },
      },
    },
  },
  {
    name: "get_provider_metrics",
    description:
      "Get metrics for ONE specific source (e.g. meta_ads, google_ads). Omit since/until to use the default window (last 180 days, with automatic fallback to all-time when empty). Use when the user asks about a single platform. IMPORTANT: when the user asks about individual campaigns on that platform — top/best/worst campaigns, a campaign breakdown, or which campaign has the highest ROAS / lowest CTR / most spend — set level:\"campaign\" to get the per-campaign list; otherwise only account totals are returned.",
    input_schema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: `The source. One of: ${Object.keys(CAPABILITIES).join(", ")}`,
        },
        since: { type: "string", description: "Optional start date, inclusive (YYYY-MM-DD). Omit for the default window." },
        until: { type: "string", description: "Optional end date, inclusive (YYYY-MM-DD). Omit for the default window." },
        granularity: {
          type: "string",
          enum: ["total", "daily"],
          description: "total = one aggregate; daily = per-day series. Default total.",
        },
        level: {
          type: "string",
          enum: ["account", "campaign"],
          description: "Aggregation level when supported. Use 'campaign' for per-campaign breakdown (top/worst/compare campaigns, campaign ROAS). Default account.",
        },
      },
      required: ["provider"],
    },
  },
  {
    name: "list_connected_providers",
    description:
      "List which data sources are connected to the current workspace and what metrics each can report. Use to answer 'what's connected' or before deciding which source to query.",
    input_schema: { type: "object", properties: {} },
  },
];

export const metricsToolHandlers: Record<string, ReadToolHandler> = {
  async get_workspace_metrics(input, ctx) {
    const query = buildQuery(input, ctx.todayISO);
    const result = await getMetricsWithFallback(ctx.workspaceId, query);
    return JSON.stringify({
      dateRange: result.dateRange,
      granularity: result.granularity,
      providers: result.providers.map(serializeProviderResult),
    });
  },

  async get_provider_metrics(input, ctx) {
    const provider = asProvider(input.provider);
    const query = buildQuery(input, ctx.todayISO);
    // Go through the workspace engine (correct connector resolution + cache +
    // per-provider lifetime fallback), then narrow to the requested provider. A
    // provider with no active connector simply isn't in the result.
    const result = await getMetricsWithFallback(ctx.workspaceId, query);
    const match = result.providers.find((p) => p.provider === provider);
    if (!match) {
      return JSON.stringify({ provider, status: "unsupported" });
    }
    return JSON.stringify(serializeProviderResult(match));
  },

  async list_connected_providers(_input, ctx) {
    return JSON.stringify({
      connected: ctx.connectedProviders.map((p) => {
        const cap = getCapabilities(p);
        return {
          provider: p,
          kind: cap.kind,
          rawMetrics: cap.rawMetrics,
          derivedMetrics: cap.derivedMetrics,
        };
      }),
    });
  },
};
