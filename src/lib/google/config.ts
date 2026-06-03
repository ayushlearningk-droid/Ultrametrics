import { getAppOrigin } from "@/lib/app-url";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getGoogleOAuthRedirectUri(): string {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${getAppOrigin()}/api/connectors/google/callback`;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getGoogleOAuthRedirectUri(),
  };
}

export function requireGoogleOAuthConfig(): GoogleOAuthConfig {
  const config = getGoogleOAuthConfig();

  if (!config) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    );
  }

  return config;
}
