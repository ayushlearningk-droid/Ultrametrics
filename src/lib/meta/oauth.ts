import {
  META_GRAPH_VERSION,
  META_OAUTH_SCOPES,
} from "@/lib/meta/constants";
import type { MetaOAuthConfig } from "@/lib/meta/config";

const FACEBOOK_OAUTH_BASE = "https://www.facebook.com";
const GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

function parseTokenResponse(body: unknown): TokenResponse {
  if (
    typeof body === "object" &&
    body !== null &&
    "access_token" in body &&
    typeof (body as TokenResponse).access_token === "string"
  ) {
    return body as TokenResponse;
  }

  const message =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: { message?: string } }).error?.message ===
      "string"
      ? (body as { error: { message: string } }).error.message
      : "Invalid token response from Meta";

  throw new Error(message);
}

export function buildMetaAuthorizeUrl(
  config: MetaOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
  client_id: config.appId,
  config_id: config.configId,
  redirect_uri: config.redirectUri,
  state,
  scope: META_OAUTH_SCOPES.join(","),
  response_type: "code",
});

  return `${FACEBOOK_OAUTH_BASE}/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(
  config: MetaOAuthConfig,
  code: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const res = await fetch(
    `${GRAPH_BASE}/oauth/access_token?${params.toString()}`
  );
  const body = await res.json();

  if (!res.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: { message?: string } }).error?.message ===
        "string"
        ? (body as { error: { message: string } }).error.message
        : "Meta token exchange failed";
    throw new Error(message);
  }

  return parseTokenResponse(body);
}

/** Exchange short-lived user token for a long-lived token (~60 days). */
export async function exchangeForLongLivedToken(
  config: MetaOAuthConfig,
  shortLivedToken: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(
    `${GRAPH_BASE}/oauth/access_token?${params.toString()}`
  );
  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error?: { message?: string } }).error?.message ===
          "string"
        ? (body as { error: { message: string } }).error.message
        : "Failed to obtain long-lived Meta token"
    );
  }

  return parseTokenResponse(body);
}
