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

type CustomerDetailResponse = {
  resourceName?: string;
  id?: string;
  descriptiveName?: string;
  currencyCode?: string;
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
  const res = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}`, {
    headers: buildHeaders(accessToken, developerToken, mccCustomerId),
    cache: "no-store",
  });

  const rawText = await res.text();
  console.debug(`[GoogleAds] fetchCustomerDetail(${customerId}) status:`, res.status);
  console.debug(`[GoogleAds] fetchCustomerDetail(${customerId}) headers:`, Object.fromEntries(res.headers.entries()));
  console.debug(`[GoogleAds] fetchCustomerDetail(${customerId}) body (first 1000):`, rawText.slice(0, 1000));

  let body: CustomerDetailResponse & GoogleAdsApiError;
  try {
    body = JSON.parse(rawText) as CustomerDetailResponse & GoogleAdsApiError;
  } catch {
    console.error(`[GoogleAds] fetchCustomerDetail(${customerId}) non-JSON response:\n`, rawText);
    return null;
  }

  if (!res.ok || body.error) {
    console.error(
      `Google Ads: failed to fetch customer ${customerId}:`,
      body.error?.message ?? res.statusText
    );
    return null;
  }

  return {
    id: body.id ?? customerId,
    name: body.descriptiveName ?? `Account ${customerId}`,
    currencyCode: body.currencyCode ?? "",
    resourceName: body.resourceName ?? `customers/${customerId}`,
  };
}

export async function listAccessibleCustomers(
  accessToken: string,
  developerToken: string,
  mccCustomerId: string
): Promise<GoogleAdsAccount[]> {
  const res = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers:listAccessibleCustomers`,
    {
      // login-customer-id is not required for this endpoint
      headers: buildHeaders(accessToken, developerToken),
      cache: "no-store",
    }
  );

  const rawText = await res.text();
  console.debug("[GoogleAds] listAccessibleCustomers status:", res.status);
  console.debug("[GoogleAds] listAccessibleCustomers headers:", Object.fromEntries(res.headers.entries()));
  console.debug("[GoogleAds] listAccessibleCustomers body (first 1000):", rawText.slice(0, 1000));

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

  const resourceNames = (body.resourceNames ?? []).slice(0, MAX_ACCOUNTS);

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
