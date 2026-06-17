import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { requireWorkspaceRoleOrRedirect } from "@/lib/api/require-workspace-role";
import { getMetaOAuthConfig } from "@/lib/meta/config";
import { setMetaOAuthCookies } from "@/lib/meta/oauth-cookies";
import { metaConnectUrl } from "@/lib/meta/oauth-redirect";
import { buildMetaAuthorizeUrl } from "@/lib/meta/oauth";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const config = getMetaOAuthConfig();
  if (!config) {
    return NextResponse.redirect(
      metaConnectUrl({ error: "meta_not_configured" })
    );
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.redirect(
      metaConnectUrl({ error: "missing_workspace" })
    );
  }

  // RBAC: starting a connector OAuth flow is an owner/admin action.
  const access = await requireWorkspaceRoleOrRedirect(
    workspaceId,
    ["owner", "admin"],
    () => metaConnectUrl({ error: "forbidden" })
  );
  if (!access.ok) {
    return NextResponse.redirect(access.redirect!);
  }

  const state = randomBytes(32).toString("hex");
  await setMetaOAuthCookies(state, workspaceId);

  const authorizeUrl = buildMetaAuthorizeUrl(config, state);
  return NextResponse.redirect(authorizeUrl);
}
