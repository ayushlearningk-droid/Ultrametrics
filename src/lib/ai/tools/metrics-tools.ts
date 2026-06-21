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
  MetricTotals,
  RawMetricSet,
  DerivedMetrics,
  CampaignBreakdown,
  AssetBreakdown,
  CreativeBreakdown,
  CreativeType,
} from "@/lib/metrics/types";
import type { WorkspaceContext } from "@/lib/ai/types";
import type { ProviderMetricsResult } from "@/lib/metrics/engine";
import { getMetricsWithFallback } from "@/lib/metrics/engine";
import { getCapabilities } from "@/lib/metrics/registry";
import { CAPABILITIES } from "@/lib/metrics/capabilities";
import { MIN_IMPRESSIONS, MIN_SPEND, MIN_CLICKS } from "@/lib/ai/thresholds";
import {
  deriveRecommendations,
  type Recommendation,
} from "@/lib/ai/recommendations";
import {
  deriveFunnelDiagnosis,
  type FunnelDiagnosis,
} from "@/lib/ai/funnel-intelligence";
import {
  derivePixelDiagnostics,
  type PixelDiagnosis,
} from "@/lib/ai/pixel-diagnostics";
import {
  composeExecutiveSummary,
  type SummaryHeadline,
} from "@/lib/ai/executive-summary";
import {
  deriveBudgetRecommendations,
  type BudgetRecommendation,
} from "@/lib/ai/budget-recommendations";
import { hasConversionObjective } from "@/lib/ai/objective-classifier";
import { deriveTrafficDiagnostics } from "@/lib/ai/traffic-diagnostics";
import { deriveEngagementDiagnostics } from "@/lib/ai/engagement-diagnostics";

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
  return value === "campaign" ||
    value === "account" ||
    value === "ad" ||
    value === "creative"
    ? value
    : undefined;
}

const CREATIVE_TYPES: readonly CreativeType[] = [
  "image",
  "video",
  "carousel",
  "text",
  "other",
];

/** Validate an optional creative-type filter; undefined = no filter. */
function asCreativeType(value: unknown): CreativeType | undefined {
  return typeof value === "string" &&
    (CREATIVE_TYPES as readonly string[]).includes(value)
    ? (value as CreativeType)
    : undefined;
}

/**
 * AI-004A — ranking primitives (Step 1A: types + parsers only).
 *
 * SortKey is constrained to keys present on MetricTotals so a comparator can
 * index totals[sortBy] soundly. Order is the sort direction. These are wired
 * into the serializers as optional params whose defaults ("spend"/"desc")
 * reproduce the previous spend-descending behavior byte-for-byte — no schema,
 * thresholds, or filtering in this step.
 */
type SortKey =
  | "spend"
  | "ctr"
  | "roas"
  | "cpc"
  | "conversions"
  | "revenue"
  | "impressions"
  | "clicks";

type Order = "asc" | "desc";

const SORT_KEYS: readonly SortKey[] = [
  "spend",
  "ctr",
  "roas",
  "cpc",
  "conversions",
  "revenue",
  "impressions",
  "clicks",
];

/** Validate a model-supplied sort key; default to "spend". */
function asSortKey(value: unknown): SortKey {
  return typeof value === "string" && (SORT_KEYS as readonly string[]).includes(value)
    ? (value as SortKey)
    : "spend";
}

/** Validate a model-supplied sort order; default to "desc". */
function asOrder(value: unknown): Order {
  return value === "asc" ? "asc" : "desc";
}

/**
 * Comparator over MetricTotals by `sortBy`/`order`. With the defaults
 * ("spend", "desc") this is exactly `b.totals.spend - a.totals.spend`,
 * preserving the prior sort byte-for-byte.
 */
function compareByKey(
  a: MetricTotals,
  b: MetricTotals,
  sortBy: SortKey,
  order: Order
): number {
  const av = a[sortBy];
  const bv = b[sortBy];
  return order === "asc" ? av - bv : bv - av;
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

/**
 * AI-004A Step 1C — ratio qualification floors.
 *
 * When ranking by a ratio (ctr/roas/cpc), entities below a minimum volume on
 * the ratio's denominator/basis are excluded BEFORE sort+slice, so a 2-click /
 * 12-impression entity can't win "highest CTR". Non-ratio sorts are not
 * filtered (output stays byte-identical). If every entity is below the floor,
 * we fall back to the full unfiltered list so an answer is never suppressed.
 *
 * Floors (MIN_IMPRESSIONS / MIN_SPEND / MIN_CLICKS) come from the shared
 * thresholds module so ranking and the recommendation engine stay in sync.
 */
const RATIO_QUALIFICATION: Partial<
  Record<SortKey, { field: keyof MetricTotals; threshold: number }>
> = {
  ctr: { field: "impressions", threshold: MIN_IMPRESSIONS },
  roas: { field: "spend", threshold: MIN_SPEND },
  cpc: { field: "clicks", threshold: MIN_CLICKS },
};

/** Additive metadata describing whether/how a qualification floor was applied. */
interface QualificationMeta {
  applied: boolean;
  metric?: SortKey;
  field?: string;
  threshold?: number;
  qualified_count?: number;
  fell_back?: boolean;
}

/**
 * Apply the ratio qualification floor for `sortBy`. Returns the population to
 * rank from (`base`) plus metadata. For non-ratio sorts, `base` is the input
 * unchanged and `applied` is false. When the floor empties the list, `base`
 * falls back to the full input and `fell_back` is true.
 */
function qualify<T extends { totals: MetricTotals }>(
  items: T[],
  sortBy: SortKey
): { base: T[]; meta: QualificationMeta } {
  const rule = RATIO_QUALIFICATION[sortBy];
  if (!rule) return { base: items, meta: { applied: false } };

  const qualified = items.filter((it) => {
    const v = it.totals[rule.field];
    return typeof v === "number" && v >= rule.threshold;
  });

  if (qualified.length === 0) {
    return {
      base: items,
      meta: {
        applied: true,
        metric: sortBy,
        field: rule.field,
        threshold: rule.threshold,
        qualified_count: 0,
        fell_back: true,
      },
    };
  }

  return {
    base: qualified,
    meta: {
      applied: true,
      metric: sortBy,
      field: rule.field,
      threshold: rule.threshold,
      qualified_count: qualified.length,
      fell_back: false,
    },
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
  campaigns: CampaignBreakdown[],
  sortBy: SortKey = "spend",
  order: Order = "desc"
) {
  const cap = getCapabilities(provider);
  const { base, meta } = qualify(campaigns, sortBy);
  const sorted = [...base].sort((a, b) =>
    compareByKey(a.totals, b.totals, sortBy, order)
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
    campaigns_omitted: Math.max(0, base.length - top.length),
    ...(meta.applied ? { qualification: meta } : {}),
  };
}

/** AI-002 V1: cap to the top 10 ads by spend. */
const TOP_K_ASSETS = 10;

/**
 * Serialize a provider's ad (asset) breakdown (AI-002): sort by spend desc, cap
 * to the top 10, capability-gate the same raw/derived keys as totals, and report
 * how many were omitted. Returns null-equivalent empty when there is no breakdown.
 */
function serializeAssets(
  provider: MetricsProvider,
  assets: AssetBreakdown[],
  sortBy: SortKey = "spend",
  order: Order = "desc"
) {
  const cap = getCapabilities(provider);
  const { base, meta } = qualify(assets, sortBy);
  const sorted = [...base].sort((a, b) =>
    compareByKey(a.totals, b.totals, sortBy, order)
  );
  const top = sorted.slice(0, TOP_K_ASSETS);

  const list = top.map((a) => {
    const raw: Record<string, number> = {};
    for (const key of RAW_KEYS_ON_TOTALS) {
      if (!cap.rawMetrics.includes(key)) continue;
      const v = a.totals[key];
      if (v !== null && v !== undefined) raw[key] = v;
    }
    const derived: Record<string, number> = {};
    for (const key of DERIVED_KEYS_ON_TOTALS) {
      if (cap.derivedMetrics.includes(key)) derived[key] = a.totals[key];
    }
    return {
      ad_id: a.assetId,
      ad_name: a.assetName,
      raw,
      derived,
    };
  });

  return {
    assets: list,
    assets_omitted: Math.max(0, base.length - top.length),
    ...(meta.applied ? { qualification: meta } : {}),
  };
}

/** AI-003 V1: cap to the top 10 creatives. */
const TOP_K_CREATIVES = 10;

/**
 * Serialize a provider's creative breakdown (AI-003). Optionally filters to one
 * creative_type FIRST (so "best video" ranks only videos), then reuses the
 * AI-004A pipeline: ratio qualification, sort by sort_by/order, cap to the top
 * 10, capability-gate the same raw/derived keys. thumbnail_url is intentionally
 * NOT serialized in this step. Meta-only in practice (only Meta populates a
 * creative breakdown).
 */
function serializeCreatives(
  provider: MetricsProvider,
  creatives: CreativeBreakdown[],
  sortBy: SortKey = "spend",
  order: Order = "desc",
  creativeType?: CreativeType
) {
  const cap = getCapabilities(provider);
  const filtered = creativeType
    ? creatives.filter((c) => c.creativeType === creativeType)
    : creatives;
  const { base, meta } = qualify(filtered, sortBy);
  const sorted = [...base].sort((a, b) =>
    compareByKey(a.totals, b.totals, sortBy, order)
  );
  const top = sorted.slice(0, TOP_K_CREATIVES);

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
      creative_id: c.creativeId,
      creative_name: c.creativeName,
      creative_type: c.creativeType,
      raw,
      derived,
    };
  });

  return {
    creatives: list,
    creatives_omitted: Math.max(0, base.length - top.length),
    ...(creativeType ? { creative_type_filter: creativeType } : {}),
    ...(meta.applied ? { qualification: meta } : {}),
  };
}

/** Serialize one provider result, preserving status verbatim. */
function serializeProviderResult(
  r: ProviderMetricsResult,
  sortBy: SortKey = "spend",
  order: Order = "desc",
  creativeType?: CreativeType
) {
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
      ? serializeCampaigns(r.provider, r.metrics.campaigns, sortBy, order)
      : {}),
    ...(r.metrics.assets
      ? serializeAssets(r.provider, r.metrics.assets, sortBy, order)
      : {}),
    ...(r.metrics.creatives && getCapabilities(r.provider).supportsCreativeLevel
      ? serializeCreatives(
          r.provider,
          r.metrics.creatives,
          sortBy,
          order,
          creativeType
        )
      : {}),
    ...(r.metrics.funnel && getCapabilities(r.provider).supportsFunnel
      ? {
          funnel: {
            view_content: r.metrics.funnel.viewContent,
            add_to_cart: r.metrics.funnel.addToCart,
            initiate_checkout: r.metrics.funnel.initiateCheckout,
            purchase: r.metrics.funnel.purchase,
            attribution: "ad-attributed",
          },
        }
      : {}),
  };
}

/** AI-005: max recommendations returned per provider. */
const REC_CAP = 5;

/** Compact view of a recommendation (internal 0-1 `score` stays sort-only). */
function serializeRecommendation(r: Recommendation) {
  return {
    kind: r.kind,
    level: r.level,
    entity_id: r.entityId,
    entity_name: r.entityName,
    action: r.action,
    impact: r.impact,
    // AI-006: non-breaking alias of impact (the grounding "why").
    reason: r.impact,
    cta: r.cta,
    confidence: r.confidence,
    // AI-006: business-impact priority (0-100) now visible to the model.
    opportunity_score: r.opportunityScore,
  };
}

/** Run the rules for one provider result, or [] when it has no usable metrics. */
function recsForResult(
  result: ProviderMetricsResult | undefined
): Recommendation[] {
  if (!result || result.status !== "ok" || !result.metrics) return [];
  return deriveRecommendations(
    result.metrics,
    getCapabilities(result.provider)
  );
}

/** Map an account-level diagnosis (funnel or pixel) into a Recommendation. */
function diagnosisToRec(
  d: FunnelDiagnosis | PixelDiagnosis,
  provider: MetricsProvider
): Recommendation {
  return {
    kind: d.kind as Recommendation["kind"],
    provider,
    level: "account",
    entityId: "account",
    entityName: "your account",
    action: d.action,
    impact: d.impact,
    cta: d.cta,
    confidence: d.confidence,
    score: d.opportunityScore / 100,
    opportunityScore: d.opportunityScore,
  };
}

/**
 * AI-008 Phase 1: account-level note when the account is non-conversion, so
 * ecommerce funnel/pixel diagnostics were intentionally skipped. Informational
 * (low score) — it explains the absence of funnel recs, never competes to win.
 */
function objectiveNotConversionRec(provider: MetricsProvider): Recommendation {
  return {
    kind: "objective_not_conversion",
    provider,
    level: "account",
    entityId: "account",
    entityName: "your account",
    action:
      "This campaign is optimized for traffic, engagement, video views, messages, or awareness. Ecommerce funnel diagnostics are not applicable.",
    impact:
      "No conversion-objective campaigns detected, so ecommerce funnel and pixel diagnostics were not evaluated.",
    cta: "Show top campaigns",
    confidence: "high",
    score: 0.1,
    opportunityScore: 10,
  };
}

/** Map an AI-006 budget reallocation (account-level) into a Recommendation. */
function budgetToRec(
  b: BudgetRecommendation,
  provider: MetricsProvider
): Recommendation {
  return {
    kind: b.kind,
    provider,
    level: "account",
    entityId: "account",
    entityName: "your account",
    action: b.action,
    impact: b.impact,
    cta: b.cta,
    confidence: b.confidence,
    score: b.opportunityScore / 100,
    opportunityScore: b.opportunityScore,
  };
}

/** Rank recommendations by opportunityScore desc, tie-break score, then name. */
function rankRecs(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort((a, b) =>
    b.opportunityScore !== a.opportunityScore
      ? b.opportunityScore - a.opportunityScore
      : b.score !== a.score
        ? b.score - a.score
        : a.entityName.localeCompare(b.entityName)
  );
}

/** What assembleProviderRecs returns: ranked recs + the raw diagnoses. */
interface AssembledRecs {
  okSource: ProviderMetricsResult | undefined;
  /** Ranked, suppression-applied recommendations (uncapped). */
  recs: Recommendation[];
  /** Pixel diagnosis when it fires (never pixel_healthy), else null. */
  pixelDiagnosis: PixelDiagnosis | null;
  /** Funnel diagnosis as computed (for the summary's funnel_status), or null. */
  funnelDiagnosis: FunnelDiagnosis | null;
}

/**
 * Build one provider's recommendation set with the AI-008/pixel precedence
 * applied (single source of truth for get_recommendations + get_executive_summary).
 *
 * Precedence (pixel diagnoses, account-level, Meta-only):
 *  - any pixel issue            → suppress ALL tracking_issue recs (any level)
 *  - pixel_not_detected /
 *    purchase_not_tracked       → ALSO suppress the funnel diagnosis
 *  - purchase_value_missing /
 *    partial_event_coverage     → keep the funnel diagnosis
 *  - pixel_healthy              → never surfaced (treated as no pixel issue)
 */
function assembleProviderRecs(
  camp: ProviderMetricsResult | undefined,
  ad: ProviderMetricsResult | undefined,
  provider: MetricsProvider
): AssembledRecs {
  const okSource =
    camp?.status === "ok" ? camp : ad?.status === "ok" ? ad : camp ?? ad;

  let recs: Recommendation[] = [...recsForResult(camp), ...recsForResult(ad)];

  // Defensive lookup (AI-014): a provider without a CAPABILITIES entry (e.g. a
  // non-ads connector that slipped through) yields undefined here, so treat a
  // missing descriptor as "no funnel / no creative" rather than crashing.
  const supportsFunnel = getCapabilities(provider)?.supportsFunnel ?? false;
  const funnelEvents =
    okSource?.status === "ok" ? okSource.metrics?.funnel : undefined;
  const totals = okSource?.status === "ok" ? okSource.metrics?.totals : undefined;

  // AI-008 Phase 1: route diagnostics by objective. Ecommerce funnel/pixel
  // diagnostics only apply to conversion-objective accounts; a proven
  // non-conversion account (traffic/engagement/video/messages/awareness) skips
  // them. Objective comes from the campaign-level fetch; absent objective data
  // leaves conversionObjective = true (existing behavior preserved).
  const objectiveCampaigns =
    camp?.status === "ok" ? camp.metrics?.campaigns : undefined;
  const conversionObjective = hasConversionObjective(objectiveCampaigns);

  // AI-008.1A: account-level belt-and-suspenders — a proven non-conversion
  // account never surfaces tracking_issue (conversion-tracking advice is N/A).
  // The rule engine (AI-008.1B) already gates this per entity; this guarantees
  // none slips through at the account level.
  if (!conversionObjective) {
    recs = recs.filter((r) => r.kind !== "tracking_issue");
  }

  const funnelDiagnosis =
    funnelEvents && supportsFunnel && conversionObjective
      ? deriveFunnelDiagnosis(funnelEvents)
      : null;

  const pixelRaw =
    funnelEvents && totals && supportsFunnel && conversionObjective
      ? derivePixelDiagnostics(funnelEvents, totals)
      : null;
  const pixelDiagnosis =
    pixelRaw && pixelRaw.kind !== "pixel_healthy" ? pixelRaw : null;

  const suppressFunnel =
    pixelDiagnosis !== null &&
    (pixelDiagnosis.kind === "pixel_not_detected" ||
      pixelDiagnosis.kind === "purchase_not_tracked");

  // Pixel issue suppresses every tracking_issue (any level).
  if (pixelDiagnosis) {
    recs = recs.filter((r) => r.kind !== "tracking_issue");
  }

  // Funnel diagnosis (unless suppressed by a severe pixel issue).
  if (
    funnelDiagnosis &&
    funnelDiagnosis.kind !== "funnel_healthy" &&
    !suppressFunnel
  ) {
    recs.push(diagnosisToRec(funnelDiagnosis, provider));
  }

  // Pixel diagnosis participates in ranking.
  if (pixelDiagnosis) {
    recs.push(diagnosisToRec(pixelDiagnosis, provider));
  }

  // AI-008/AI-009: on a proven non-conversion account, route to objective-aware
  // diagnostics. Phase 2A: traffic-objective opportunities (CTR/CPC/spend only).
  // Fall back to the informational note when no objective-aware rec applies.
  if (supportsFunnel && !conversionObjective) {
    const objectiveCampaignsOk =
      okSource?.status === "ok" ? okSource.metrics?.campaigns : undefined;
    const currency =
      okSource?.status === "ok" ? okSource.metrics?.currency ?? "" : "";
    const objectiveRecs = objectiveCampaignsOk
      ? [
          ...deriveTrafficDiagnostics(objectiveCampaignsOk, currency, provider),
          ...deriveEngagementDiagnostics(
            objectiveCampaignsOk,
            currency,
            provider
          ),
        ]
      : [];
    if (objectiveRecs.length > 0) {
      recs.push(...objectiveRecs);
    } else {
      recs.push(objectiveNotConversionRec(provider));
    }
  }

  // AI-006 budget reallocation — cross-campaign move from account totals. Does
  // NOT suppress scale/pause/budget_concentration; ranking decides precedence.
  const campaigns =
    okSource?.status === "ok" ? okSource.metrics?.campaigns : undefined;
  if (campaigns && totals) {
    const budgetRec = deriveBudgetRecommendations(
      campaigns,
      totals.roas,
      okSource?.status === "ok" ? okSource.metrics!.currency : ""
    );
    if (budgetRec) {
      recs.push(budgetToRec(budgetRec, provider));
    }
  }

  return { okSource, recs: rankRecs(recs), pixelDiagnosis, funnelDiagnosis };
}

export const metricsToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_workspace_metrics",
    description:
      "Get advertising/commerce metrics for ALL connected sources in the current workspace. Omit since/until to use the default window (last 180 days, with automatic per-source fallback to all-time when 180 days is empty). Returns one entry per source with its status (ok/no_data/unsupported/error), window_used, currency, raw metrics, and derived ratios. Use this for cross-source or 'overall' questions. IMPORTANT: when the user asks about individual campaigns — top/best/worst campaigns, a campaign breakdown, or which campaign has the highest ROAS / lowest CTR / most spend — set level:\"campaign\" so each source also returns a per-campaign list. When the user asks about individual ads — best/worst ads, an ad breakdown, or which ad has the highest CTR / highest ROAS / most spend — set level:\"ad\" to also return a per-ad list. Otherwise you only get account totals and cannot answer campaign- or ad-level questions.",
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
          enum: ["account", "campaign", "ad", "creative"],
          description: "account = workspace/account totals only (default). campaign = also return a per-campaign breakdown (top/best/worst campaigns, highest-ROAS / lowest-CTR campaign, which campaign to fund). ad = also return a per-ad breakdown (best/worst ads, highest-CTR / highest-ROAS / highest-spend ad). creative = also return a per-creative breakdown (best/worst creative, highest-CTR creative, which image/video to scale, fatiguing creative). Creative level is Meta only.",
        },
        sort_by: {
          type: "string",
          enum: ["spend", "ctr", "roas", "cpc", "conversions", "revenue", "impressions", "clicks"],
          description: "How to rank the campaign/ad/creative breakdown. Pick the metric the question is about: 'highest CTR' → ctr, 'highest ROAS' / 'best' → roas, 'lowest CPC' / 'cheapest clicks' → cpc, 'most spend' / 'top' → spend, 'most conversions' → conversions. Default spend. The returned list is sorted by this key but NOT volume-filtered yet, so very low-volume entities can rank high on a ratio.",
        },
        order: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction for sort_by. desc = highest first (default). Use asc for 'lowest' / 'cheapest' / 'worst on a higher-is-better metric' (e.g. lowest CPC → sort_by:cpc, order:asc).",
        },
        creative_type: {
          type: "string",
          enum: ["image", "video", "carousel", "text", "other"],
          description: "Only with level:\"creative\". Restrict the creative breakdown to one format — use for 'best image' (image) or 'best video' (video). Omit to include all creative formats.",
        },
      },
    },
  },
  {
    name: "get_provider_metrics",
    description:
      "Get metrics for ONE specific source (e.g. meta_ads, google_ads). Omit since/until to use the default window (last 180 days, with automatic fallback to all-time when empty). Use when the user asks about a single platform. IMPORTANT: when the user asks about individual campaigns on that platform — top/best/worst campaigns, a campaign breakdown, or which campaign has the highest ROAS / lowest CTR / most spend — set level:\"campaign\" to get the per-campaign list. When the user asks about individual ads — best/worst ads, an ad breakdown, or which ad has the highest CTR / highest ROAS / most spend — set level:\"ad\" to get the per-ad list. Otherwise only account totals are returned.",
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
          enum: ["account", "campaign", "ad", "creative"],
          description: "Aggregation level when supported. Use 'campaign' for a per-campaign breakdown (top/worst/compare campaigns, campaign ROAS). Use 'ad' for a per-ad breakdown (best/worst ads, highest CTR/ROAS/spend ad). Use 'creative' for a per-creative breakdown (best/worst creative, highest-CTR creative, which image/video to scale). Creative level is Meta only. Default account.",
        },
        sort_by: {
          type: "string",
          enum: ["spend", "ctr", "roas", "cpc", "conversions", "revenue", "impressions", "clicks"],
          description: "How to rank the campaign/ad/creative breakdown. Pick the metric the question is about: 'highest CTR' → ctr, 'highest ROAS' / 'best' → roas, 'lowest CPC' / 'cheapest clicks' → cpc, 'most spend' / 'top' → spend, 'most conversions' → conversions. Default spend. The returned list is sorted by this key but NOT volume-filtered yet, so very low-volume entities can rank high on a ratio.",
        },
        order: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction for sort_by. desc = highest first (default). Use asc for 'lowest' / 'cheapest' / 'worst on a higher-is-better metric' (e.g. lowest CPC → sort_by:cpc, order:asc).",
        },
        creative_type: {
          type: "string",
          enum: ["image", "video", "carousel", "text", "other"],
          description: "Only with level:\"creative\". Restrict the creative breakdown to one format — use for 'best image' (image) or 'best video' (video). Omit to include all creative formats.",
        },
      },
      required: ["provider"],
    },
  },
  {
    name: "get_recommendations",
    description:
      "Get deterministic, grounded ACTION recommendations (scale / pause / creative refresh / budget concentration / bid review / tracking issue) for the workspace's campaigns AND ads. Use when the user asks 'what should I do', 'how do I improve', 'where am I wasting spend', or wants next steps. Each recommendation is computed from retrieved metrics versus that source's own account average; relay them verbatim (action, impact, cta, confidence) and NEVER claim to have taken an action — you can only advise. Omit since/until for the default window (last 180 days, with per-source all-time fallback). Returns up to 5 recommendations per source; an empty list means no clear action this window — say so rather than inventing one.",
    input_schema: {
      type: "object",
      properties: {
        since: { type: "string", description: "Optional start date, inclusive (YYYY-MM-DD). Omit for the default window." },
        until: { type: "string", description: "Optional end date, inclusive (YYYY-MM-DD). Omit for the default window." },
      },
    },
  },
  {
    name: "get_executive_summary",
    description:
      "Get a concise, account-level executive summary for each connected source: headline performance (spend, revenue, ROAS, CTR), the single top opportunity (highest business-impact recommendation), funnel status, and watch-outs (tracking gaps / degraded sources). Use for 'summary', 'overview', 'how is my account doing', 'give me the big picture'. One block PER SOURCE — never blend currencies across sources. Relay the numbers verbatim; an empty/degraded source is reported honestly via its status and watch-outs. Omit since/until for the default window.",
    input_schema: {
      type: "object",
      properties: {
        since: { type: "string", description: "Optional start date, inclusive (YYYY-MM-DD). Omit for the default window." },
        until: { type: "string", description: "Optional end date, inclusive (YYYY-MM-DD). Omit for the default window." },
      },
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
    const sortBy = asSortKey(input.sort_by);
    const order = asOrder(input.order);
    const creativeType = asCreativeType(input.creative_type);
    const result = await getMetricsWithFallback(ctx.workspaceId, query);
    return JSON.stringify({
      dateRange: result.dateRange,
      granularity: result.granularity,
      providers: result.providers.map((p) =>
        serializeProviderResult(p, sortBy, order, creativeType)
      ),
    });
  },

  async get_provider_metrics(input, ctx) {
    const provider = asProvider(input.provider);
    const query = buildQuery(input, ctx.todayISO);
    const sortBy = asSortKey(input.sort_by);
    const order = asOrder(input.order);
    const creativeType = asCreativeType(input.creative_type);
    // Go through the workspace engine (correct connector resolution + cache +
    // per-provider lifetime fallback), then narrow to the requested provider. A
    // provider with no active connector simply isn't in the result.
    const result = await getMetricsWithFallback(ctx.workspaceId, query);
    const match = result.providers.find((p) => p.provider === provider);
    if (!match) {
      return JSON.stringify({ provider, status: "unsupported" });
    }
    return JSON.stringify(
      serializeProviderResult(match, sortBy, order, creativeType)
    );
  },

  async get_recommendations(input, ctx) {
    const base = buildQuery(input, ctx.todayISO);
    // Two fetches: campaign-level and ad-level. The rules run separately per
    // result (so a per-source lifetime-fallback window divergence can't blend
    // breakdowns), and the resulting lists are merged + capped afterward.
    const [campRes, adRes] = await Promise.all([
      getMetricsWithFallback(ctx.workspaceId, {
        ...base,
        level: "campaign",
        granularity: "total",
      }),
      getMetricsWithFallback(ctx.workspaceId, {
        ...base,
        level: "ad",
        granularity: "total",
      }),
    ]);

    const providers = new Set<MetricsProvider>();
    for (const p of campRes.providers) providers.add(p.provider);
    for (const p of adRes.providers) providers.add(p.provider);

    const out = [...providers].map((provider) => {
      const camp = campRes.providers.find((p) => p.provider === provider);
      const ad = adRes.providers.find((p) => p.provider === provider);

      // Shared assembly: campaign + ad recs + funnel/pixel diagnoses with the
      // pixel-precedence suppression applied, ranked by opportunityScore.
      const { okSource, recs } = assembleProviderRecs(camp, ad, provider);
      const ranked = recs.slice(0, REC_CAP);

      return {
        provider,
        status: okSource?.status ?? "no_data",
        window_used: okSource?.windowUsed ?? "range",
        ...(okSource?.status === "ok" && okSource.metrics
          ? { currency: okSource.metrics.currency }
          : {}),
        // Surface the upstream error message structurally so one failing
        // provider is reported (not swallowed) without aborting the others.
        ...(okSource?.status === "error" && okSource.error
          ? { message: okSource.error }
          : {}),
        // First-class "ok but nothing to do" state (AI-013): an explicit signal
        // so the model reports a healthy no-action result rather than a failure.
        ...(okSource?.status === "ok" && ranked.length === 0
          ? { no_actions_this_window: true }
          : {}),
        recommendations: ranked.map(serializeRecommendation),
      };
    });

    return JSON.stringify({ dateRange: campRes.dateRange, providers: out });
  },

  async get_executive_summary(input, ctx) {
    const base = buildQuery(input, ctx.todayISO);
    // Same two-level fetch as get_recommendations (campaign + ad), reused to
    // build per-provider recs, funnel diagnosis, and headline totals.
    const [campRes, adRes] = await Promise.all([
      getMetricsWithFallback(ctx.workspaceId, {
        ...base,
        level: "campaign",
        granularity: "total",
      }),
      getMetricsWithFallback(ctx.workspaceId, {
        ...base,
        level: "ad",
        granularity: "total",
      }),
    ]);

    const providers = new Set<MetricsProvider>();
    for (const p of campRes.providers) providers.add(p.provider);
    for (const p of adRes.providers) providers.add(p.provider);

    const summaries = [...providers].map((provider) => {
      const camp = campRes.providers.find((p) => p.provider === provider);
      const ad = adRes.providers.find((p) => p.provider === provider);

      // Shared assembly — same precedence as get_recommendations.
      const { okSource, recs, pixelDiagnosis, funnelDiagnosis } =
        assembleProviderRecs(camp, ad, provider);

      const totals: SummaryHeadline | null =
        okSource?.status === "ok" && okSource.metrics
          ? {
              spend: okSource.metrics.totals.spend,
              revenue: okSource.metrics.totals.revenue,
              roas: okSource.metrics.totals.roas,
              ctr: okSource.metrics.totals.ctr,
            }
          : null;

      return composeExecutiveSummary({
        provider,
        status: okSource?.status ?? "no_data",
        windowUsed: okSource?.windowUsed ?? "range",
        ...(okSource?.status === "ok" && okSource.metrics
          ? { currency: okSource.metrics.currency }
          : {}),
        // Same structured error surfacing as get_recommendations.
        ...(okSource?.status === "error" && okSource.error
          ? { message: okSource.error }
          : {}),
        totals,
        recommendations: recs,
        funnelDiagnosis,
        pixelDiagnosis,
      });
    });

    return JSON.stringify({ dateRange: campRes.dateRange, summaries });
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
