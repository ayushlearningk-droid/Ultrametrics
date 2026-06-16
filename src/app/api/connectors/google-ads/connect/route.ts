import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentWorkspaceId,
  getUserWorkspaces,
} from "@/lib/data/workspaces";
import { deleteOAuthPendingForUserWorkspace } from "@/lib/data/oauth-pending";
import { GOOGLE_ADS_REFRESH_TOKEN_COOKIE } from "@/lib/google-ads/constants";
import { ensureWorkspaceSyncSchedule } from "@/lib/sync/ensure-workspace-schedule";
import { storeConnectorToken } from "@/lib/data/connector-credentials";

/**
 * C2 fail-closed dual-write: Google Ads connectors store only a refresh token
 * (the access token is fetched on demand during sync). The vault's access_token
 * envelope is required (NOT NULL), so it is written as an empty-string
 * placeholder while the real secret — the refresh token — is encrypted. If
 * storeConnectorToken throws it propagates to the route's outer try/catch,
 * failing the connect — a connector is never created/updated without its token
 * also landing in the vault.
 */
async function dualWriteGoogleAdsToken(
  connectorId: string | null,
  refreshToken: string | null
): Promise<void> {
  if (!connectorId || !refreshToken) return;
  await storeConnectorToken({ connectorId, accessToken: "", refreshToken });
}

type ConnectBody = {
  customerId?: string;
  customerName?: string;
  currencyCode?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ConnectBody;

    if (!body.customerId || !body.customerName) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, customerName" },
        { status: 400 }
      );
    }

    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No active workspace found" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existingConnector, error: existingError } = await admin
      .from("connectors")
      .select("id, config")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google_ads")
      .eq("external_account_id", body.customerId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    // Read the refresh_token stored by the OAuth callback regardless of
    // whether the connector is new or existing — reconnect must update it.
    const cookieStore = await cookies();
    const refreshToken =
      cookieStore.get(GOOGLE_ADS_REFRESH_TOKEN_COOKIE)?.value ?? null;

    if (existingConnector) {
      const prevConfig = (existingConnector.config ?? {}) as Record<string, unknown>;
      await admin
        .from("connectors")
        .update({
          config: {
            ...prevConfig,
            ...(body.currencyCode ? { currency: body.currencyCode } : {}),
            ...(refreshToken ? { refresh_token: refreshToken } : {}),
          },
          name: body.customerName,
          external_account_name: body.customerName,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnector.id);

      await dualWriteGoogleAdsToken(existingConnector.id, refreshToken);
      cookieStore.delete(GOOGLE_ADS_REFRESH_TOKEN_COOKIE);
      await deleteOAuthPendingForUserWorkspace(user.id, workspaceId, "google_ads");
      await ensureWorkspaceSyncSchedule(workspaceId).catch(() => {});

      return NextResponse.json({ ok: true, reconnected: true });
    }

    const { data: inserted, error: insertError } = await admin
      .from("connectors")
      .insert({
        workspace_id: workspaceId,
        provider: "google_ads",
        name: body.customerName,
        status: "active",
        config: {
          currency: body.currencyCode ?? "",
          refresh_token: refreshToken,
        },
        external_account_id: body.customerId,
        external_account_name: body.customerName,
        connected_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await dualWriteGoogleAdsToken(inserted?.id ?? null, refreshToken);

    // Consume the refresh_token cookie — it is now persisted to connectors.config.
    cookieStore.delete(GOOGLE_ADS_REFRESH_TOKEN_COOKIE);

    // Clean up the pending session; the access_token it held is no longer
    // needed for account selection and the refresh_token is now in config.
    await deleteOAuthPendingForUserWorkspace(user.id, workspaceId, "google_ads");
    await ensureWorkspaceSyncSchedule(workspaceId).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Google Ads connect error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
