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
  MetricsGranularity,
  MetricsLevel,
  MetricSet,
  RawMetricSet,
  DerivedMetrics,
} from "@/lib/metrics/types";
import type { WorkspaceContext } from "@/lib/ai/types";
import type { ProviderMetricsResult } from "@/lib/metrics/engine";
import { getMetrics } from "@/lib/metrics/engine";
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

function buildQuery(input: Record<string, unknown>): MetricsQuery {
  return {
    dateRange: { since: asDate(input.since, "since"), until: asDate(input.until, "until") },
    granularity: asGranularity(input.granularity),
    level: asLevel(input.level),
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

/** Serialize one provider result, preserving status verbatim. */
function serializeProviderResult(r: ProviderMetricsResult) {
  if (r.status !== "ok" || !r.metrics) {
    return {
      provider: r.provider,
      status: r.status,
      ...(r.error ? { error: r.error } : {}),
    };
  }
  return {
    provider: r.provider,
    status: r.status,
    ...serializeTotals(r.provider, r.metrics),
  };
}

export const metricsToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_workspace_metrics",
    description:
      "Get advertising/commerce metrics for ALL connected sources in the current workspace over a date range. Returns one entry per source with its status (ok/no_data/unsupported/error), currency, raw metrics, and derived ratios. Use this for cross-source or 'overall' questions.",
    input_schema: {
      type: "object",
      properties: {
        since: { type: "string", description: "Start date, inclusive (YYYY-MM-DD)" },
        until: { type: "string", description: "End date, inclusive (YYYY-MM-DD)" },
        granularity: {
          type: "string",
          enum: ["total", "daily"],
          description: "total = one aggregate; daily = per-day series. Default total.",
        },
        level: {
          type: "string",
          enum: ["account", "campaign"],
          description: "Aggregation level when supported. Default account.",
        },
      },
      required: ["since", "until"],
    },
  },
  {
    name: "get_provider_metrics",
    description:
      "Get metrics for ONE specific source (e.g. meta_ads, google_ads) over a date range. Use when the user asks about a single platform.",
    input_schema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: `The source. One of: ${Object.keys(CAPABILITIES).join(", ")}`,
        },
        since: { type: "string", description: "Start date, inclusive (YYYY-MM-DD)" },
        until: { type: "string", description: "End date, inclusive (YYYY-MM-DD)" },
        granularity: {
          type: "string",
          enum: ["total", "daily"],
          description: "total = one aggregate; daily = per-day series. Default total.",
        },
      },
      required: ["provider", "since", "until"],
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
    const query = buildQuery(input);
    const result = await getMetrics(ctx.workspaceId, query);
    return JSON.stringify({
      dateRange: result.dateRange,
      granularity: result.granularity,
      providers: result.providers.map(serializeProviderResult),
    });
  },

  async get_provider_metrics(input, ctx) {
    const provider = asProvider(input.provider);
    const query = buildQuery(input);
    // Go through the workspace engine (correct connector resolution + cache),
    // then narrow to the requested provider. A provider with no active
    // connector simply isn't in the result → report it as not connected.
    const result = await getMetrics(ctx.workspaceId, query);
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
