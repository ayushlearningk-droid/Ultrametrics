import { getAppOrigin } from "@/lib/app-url";

export type GoogleAdsConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  developerToken: string;
  mccCustomerId: string;
};

export function getGoogleAdsOAuthRedirectUri(): string {
  const configured = process.env.GOOGLE_ADS_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return `${getAppOrigin()}/api/connectors/google-ads/oauth/callback`;
}

export function getGoogleAdsConfig(): GoogleAdsConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const mccCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.trim();

  console.debug("[GoogleAds] config env check:", {
    GOOGLE_CLIENT_ID: !!clientId,
    GOOGLE_CLIENT_SECRET: !!clientSecret,
    GOOGLE_ADS_DEVELOPER_TOKEN: !!developerToken,
    GOOGLE_ADS_MCC_CUSTOMER_ID: !!mccCustomerId,
  });

  if (!clientId || !clientSecret || !developerToken || !mccCustomerId) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getGoogleAdsOAuthRedirectUri(),
    developerToken,
    mccCustomerId,
  };
}

export function requireGoogleAdsConfig(): GoogleAdsConfig {
  const config = getGoogleAdsConfig();
  if (!config) {
    throw new Error(
      "Google Ads is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN, and GOOGLE_ADS_MCC_CUSTOMER_ID."
    );
  }
  return config;
}
