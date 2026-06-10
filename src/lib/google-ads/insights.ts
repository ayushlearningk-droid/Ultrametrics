import { GOOGLE_ADS_API_BASE } from "@/lib/google-ads/constants";

export type GoogleAdsCampaignRow = {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  costCurrency: number; // costMicros / 1_000_000
  conversions: number;
};

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
    metrics?: {
      impressions?: string;
      clicks?: string;
      costMicros?: string;
      conversions?: string;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: GaqlErrorDetail[];
  };
};

const CAMPAIGN_INSIGHTS_QUERY = `
  SELECT
    campaign.id,
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions
  FROM campaign
  WHERE segments.date DURING LAST_30_DAYS
    AND campaign.status != 'REMOVED'
  ORDER BY metrics.impressions DESC
  LIMIT 100
`.trim();

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
  mccCustomerId: string
): Promise<GoogleAdsCampaignRow[]> {
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`;

  // --- DIAGNOSTIC: outbound request ---
  console.log("[GoogleAds][insights] === OUTBOUND REQUEST ===");
  console.log("[GoogleAds][insights] URL:", url);
  console.log("[GoogleAds][insights] customerId (in URL path):", customerId);
  console.log("[GoogleAds][insights] customerId has dashes:", customerId.includes("-"));
  console.log("[GoogleAds][insights] mccCustomerId (login-customer-id header):", mccCustomerId || "(empty — header NOT sent)");
  console.log("[GoogleAds][insights] mccCustomerId has dashes:", mccCustomerId?.includes("-") ?? false);
  console.log("[GoogleAds][insights] developerToken length:", developerToken.length);
  console.log("[GoogleAds][insights] developerToken prefix (first 5):", developerToken.slice(0, 5));
  console.log("[GoogleAds][insights] accessToken length:", accessToken.length);
  console.log("[GoogleAds][insights] accessToken prefix (first 20):", accessToken.slice(0, 20));

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
    body: JSON.stringify({ query: CAMPAIGN_INSIGHTS_QUERY }),
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
      impressions: parseInt(row.metrics?.impressions ?? "0", 10),
      clicks: parseInt(row.metrics?.clicks ?? "0", 10),
      costMicros,
      costCurrency: costMicros / 1_000_000,
      conversions: parseFloat(row.metrics?.conversions ?? "0"),
    };
  });
}
