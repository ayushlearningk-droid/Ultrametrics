/** Google Ads REST API version — https://developers.google.com/google-ads/api/docs/release-notes */
export const GOOGLE_ADS_API_VERSION = "v19";

/** Base URL for all Google Ads REST API calls */
export const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

/** OAuth scope required for Google Ads API access */
export const GOOGLE_ADS_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/adwords",
] as const;

export const GOOGLE_ADS_OAUTH_COOKIE_STATE = "ultrametrics_google_ads_oauth_state";
export const GOOGLE_ADS_OAUTH_COOKIE_WORKSPACE = "ultrametrics_google_ads_oauth_workspace";

/** Cookie lifetime for the OAuth CSRF state — 10 minutes */
export const GOOGLE_ADS_OAUTH_COOKIE_MAX_AGE = 600;

/** How long the oauth_pending_sessions row is valid before account selection */
export const GOOGLE_ADS_OAUTH_PENDING_TTL_SECONDS = 900;

/** Cookie name used to bridge the refresh_token from callback to connect route */
export const GOOGLE_ADS_REFRESH_TOKEN_COOKIE =
  "ultrametrics_google_ads_refresh_token";
