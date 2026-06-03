import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { isWorkspaceMember } from "@/lib/api/workspace-access";
import { createClient } from "@/lib/supabase/server";
import { getGoogleOAuthConfig } from "@/lib/google/config";
import { setGoogleOAuthCookies } from "@/lib/google/oauth-cookies";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/dashboard/connectors?error=google_not_configured", request.url));
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.redirect(new URL("/dashboard/connectors?error=missing_workspace", request.url));
  }

  const supabase = await createClient();
  const allowed = await isWorkspaceMember(supabase, workspaceId, user.id);
  if (!allowed) {
    return NextResponse.redirect(new URL("/dashboard/connectors?error=forbidden", request.url));
  }

  const state = randomBytes(32).toString("hex");
  await setGoogleOAuthCookies(state, workspaceId);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
