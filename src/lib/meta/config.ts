import { getAppOrigin } from "@/lib/app-url";

export type MetaOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

export function getMetaOAuthRedirectUri(): string {
  const configured = process.env.META_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return `${getAppOrigin()}/api/connectors/meta/oauth/callback`;
}

export function getMetaOAuthConfig(): MetaOAuthConfig | null {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return null;
  }

  return {
    appId,
    appSecret,
    redirectUri: getMetaOAuthRedirectUri(),
  };
}

export function requireMetaOAuthConfig(): MetaOAuthConfig {
  const config = getMetaOAuthConfig();
  if (!config) {
    throw new Error(
      "Meta OAuth is not configured. Set META_APP_ID and META_APP_SECRET."
    );
  }
  return config;
}
