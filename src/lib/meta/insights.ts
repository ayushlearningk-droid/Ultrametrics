const GRAPH_VERSION = "v23.0";

export async function getAccountInsights(
  accessToken: string,
  accountId: string
) {
  const fields = [
    "impressions",
    "clicks",
    "spend",
    "reach",
    "cpc",
    "cpm",
    "ctr",
  ].join(",");

  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights` +
    `?fields=${fields}` +
    `&date_preset=maximum` +
    `&access_token=${accessToken}`;

  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  const json = await res.json();

  return json.data ?? [];
}

export interface DailyInsightRow {
  date_start: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
}

/** Fetch day-by-day breakdown for the last `days` days (default 14). */
export async function getAccountInsightsByDay(
  accessToken: string,
  accountId: string,
  days = 14
): Promise<DailyInsightRow[]> {
  const fields = ["impressions", "clicks", "spend", "ctr"].join(",");
  const params = new URLSearchParams({
    fields,
    date_preset: "maximum",
    time_increment: "1",
    access_token: accessToken,
  });

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights?${params}`;

  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  const json = await res.json();
  return (json.data ?? []) as DailyInsightRow[];
}

/* ─── Metrics-layer fetcher (canonical, raw) ──────────────────────────────── */

/** Action-value entry from the Meta insights API. */
type MetaActionValue = { action_type?: string; value?: string };

/** One raw insights row from getAccountMetrics (revenue/conversions resolved). */
export interface MetaMetricsRow {
  /** Present only when granularity = "daily". */
  date_start?: string;
  /** Present only when level = "campaign" (Issue #3). */
  campaign_id?: string;
  /** Present only when level = "campaign" (Issue #3). */
  campaign_name?: string;
  /** Present only when level = "ad" (AI-002). */
  ad_id?: string;
  /** Present only when level = "ad" (AI-002). */
  ad_name?: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  /** Monetary value of purchase conversions (from action_values). */
  revenue: number;
  /** Count of purchase conversions. */
  conversions: number;
  /**
   * Ad-attributed funnel event counts (AI-007), parsed from the `actions` field
   * via single canonical action_type keys (no double counting). 0 when absent.
   */
  viewContent: number;
  addToCart: number;
  initiateCheckout: number;
  purchaseEvents: number;
  /** Ad-attributed landing page views (AI-007A). 0 when absent. */
  pageView: number;
  /** Campaign objective (AI-008), present at campaign level, e.g. "OUTCOME_TRAFFIC". */
  objective?: string;
  /** Ad-attributed engagement counts (AI-009B). Canonical = postEngagement. */
  postEngagement: number;
  pageEngagement: number;
  linkClicks: number;
}

export interface GetAccountMetricsOptions {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
  granularity: "total" | "daily";
  level?: "account" | "campaign" | "ad" | "creative";
  /**
   * Time window. "range" (default) uses the explicit since/until via time_range.
   * "lifetime" uses date_preset=maximum (all-time) and ignores since/until.
   */
  mode?: "range" | "lifetime";
}

const META_PURCHASE_ACTION_TYPES = new Set([
  "offsite_conversion.fb_pixel_purchase",
  "purchase",
]);

/** Sum the monetary value of purchase action_values. */
function sumPurchaseValue(actions: MetaActionValue[] | undefined): number {
  if (!actions) return 0;
  return actions.reduce((acc, a) => {
    if (a.action_type && META_PURCHASE_ACTION_TYPES.has(a.action_type)) {
      return acc + parseFloat(a.value ?? "0");
    }
    return acc;
  }, 0);
}

/** Count purchase conversion entries present in action_values. */
function countPurchaseActions(actions: MetaActionValue[] | undefined): number {
  if (!actions) return 0;
  return actions.reduce(
    (acc, a) =>
      a.action_type && META_PURCHASE_ACTION_TYPES.has(a.action_type)
        ? acc + 1
        : acc,
    0
  );
}

/**
 * Canonical funnel action_type keys (AI-007). ONE key per event so the same
 * conversion is never counted from overlapping variants (offsite_conversion.* vs
 * omni_* vs the bare key).
 */
const FUNNEL_ACTION_TYPE = {
  viewContent: "offsite_conversion.fb_pixel_view_content",
  addToCart: "offsite_conversion.fb_pixel_add_to_cart",
  initiateCheckout: "offsite_conversion.fb_pixel_initiate_checkout",
  purchase: "offsite_conversion.fb_pixel_purchase",
} as const;

/** Sum the count (value) of a single canonical action_type in the actions array. */
function sumActionCount(
  actions: MetaActionValue[] | undefined,
  actionType: string
): number {
  if (!actions) return 0;
  return actions.reduce(
    (acc, a) =>
      a.action_type === actionType ? acc + parseFloat(a.value ?? "0") : acc,
    0
  );
}

/**
 * Landing-page-view action types (AI-007A), in priority order. omni_* is the
 * web+app aggregate of the bare key, so the two overlap — take the FIRST that is
 * present rather than summing, to avoid double counting.
 */
const PAGEVIEW_ACTION_TYPES = [
  "landing_page_view",
  "omni_landing_page_view",
] as const;

/** Ad-attributed landing page views: first present of the priority list, no sum. */
function sumPageView(actions: MetaActionValue[] | undefined): number {
  if (!actions) return 0;
  for (const type of PAGEVIEW_ACTION_TYPES) {
    const v = sumActionCount(actions, type);
    if (v > 0) return v;
  }
  return 0;
}

/**
 * Engagement action types (AI-009B). post_engagement is Meta's canonical total
 * engagement; page_engagement and link_click are supplementary (and overlap), so
 * they are parsed separately and never summed into the engagement rate / CPE.
 */
const ENGAGEMENT_ACTION_TYPE = {
  postEngagement: "post_engagement",
  pageEngagement: "page_engagement",
  linkClicks: "link_click",
} as const;

/**
 * Canonical raw metrics fetch for the metrics abstraction layer.
 *
 * Returns raw additive rows (spend, impressions, clicks, reach, revenue,
 * conversions) over an explicit date range — no ratio derivation (the metrics
 * engine derives ctr/cpc/cpm/roas). Revenue/conversions come from action_values
 * (purchase). For granularity "daily", rows carry date_start; for "total" a
 * single aggregate row is returned.
 */
export async function getAccountMetrics(
  accessToken: string,
  accountId: string,
  options: GetAccountMetricsOptions
): Promise<MetaMetricsRow[]> {
  const baseFields = ["spend", "impressions", "clicks", "reach", "action_values", "actions"];
  // Campaign level (Issue #3) / ad level (AI-002) need their identity fields to
  // group by. Account level is unchanged.
  const leveledFields =
    options.level === "campaign"
      ? ["campaign_id", "campaign_name", "objective", ...baseFields]
      : options.level === "ad"
        ? ["ad_id", "ad_name", ...baseFields]
        : baseFields;
  const fields =
    options.granularity === "daily"
      ? ["date_start", ...leveledFields]
      : leveledFields;

  const params = new URLSearchParams({
    fields: fields.join(","),
    level: options.level ?? "account",
    limit: "5000",
    access_token: accessToken,
  });
  // Lifetime → all-time via date_preset=maximum; range → explicit time_range.
  if (options.mode === "lifetime") {
    params.set("date_preset", "maximum");
  } else {
    params.set(
      "time_range",
      JSON.stringify({ since: options.since, until: options.until })
    );
  }
  if (options.granularity === "daily") {
    params.set("time_increment", "1");
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to fetch Meta metrics");
  }

  const json = (await res.json()) as {
    data?: Array<{
      date_start?: string;
      campaign_id?: string;
      campaign_name?: string;
      ad_id?: string;
      ad_name?: string;
      spend?: string;
      impressions?: string;
      clicks?: string;
      reach?: string;
      objective?: string;
      action_values?: MetaActionValue[];
      actions?: MetaActionValue[];
    }>;
  };

  return (json.data ?? []).map((row) => ({
    ...(row.date_start ? { date_start: row.date_start } : {}),
    ...(row.campaign_id ? { campaign_id: row.campaign_id } : {}),
    ...(row.campaign_name ? { campaign_name: row.campaign_name } : {}),
    ...(row.ad_id ? { ad_id: row.ad_id } : {}),
    ...(row.ad_name ? { ad_name: row.ad_name } : {}),
    ...(row.objective ? { objective: row.objective } : {}),
    spend: parseFloat(row.spend ?? "0"),
    impressions: parseInt(row.impressions ?? "0", 10),
    clicks: parseInt(row.clicks ?? "0", 10),
    reach: parseInt(row.reach ?? "0", 10),
    revenue: sumPurchaseValue(row.action_values),
    conversions: countPurchaseActions(row.action_values),
    viewContent: sumActionCount(row.actions, FUNNEL_ACTION_TYPE.viewContent),
    addToCart: sumActionCount(row.actions, FUNNEL_ACTION_TYPE.addToCart),
    initiateCheckout: sumActionCount(
      row.actions,
      FUNNEL_ACTION_TYPE.initiateCheckout
    ),
    purchaseEvents: sumActionCount(row.actions, FUNNEL_ACTION_TYPE.purchase),
    pageView: sumPageView(row.actions),
    postEngagement: sumActionCount(
      row.actions,
      ENGAGEMENT_ACTION_TYPE.postEngagement
    ),
    pageEngagement: sumActionCount(
      row.actions,
      ENGAGEMENT_ACTION_TYPE.pageEngagement
    ),
    linkClicks: sumActionCount(row.actions, ENGAGEMENT_ACTION_TYPE.linkClicks),
  }));
}

/* ─── Creative resolution (AI-003) ────────────────────────────────────────── */

/**
 * One ad's resolved creative identity, returned by getAdCreatives. The raw type
 * signals (objectType/videoId/imageUrl) are carried through so the adapter maps
 * them onto the canonical CreativeType — this module does not classify.
 */
export interface ResolvedAdCreative {
  creativeId: string;
  creativeName: string;
  objectType?: string;
  videoId?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

/** Graph batch GET caps id lists; resolve in chunks well under the limit. */
const AD_CREATIVE_BATCH = 50;

/**
 * Resolve ad_id → creative identity for a set of ads (AI-003). The Meta insights
 * endpoint does not return creative fields, so they are read from the ad objects
 * via a batched `?ids=...&fields=creative{...}` call. Resilient: a failed chunk
 * is skipped (those ads simply won't resolve) rather than failing the whole
 * fetch — the adapter buckets unresolved ads as "other".
 */
export async function getAdCreatives(
  accessToken: string,
  adIds: string[]
): Promise<Map<string, ResolvedAdCreative>> {
  const out = new Map<string, ResolvedAdCreative>();
  const unique = [...new Set(adIds.filter(Boolean))];

  for (let i = 0; i < unique.length; i += AD_CREATIVE_BATCH) {
    const chunk = unique.slice(i, i + AD_CREATIVE_BATCH);
    const params = new URLSearchParams({
      ids: chunk.join(","),
      fields: "creative{id,name,thumbnail_url,object_type,video_id,image_url}",
      access_token: accessToken,
    });
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/?${params}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as Record<
        string,
        {
          creative?: {
            id?: string;
            name?: string;
            thumbnail_url?: string;
            object_type?: string;
            video_id?: string;
            image_url?: string;
          };
        }
      >;

      for (const adId of chunk) {
        const creative = json[adId]?.creative;
        if (!creative?.id) continue;
        out.set(adId, {
          creativeId: creative.id,
          creativeName: creative.name ?? creative.id,
          objectType: creative.object_type,
          videoId: creative.video_id,
          imageUrl: creative.image_url,
          thumbnailUrl: creative.thumbnail_url,
        });
      }
    } catch {
      // Skip this chunk; unresolved ads are bucketed as "other" by the adapter.
    }
  }

  return out;
}