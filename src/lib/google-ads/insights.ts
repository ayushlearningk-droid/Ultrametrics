import { GOOGLE_ADS_API_BASE } from "@/lib/google-ads/constants";

export type GoogleAdsCampaignRow = {
  campaignId: string;
  campaignName: string;
  date: string; // YYYY-MM-DD from segments.date
  impressions: number;
  clicks: number;
  costMicros: number;
  costCurrency: number; // costMicros / 1_000_000
  conversions: number;
  conversionsValue: number; // metrics.conversions_value (monetary)
  currencyCode?: string; // customer.currency_code (ISO 4217)
};

/** One ad-level (ad_group_ad) row for AI-002 asset breakdown. */
export type GoogleAdsAdRow = {
  adId: string;
  adName: string; // ad_group_ad.ad.name (falls back to adId when empty)
  impressions: number;
  clicks: number;
  costMicros: number;
  costCurrency: number; // costMicros / 1_000_000
  conversions: number;
  conversionsValue: number; // metrics.conversions_value (monetary)
  currencyCode?: string; // customer.currency_code (ISO 4217)
};

/** Optional explicit date range (YYYY-MM-DD) for metrics queries. */
export type GoogleAdsDateRange = { since: string; until: string };

type GaqlErrorDetail = {
  "@type"?: string;
  errors?: Array<{
    errorCode?: Record<string, string>;
    message?: string;
    location?: unknown;
  }>;
  requestId?: string;
};

type GaqlSearchResponse = {
  results?: Array<{
    campaign?: {
      id?: string;
      name?: string;
    };
    segments?: {
      date?: string;
    };
    metrics?: {
      impressions?: string;
      clicks?: string;
      costMicros?: string;
      conversions?: string;
      conversionsValue?: string;
    };
    customer?: {
      currencyCode?: string;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: GaqlErrorDetail[];
  };
};

/** Ad-level (ad_group_ad) search response shape for AI-002. */
type GaqlAdSearchResponse = {
  results?: Array<{
    adGroupAd?: {
      ad?: {
        id?: string;
        name?: string;
      };
    };
    metrics?: {
      impressions?: string;
      clicks?: string;
      costMicros?: string;
      conversions?: string;
      conversionsValue?: string;
    };
    customer?: {
      currencyCode?: string;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: GaqlErrorDetail[];
  };
};

/**
 * Build the campaign-insights GAQL. With an explicit range, filters
 * `segments.date BETWEEN`; without one, preserves the original
 * `DURING LAST_30_DAYS` behaviour (backward compatible for existing callers).
 */
function buildCampaignInsightsQuery(range?: GoogleAdsDateRange): string {
  const dateClause = range
    ? `segments.date BETWEEN '${range.since}' AND '${range.until}'`
    : "segments.date DURING LAST_30_DAYS";
  return `
  SELECT
    campaign.id,
    campaign.name,
    segments.date,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value,
    customer.currency_code
  FROM campaign
  WHERE ${dateClause}
    AND campaign.status != 'REMOVED'
  ORDER BY segments.date DESC, metrics.impressions DESC
  LIMIT 2000
`.trim();
}

/**
 * Build the ad-level (ad_group_ad) GAQL for AI-002. Account-wide, totals only
 * (no segments.date in SELECT — V1 has no per-ad series). Ordered by cost so the
 * 2000-row cap retains the highest-spend ads (top-K by spend).
 */
function buildAdInsightsQuery(range?: GoogleAdsDateRange): string {
  const dateClause = range
    ? `segments.date BETWEEN '${range.since}' AND '${range.until}'`
    : "segments.date DURING LAST_30_DAYS";
  return `
  SELECT
    ad_group_ad.ad.id,
    ad_group_ad.ad.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value,
    customer.currency_code
  FROM ad_group_ad
  WHERE ${dateClause}
    AND ad_group_ad.status != 'REMOVED'
  ORDER BY metrics.cost_micros DESC
  LIMIT 2000
`.trim();
}

export async function refreshGoogleAdsAccessToken(
  refreshToken: string
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured"
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ??
        json.error ??
        "Failed to refresh Google Ads access token"
    );
  }

  return json.access_token;
}

export async function getCampaignInsights(
  accessToken: string,
  developerToken: string,
  customerId: string,
  mccCustomerId: string,
  range?: GoogleAdsDateRange
): Promise<GoogleAdsCampaignRow[]> {
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`;

  // --- DIAGNOSTIC: outbound request ---
  console.log("[GoogleAds][insights] === OUTBOUND REQUEST ===");
  console.log("[GoogleAds][insights] URL:", url);
  console.log("[GoogleAds][insights] customerId (in URL path):", customerId);
  console.log("[GoogleAds][insights] customerId has dashes:", customerId.includes("-"));
  console.log("[GoogleAds][insights] mccCustomerId (login-customer-id header):", mccCustomerId || "(empty — header NOT sent)");
  console.log("[GoogleAds][insights] mccCustomerId has dashes:", mccCustomerId?.includes("-") ?? false);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  if (mccCustomerId) {
    headers["login-customer-id"] = mccCustomerId;
  }

  console.log("[GoogleAds][insights] outbound header keys:", Object.keys(headers));
  console.log("[GoogleAds][insights] login-customer-id header value:", headers["login-customer-id"] ?? "(not set)");

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: buildCampaignInsightsQuery(range) }),
    cache: "no-store",
  });

  const rawText = await res.text();

  // --- DIAGNOSTIC: response ---
  console.log("[GoogleAds][insights] === RESPONSE ===");
  console.log("[GoogleAds][insights] HTTP status:", res.status, res.statusText);
  console.log("[GoogleAds][insights] response URL (after redirects):", res.url);
  console.log("[GoogleAds][insights] raw response body:", rawText);

  let body: GaqlSearchResponse;
  try {
    body = JSON.parse(rawText) as GaqlSearchResponse;
  } catch {
    throw new Error(
      `Google Ads API returned non-JSON (status ${res.status}): ${rawText.slice(0, 200)}`
    );
  }

  if (!res.ok || body.error) {
    // --- DIAGNOSTIC: structured error breakdown ---
    console.log("[GoogleAds][insights] === ERROR BREAKDOWN ===");
    console.log("[GoogleAds][insights] error.code:", body.error?.code);
    console.log("[GoogleAds][insights] error.status:", body.error?.status);
    console.log("[GoogleAds][insights] error.message:", body.error?.message);
    console.log("[GoogleAds][insights] error.details (full):", JSON.stringify(body.error?.details ?? [], null, 2));

    // Extract the innermost Google Ads error codes from details[].errors[].errorCode
    const innerErrors = body.error?.details?.flatMap((d) => d.errors ?? []) ?? [];
    innerErrors.forEach((e, i) => {
      console.log(`[GoogleAds][insights] error.details[${i}].errorCode:`, JSON.stringify(e.errorCode));
      console.log(`[GoogleAds][insights] error.details[${i}].message:`, e.message);
    });

    throw new Error(
      body.error?.message ?? `Google Ads API error: ${res.status}`
    );
  }

  return (body.results ?? []).map((row) => {
    const costMicros = parseInt(row.metrics?.costMicros ?? "0", 10);
    return {
      campaignId: row.campaign?.id ?? "",
      campaignName: row.campaign?.name ?? "",
      date: row.segments?.date ?? "",
      impressions: parseInt(row.metrics?.impressions ?? "0", 10),
      clicks: parseInt(row.metrics?.clicks ?? "0", 10),
      costMicros,
      costCurrency: costMicros / 1_000_000,
      conversions: parseFloat(row.metrics?.conversions ?? "0"),
      conversionsValue: parseFloat(row.metrics?.conversionsValue ?? "0"),
      currencyCode: row.customer?.currencyCode,
    };
  });
}

/**
 * Ad-level (ad_group_ad) insights for AI-002. Mirrors getCampaignInsights'
 * auth/headers/error handling exactly; only the query and result mapping differ.
 * Returns one row per ad (account-wide, totals only). Campaign path is untouched.
 */
export async function getAdInsights(
  accessToken: string,
  developerToken: string,
  customerId: string,
  mccCustomerId: string,
  range?: GoogleAdsDateRange
): Promise<GoogleAdsAdRow[]> {
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`;

  console.log("[GoogleAds][ads] === OUTBOUND REQUEST ===");
  console.log("[GoogleAds][ads] URL:", url);
  console.log("[GoogleAds][ads] customerId (in URL path):", customerId);
  console.log("[GoogleAds][ads] customerId has dashes:", customerId.includes("-"));
  console.log("[GoogleAds][ads] mccCustomerId (login-customer-id header):", mccCustomerId || "(empty — header NOT sent)");
  console.log("[GoogleAds][ads] mccCustomerId has dashes:", mccCustomerId?.includes("-") ?? false);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  if (mccCustomerId) {
    headers["login-customer-id"] = mccCustomerId;
  }

  console.log("[GoogleAds][ads] outbound header keys:", Object.keys(headers));
  console.log("[GoogleAds][ads] login-customer-id header value:", headers["login-customer-id"] ?? "(not set)");

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: buildAdInsightsQuery(range) }),
    cache: "no-store",
  });

  const rawText = await res.text();

  console.log("[GoogleAds][ads] === RESPONSE ===");
  console.log("[GoogleAds][ads] HTTP status:", res.status, res.statusText);
  console.log("[GoogleAds][ads] response URL (after redirects):", res.url);
  console.log("[GoogleAds][ads] raw response body:", rawText);

  let body: GaqlAdSearchResponse;
  try {
    body = JSON.parse(rawText) as GaqlAdSearchResponse;
  } catch {
    throw new Error(
      `Google Ads API returned non-JSON (status ${res.status}): ${rawText.slice(0, 200)}`
    );
  }

  if (!res.ok || body.error) {
    console.log("[GoogleAds][ads] === ERROR BREAKDOWN ===");
    console.log("[GoogleAds][ads] error.code:", body.error?.code);
    console.log("[GoogleAds][ads] error.status:", body.error?.status);
    console.log("[GoogleAds][ads] error.message:", body.error?.message);
    console.log("[GoogleAds][ads] error.details (full):", JSON.stringify(body.error?.details ?? [], null, 2));

    const innerErrors = body.error?.details?.flatMap((d) => d.errors ?? []) ?? [];
    innerErrors.forEach((e, i) => {
      console.log(`[GoogleAds][ads] error.details[${i}].errorCode:`, JSON.stringify(e.errorCode));
      console.log(`[GoogleAds][ads] error.details[${i}].message:`, e.message);
    });

    throw new Error(
      body.error?.message ?? `Google Ads API error: ${res.status}`
    );
  }

  return (body.results ?? []).map((row) => {
    const costMicros = parseInt(row.metrics?.costMicros ?? "0", 10);
    const adId = row.adGroupAd?.ad?.id ?? "";
    return {
      adId,
      adName: row.adGroupAd?.ad?.name || adId,
      impressions: parseInt(row.metrics?.impressions ?? "0", 10),
      clicks: parseInt(row.metrics?.clicks ?? "0", 10),
      costMicros,
      costCurrency: costMicros / 1_000_000,
      conversions: parseFloat(row.metrics?.conversions ?? "0"),
      conversionsValue: parseFloat(row.metrics?.conversionsValue ?? "0"),
      currencyCode: row.customer?.currencyCode,
    };
  });
}
