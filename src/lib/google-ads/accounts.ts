import { GOOGLE_ADS_API_BASE } from "@/lib/google-ads/constants";

export type GoogleAdsAccount = {
  id: string;
  name: string;
  currencyCode: string;
  resourceName: string;
};

type ListAccessibleCustomersResponse = {
  resourceNames?: string[];
};

// Response shape for POST /customers/{id}/googleAds:search
type SearchResponse = {
  results?: Array<{
    customer?: {
      resourceName?: string;
      id?: string;
      descriptiveName?: string;
      currencyCode?: string;
    };
  }>;
};

type GoogleAdsApiError = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

// Maximum accounts to detail-fetch in parallel.
const MAX_ACCOUNTS = 50;

function buildHeaders(
  accessToken: string,
  developerToken: string,
  loginCustomerId?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
  };

  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  return headers;
}

function extractCustomerId(resourceName: string): string {
  // "customers/1234567890" → "1234567890"
  return resourceName.split("/")[1] ?? resourceName;
}

async function fetchCustomerDetail(
  customerId: string,
  accessToken: string,
  developerToken: string,
  mccCustomerId: string
): Promise<GoogleAdsAccount | null> {
  // Google Ads REST API has no GET /customers/{id}.
  // Customer details are fetched via POST .../googleAds:search with GAQL.
  const requestUrl = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`;
  const query =
    "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.resource_name FROM customer LIMIT 1";

  console.log(`[GoogleAds][diag] fetchCustomerDetail(${customerId}) URL:`, requestUrl);
  console.log(`[GoogleAds][diag] fetchCustomerDetail(${customerId}) login-customer-id:`, mccCustomerId || "(not set)");

  const requestHeaders = {
    ...buildHeaders(accessToken, developerToken, mccCustomerId),
    "Content-Type": "application/json",
  };

  const res = await fetch(requestUrl, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  const rawText = await res.text();
  console.log(`[GoogleAds][diag] fetchCustomerDetail(${customerId}) status:`, res.status);
  console.log(`[GoogleAds][diag] fetchCustomerDetail(${customerId}) response body:`, rawText);

  const fallback: GoogleAdsAccount = {
    id: customerId,
    name: customerId,
    currencyCode: "",
    resourceName: `customers/${customerId}`,
  };

  let body: SearchResponse & GoogleAdsApiError;
  try {
    body = JSON.parse(rawText) as SearchResponse & GoogleAdsApiError;
  } catch {
    console.error(`[GoogleAds] fetchCustomerDetail(${customerId}) non-JSON response:`, rawText);
    return fallback;
  }

  if (!res.ok || body.error) {
    console.error(
      `[GoogleAds] fetchCustomerDetail(${customerId}) API error:`,
      body.error?.message ?? res.statusText
    );
    // Return fallback so the account still appears in the UI even when
    // detail fetch fails (e.g. test-access token on a production account).
    return fallback;
  }

  const customer = body.results?.[0]?.customer;
  if (!customer) {
    console.warn(`[GoogleAds] fetchCustomerDetail(${customerId}) no results in search response`);
    return fallback;
  }

  return {
    id: customer.id ?? customerId,
    name: customer.descriptiveName ?? `Account ${customerId}`,
    currencyCode: customer.currencyCode ?? "",
    resourceName: customer.resourceName ?? `customers/${customerId}`,
  };
}

export async function listAccessibleCustomers(
  accessToken: string,
  developerToken: string,
  mccCustomerId: string
): Promise<GoogleAdsAccount[]> {
  const requestUrl = `${GOOGLE_ADS_API_BASE}/customers:listAccessibleCustomers`;

  // --- DIAGNOSTIC: inputs ---
  console.log("[GoogleAds][diag] access_token length:", accessToken.length);
  console.log("[GoogleAds][diag] access_token prefix (first 20):", accessToken.slice(0, 20));
  console.log("[GoogleAds][diag] developer-token length:", developerToken.length);
  console.log("[GoogleAds][diag] developer-token prefix (first 5):", developerToken.slice(0, 5));
  console.log("[GoogleAds][diag] mccCustomerId received:", mccCustomerId ? `"${mccCustomerId}" (len=${mccCustomerId.length})` : "(empty or undefined)");

  // --- DIAGNOSTIC: headers being built ---
  // buildHeaders() is called WITHOUT mccCustomerId for this endpoint.
  // login-customer-id is therefore NOT included in the request.
  const requestHeaders = buildHeaders(accessToken, developerToken);
  console.log("[GoogleAds][diag] login-customer-id sent:", "login-customer-id" in requestHeaders ? requestHeaders["login-customer-id"] : "NOT SENT");
  console.log("[GoogleAds][diag] exact outbound headers (masked):", {
    Authorization: `Bearer ${accessToken.slice(0, 20)}...[len=${accessToken.length}]`,
    "developer-token": `${developerToken.slice(0, 5)}...[len=${developerToken.length}]`,
    "login-customer-id": "login-customer-id" in requestHeaders ? requestHeaders["login-customer-id"] : "(not present)",
    "all header keys": Object.keys(requestHeaders),
  });

  const res = await fetch(requestUrl, {
    headers: requestHeaders,
    cache: "no-store",
  });

  const rawText = await res.text();

  // --- DIAGNOSTIC: response ---
  console.log("[GoogleAds][diag] response status:", res.status);
  console.log("[GoogleAds][diag] response URL (after redirects):", res.url);
  console.log("[GoogleAds][diag] response headers:", Object.fromEntries(res.headers.entries()));
  console.log("[GoogleAds][diag] response body (full):", rawText);

  let body: ListAccessibleCustomersResponse & GoogleAdsApiError;
  try {
    body = JSON.parse(rawText) as ListAccessibleCustomersResponse & GoogleAdsApiError;
  } catch {
    console.error("[GoogleAds] listAccessibleCustomers non-JSON response:\n", rawText);
    throw new Error(`Google Ads API returned non-JSON response (status ${res.status})`);
  }

  if (!res.ok || body.error) {
    throw new Error(
      body.error?.message ?? `Google Ads API error: ${res.statusText}`
    );
  }

  console.log("[GoogleAds][diag] parsed resourceNames:", body.resourceNames ?? "(key absent from response)");
  console.log("[GoogleAds][diag] resourceNames count:", (body.resourceNames ?? []).length);

  const resourceNames = (body.resourceNames ?? []).slice(0, MAX_ACCOUNTS);

  console.log("[GoogleAds][diag] accounts to detail-fetch (after MAX_ACCOUNTS slice):", resourceNames.length);

  const results = await Promise.allSettled(
    resourceNames.map((name) =>
      fetchCustomerDetail(
        extractCustomerId(name),
        accessToken,
        developerToken,
        mccCustomerId
      )
    )
  );

  const accounts: GoogleAdsAccount[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      accounts.push(result.value);
    }
  }
  return accounts;
}
