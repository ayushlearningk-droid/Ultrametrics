import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { isWorkspaceMember } from "@/lib/api/workspace-access";
import {
  createOAuthPendingSession,
  deleteOAuthPendingForUserWorkspace,
} from "@/lib/data/oauth-pending";
import { requireMetaOAuthConfig } from "@/lib/meta/config";
import {
  clearMetaOAuthCookies,
  readMetaOAuthCookies,
} from "@/lib/meta/oauth-cookies";
import { metaConnectUrl } from "@/lib/meta/oauth-redirect";
import {
  exchangeCodeForAccessToken,
  exchangeForLongLivedToken,
} from "@/lib/meta/oauth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeConnectorToken } from "@/lib/data/connector-credentials";
import { metaTokenExpiresAt, type MetaConnectorConfig } from "@/lib/meta/token";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (oauthError) {
    await clearMetaOAuthCookies();
    return NextResponse.redirect(
      metaConnectUrl({
        error: "meta_denied",
        reason: errorDescription ?? oauthError,
      })
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    await clearMetaOAuthCookies();
    return NextResponse.redirect(metaConnectUrl({ error: "invalid_callback" }));
  }

  const { state: cookieState, workspaceId } = await readMetaOAuthCookies();
  console.log("========== META CALLBACK DEBUG ==========");
console.log("CALLBACK STATE:", state);
console.log("COOKIE STATE:", cookieState);
console.log("WORKSPACE ID:", workspaceId);
console.log("=========================================");

  if (!cookieState || !workspaceId || cookieState !== state) {
    await clearMetaOAuthCookies();
    return NextResponse.redirect(metaConnectUrl({ error: "invalid_state" }));
  }

  const supabase = await createClient();
  const allowed = await isWorkspaceMember(supabase, workspaceId, user.id);
  if (!allowed) {
    await clearMetaOAuthCookies();
    return NextResponse.redirect(metaConnectUrl({ error: "forbidden" }));
  }

  try {
    const config = requireMetaOAuthConfig();
    const shortLived = await exchangeCodeForAccessToken(config, code);

    let accessToken = shortLived.access_token;
    try {
      const longLived = await exchangeForLongLivedToken(config, accessToken);
      accessToken = longLived.access_token;
    } catch {
      // Keep short-lived token if long-lived exchange fails (e.g. dev mode limits)
    }

    await deleteOAuthPendingForUserWorkspace(user.id, workspaceId);
    await createOAuthPendingSession({
      userId: user.id,
      workspaceId,
      state,
      accessToken,
    });

    // Persist token into the existing connector so reconnect survives
    // beyond the 15-minute pending-session TTL.
    const admin = createAdminClient();
    const { data: existingConnector } = await admin
      .from("connectors")
      .select("id, config")
      .eq("workspace_id", workspaceId)
      .eq("provider", "meta_ads")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingConnector) {
      const tokenExpiresAt = metaTokenExpiresAt();
      // C2 Phase 1: tokens are no longer written to connectors.config — they
      // live only in the vault (dual-write below). Non-token config is preserved.
      await admin
        .from("connectors")
        .update({
          config: {
            ...((existingConnector.config ?? {}) as MetaConnectorConfig),
          },
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnector.id);

      // C2 fail-closed dual-write: store the encrypted envelope. If this throws
      // it propagates to the outer catch, which redirects with an error — the
      // reconnect is reported as failed rather than leaving the vault un-updated.
      await storeConnectorToken({
        connectorId: existingConnector.id,
        accessToken,
        tokenExpiresAt,
      });
    }

    await clearMetaOAuthCookies();

    return NextResponse.redirect(metaConnectUrl({ oauth: "success" }));
  } catch (err) {
    console.error("Meta OAuth callback error:", err);
    await clearMetaOAuthCookies();
    return NextResponse.redirect(metaConnectUrl({ error: "token_exchange" }));
  }
}
