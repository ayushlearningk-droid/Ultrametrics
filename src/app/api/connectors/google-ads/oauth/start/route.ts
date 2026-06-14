import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { isWorkspaceMember } from "@/lib/api/workspace-access";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAdsConfig } from "@/lib/google-ads/config";
import { setGoogleAdsOAuthCookies } from "@/lib/google-ads/oauth-cookies";
import { googleAdsConnectUrl } from "@/lib/google-ads/oauth-redirect";
import { GOOGLE_ADS_OAUTH_SCOPES } from "@/lib/google-ads/constants";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const config = getGoogleAdsConfig();
  if (!config) {
    return NextResponse.redirect(
      googleAdsConnectUrl({ error: "google_ads_not_configured" })
    );
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.redirect(
      googleAdsConnectUrl({ error: "missing_workspace" })
    );
  }

  const supabase = await createClient();
  const allowed = await isWorkspaceMember(supabase, workspaceId, user.id);
  if (!allowed) {
    return NextResponse.redirect(googleAdsConnectUrl({ error: "forbidden" }));
  }

  const state = randomBytes(32).toString("hex");
  await setGoogleAdsOAuthCookies(state, workspaceId);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_ADS_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
