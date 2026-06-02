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

    await clearMetaOAuthCookies();

    return NextResponse.redirect(metaConnectUrl({ oauth: "success" }));
  } catch (err) {
    console.error("Meta OAuth callback error:", err);
    await clearMetaOAuthCookies();
    return NextResponse.redirect(metaConnectUrl({ error: "token_exchange" }));
  }
}
