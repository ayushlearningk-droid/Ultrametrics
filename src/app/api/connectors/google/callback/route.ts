import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { isWorkspaceMember } from "@/lib/api/workspace-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireGoogleOAuthConfig } from "@/lib/google/config";
import { clearGoogleOAuthCookies, readGoogleOAuthCookies } from "@/lib/google/oauth-cookies";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");
  if (oauthError) {
    await clearGoogleOAuthCookies();
    return NextResponse.redirect(new URL("/dashboard/connectors?error=google_denied", request.url));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    await clearGoogleOAuthCookies();
    return NextResponse.redirect(new URL("/dashboard/connectors?error=invalid_callback", request.url));
  }

  const { state: cookieState, workspaceId } = await readGoogleOAuthCookies();
  if (!cookieState || !workspaceId || cookieState !== state) {
    await clearGoogleOAuthCookies();
    return NextResponse.redirect(new URL("/dashboard/connectors?error=invalid_state", request.url));
  }

  const supabase = await createClient();
  const allowed = await isWorkspaceMember(supabase, workspaceId, user.id);
  if (!allowed) {
    await clearGoogleOAuthCookies();
    return NextResponse.redirect(new URL("/dashboard/connectors?error=forbidden", request.url));
  }

  try {
    const config = requireGoogleOAuthConfig();

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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
      expires_in?: number;
      error?: { message?: string };
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(
        tokenJson.error?.message ?? tokenJson.error_description ?? "Failed to exchange Google code"
      );
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });

    const profile = (await profileRes.json()) as {
      email?: string;
      name?: string;
      id?: string;
      error?: { message?: string };
      error_description?: string;
    };

    if (!profileRes.ok) {
      throw new Error(
        profile.error?.message ?? profile.error_description ?? "Failed to load Google profile"
      );
    }

    const tokenExpiresAt = new Date(
      Date.now() + (tokenJson.expires_in ?? 3600) * 1000
    ).toISOString();

    const admin = createAdminClient();
    const externalAccountId = profile.email ?? profile.id ?? "";

    const { data: existingConnector } = await admin
      .from("connectors")
      .select("id, config")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google_sheets")
      .eq("external_account_id", externalAccountId)
      .maybeSingle();

    if (existingConnector) {
      // Reconnect: merge new tokens into existing config, preserving spreadsheet selection
      const existingConfig = (existingConnector.config ?? {}) as Record<string, unknown>;
      const { error } = await admin
        .from("connectors")
        .update({
          status: "active",
          config: {
            ...existingConfig,
            access_token: tokenJson.access_token,
            // Preserve old refresh_token if Google didn't return a new one
            refresh_token: tokenJson.refresh_token ?? existingConfig.refresh_token ?? null,
            token_expires_at: tokenExpiresAt,
            google_email: profile.email ?? null,
            google_name: profile.name ?? null,
            connected_by: user.id,
          },
          external_account_name: profile.name ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnector.id);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("connectors").insert({
        workspace_id: workspaceId,
        name: "Google Sheets",
        provider: "google_sheets",
        status: "active",
        config: {
          access_token: tokenJson.access_token,
          refresh_token: tokenJson.refresh_token ?? null,
          token_expires_at: tokenExpiresAt,
          google_email: profile.email ?? null,
          google_name: profile.name ?? null,
          connected_by: user.id,
        },
        external_account_id: externalAccountId,
        external_account_name: profile.name ?? null,
        connected_by: user.id,
      });

      if (error) throw new Error(error.message);
    }

    await clearGoogleOAuthCookies();
    return NextResponse.redirect(
      new URL("/dashboard/connectors/google?google=success", request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    await clearGoogleOAuthCookies();
    return NextResponse.redirect(
      new URL("/dashboard/connectors?error=token_exchange", request.url)
    );
  }
}
