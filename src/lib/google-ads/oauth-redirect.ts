import { getAppOrigin } from "@/lib/app-url";

export const GOOGLE_ADS_CONNECT_PATH = "/dashboard/connectors/google-ads";
export const GOOGLE_ADS_SELECT_ACCOUNT_PATH =
  "/dashboard/connectors/google-ads/select-account";

export function googleAdsConnectUrl(params?: Record<string, string>): string {
  const origin = getAppOrigin();
  const url = new URL(GOOGLE_ADS_CONNECT_PATH, origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
