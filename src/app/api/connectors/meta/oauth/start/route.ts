import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { isWorkspaceMember } from "@/lib/api/workspace-access";
import { getMetaOAuthConfig } from "@/lib/meta/config";
import { setMetaOAuthCookies } from "@/lib/meta/oauth-cookies";
import { metaConnectUrl } from "@/lib/meta/oauth-redirect";
import { buildMetaAuthorizeUrl } from "@/lib/meta/oauth";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const allowed = await isWorkspaceMember(supabase, workspaceId, user.id);
  if (!allowed) {
    return NextResponse.redirect(metaConnectUrl({ error: "forbidden" }));
  }

  const state = randomBytes(32).toString("hex");
  await setMetaOAuthCookies(state, workspaceId);

  const authorizeUrl = buildMetaAuthorizeUrl(config, state);
  return NextResponse.redirect(authorizeUrl);
}
