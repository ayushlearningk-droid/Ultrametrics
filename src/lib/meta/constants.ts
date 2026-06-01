/** Meta Graph API version — https://developers.facebook.com/docs/graph-api */
export const META_GRAPH_VERSION = "v21.0";

/** Permissions for ad account access (Step 3+). */
export const META_OAUTH_SCOPES = ["ads_read", "public_profile"] as const;

export const META_OAUTH_COOKIE_STATE = "ultrametrics_meta_oauth_state";
export const META_OAUTH_COOKIE_WORKSPACE = "ultrametrics_meta_oauth_workspace";
export const META_OAUTH_COOKIE_MAX_AGE = 600; // 10 minutes

/** How long a pending OAuth row remains valid before account selection. */
export const META_OAUTH_PENDING_TTL_SECONDS = 900; // 15 minutes
