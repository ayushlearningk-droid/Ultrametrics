import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { requireWorkspaceRoleOrRedirect } from "@/lib/api/require-workspace-role";
import { getGoogleOAuthConfig } from "@/lib/google/config";
import { setGoogleOAuthCookies } from "@/lib/google/oauth-cookies";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
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

  // RBAC: starting a connector OAuth flow is an owner/admin action.
  const access = await requireWorkspaceRoleOrRedirect(
    workspaceId,
    ["owner", "admin"],
    () => new URL("/dashboard/connectors?error=forbidden", request.url)
  );
  if (!access.ok) {
    return NextResponse.redirect(access.redirect!);
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
