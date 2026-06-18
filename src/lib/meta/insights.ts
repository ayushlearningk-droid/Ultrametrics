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

  console.log(
    "META RAW INSIGHTS:",
    JSON.stringify(json, null, 2)
  );

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
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  /** Monetary value of purchase conversions (from action_values). */
  revenue: number;
  /** Count of purchase conversions. */
  conversions: number;
}

export interface GetAccountMetricsOptions {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
  granularity: "total" | "daily";
  level?: "account" | "campaign";
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
  const baseFields = ["spend", "impressions", "clicks", "reach", "action_values"];
  // Campaign level (Issue #3) needs the campaign identity fields to group by.
  const leveledFields =
    options.level === "campaign"
      ? ["campaign_id", "campaign_name", ...baseFields]
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
      spend?: string;
      impressions?: string;
      clicks?: string;
      reach?: string;
      action_values?: MetaActionValue[];
    }>;
  };

  return (json.data ?? []).map((row) => ({
    ...(row.date_start ? { date_start: row.date_start } : {}),
    ...(row.campaign_id ? { campaign_id: row.campaign_id } : {}),
    ...(row.campaign_name ? { campaign_name: row.campaign_name } : {}),
    spend: parseFloat(row.spend ?? "0"),
    impressions: parseInt(row.impressions ?? "0", 10),
    clicks: parseInt(row.clicks ?? "0", 10),
    reach: parseInt(row.reach ?? "0", 10),
    revenue: sumPurchaseValue(row.action_values),
    conversions: countPurchaseActions(row.action_values),
  }));
}