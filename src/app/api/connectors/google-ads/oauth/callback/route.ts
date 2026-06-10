import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/api/require-user";
import { isWorkspaceMember } from "@/lib/api/workspace-access";
import {
  createOAuthPendingSession,
  deleteOAuthPendingForUserWorkspace,
} from "@/lib/data/oauth-pending";
import { requireGoogleAdsConfig } from "@/lib/google-ads/config";
import {
  clearGoogleAdsOAuthCookies,
  readGoogleAdsOAuthCookies,
} from "@/lib/google-ads/oauth-cookies";
import {
  googleAdsConnectUrl,
  GOOGLE_ADS_SELECT_ACCOUNT_PATH,
} from "@/lib/google-ads/oauth-redirect";
import {
  GOOGLE_ADS_OAUTH_PENDING_TTL_SECONDS,
  GOOGLE_ADS_REFRESH_TOKEN_COOKIE,
} from "@/lib/google-ads/constants";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/app-url";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";


export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (oauthError) {
    await clearGoogleAdsOAuthCookies();
    return NextResponse.redirect(
      googleAdsConnectUrl({
        error: "google_ads_denied",
        reason: errorDescription ?? oauthError,
      })
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    await clearGoogleAdsOAuthCookies();
    return NextResponse.redirect(
      googleAdsConnectUrl({ error: "invalid_callback" })
    );
  }

  const { state: cookieState, workspaceId } = await readGoogleAdsOAuthCookies();

  if (!cookieState || !workspaceId || cookieState !== state) {
    await clearGoogleAdsOAuthCookies();
    return NextResponse.redirect(
      googleAdsConnectUrl({ error: "invalid_state" })
    );
  }

  const supabase = await createClient();
  const allowed = await isWorkspaceMember(supabase, workspaceId, user.id);
  if (!allowed) {
    await clearGoogleAdsOAuthCookies();
    return NextResponse.redirect(googleAdsConnectUrl({ error: "forbidden" }));
  }

  try {
    const config = requireGoogleAdsConfig();

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(
        tokenJson.error_description ??
          tokenJson.error ??
          "Token exchange failed"
      );
    }

    console.log("[GoogleAds] token exchange success");
    console.log("[GoogleAds] access_token length:", tokenJson.access_token.length);
    console.log("[GoogleAds] access_token prefix (first 20):", tokenJson.access_token.slice(0, 20));
    console.log("[GoogleAds] has refresh_token:", !!tokenJson.refresh_token);
    console.log("[GoogleAds] granted scopes:", tokenJson.scope ?? "(scope not in response)");

    await deleteOAuthPendingForUserWorkspace(user.id, workspaceId, "google_ads");
    await createOAuthPendingSession({
      userId: user.id,
      workspaceId,
      state,
      accessToken: tokenJson.access_token,
      provider: "google_ads",
    });

    console.log("[GoogleAds] access_token stored in oauth_pending_sessions");

    // Store the refresh_token in a short-lived httpOnly cookie so the connect
    // route can persist it to connectors.config when the connector row is
    // created. Google access tokens expire in ~1 hour; skipping this would
    // leave the connector unable to sync after Phase 2 is built.
    if (tokenJson.refresh_token) {
      const cookieStore = await cookies();
      cookieStore.set(
        GOOGLE_ADS_REFRESH_TOKEN_COOKIE,
        tokenJson.refresh_token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: GOOGLE_ADS_OAUTH_PENDING_TTL_SECONDS,
        }
      );
    }

    await clearGoogleAdsOAuthCookies();

    return NextResponse.redirect(
      new URL(GOOGLE_ADS_SELECT_ACCOUNT_PATH, getAppOrigin())
    );
  } catch (err) {
    console.error("Google Ads OAuth callback error:", err);
    await clearGoogleAdsOAuthCookies();
    return NextResponse.redirect(
      googleAdsConnectUrl({ error: "token_exchange" })
    );
  }
}
