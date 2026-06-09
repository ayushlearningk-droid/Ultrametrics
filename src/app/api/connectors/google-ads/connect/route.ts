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
      .select("id")
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

    if (existingConnector) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Read the refresh_token stored by the OAuth callback.
    // May be absent if Google did not issue one (e.g. token already granted
    // to this app previously without prompt=consent). The sync engine will
    // handle this case when Phase 2 is built.
    const cookieStore = await cookies();
    const refreshToken =
      cookieStore.get(GOOGLE_ADS_REFRESH_TOKEN_COOKIE)?.value ?? null;

    const { error: insertError } = await admin.from("connectors").insert({
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
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Consume the refresh_token cookie — it is now persisted to connectors.config.
    cookieStore.delete(GOOGLE_ADS_REFRESH_TOKEN_COOKIE);

    // Clean up the pending session; the access_token it held is no longer
    // needed for account selection and the refresh_token is now in config.
    await deleteOAuthPendingForUserWorkspace(user.id, workspaceId, "google_ads");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Google Ads connect error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
