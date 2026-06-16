import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/api/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";
import {
  getCampaignInsights,
  refreshGoogleAdsAccessToken,
} from "@/lib/google-ads/insights";
import { DEMO_GOOGLE_INSIGHTS } from "@/lib/dev/demo-data";
import { getConnectorToken } from "@/lib/data/connector-credentials";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("__dev_screenshot")?.value === "1") {
    return NextResponse.json(DEMO_GOOGLE_INSIGHTS);
  }

  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await getUserWorkspaces();
    const workspaceId = await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: connector, error: connectorError } = await admin
      .from("connectors")
      .select("id, external_account_id, external_account_name, config")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google_ads")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connectorError) {
      return NextResponse.json({ error: connectorError.message }, { status: 500 });
    }

    if (!connector?.external_account_id) {
      return NextResponse.json(
        { error: "No active Google Ads connector found. Connect an account first." },
        { status: 404 }
      );
    }

    const config = (connector.config ?? {}) as {
      refresh_token?: string;
      currency?: string;
    };

    // C2 vault-first read with config fallback.
    let refreshToken = config.refresh_token;
    try {
      const vault = await getConnectorToken(connector.id);
      if (vault?.refreshToken) refreshToken = vault.refreshToken;
    } catch (err) {
      console.error("[C2] google-ads vault read failed, using config fallback:", err);
    }

    if (!refreshToken) {
      return NextResponse.json(
        {
          error:
            "Google Ads connector is missing a refresh_token. " +
            "Disconnect and reconnect the account to re-authorize.",
        },
        { status: 400 }
      );
    }

    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
    const mccCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID?.trim();

    // --- DIAGNOSTIC: env and connector values before API call ---
    console.log("[GoogleAds][test-insights] === PRE-CALL DIAGNOSTIC ===");
    console.log("[GoogleAds][test-insights] connector.external_account_id:", connector.external_account_id);
    console.log("[GoogleAds][test-insights] GOOGLE_ADS_DEVELOPER_TOKEN present:", !!developerToken);
    console.log("[GoogleAds][test-insights] GOOGLE_ADS_DEVELOPER_TOKEN length:", developerToken?.length ?? 0);
    console.log("[GoogleAds][test-insights] GOOGLE_ADS_MCC_CUSTOMER_ID raw value:", mccCustomerId ?? "(not set)");
    console.log("[GoogleAds][test-insights] GOOGLE_ADS_MCC_CUSTOMER_ID has dashes:", mccCustomerId?.includes("-") ?? false);
    console.log("[GoogleAds][test-insights] config.refresh_token present:", !!config.refresh_token);

    if (!developerToken || !mccCustomerId) {
      return NextResponse.json(
        { error: "GOOGLE_ADS_DEVELOPER_TOKEN or GOOGLE_ADS_MCC_CUSTOMER_ID is not set" },
        { status: 500 }
      );
    }

    // Exchange refresh_token for a fresh access_token.
    const accessToken = await refreshGoogleAdsAccessToken(refreshToken);
    console.log("[GoogleAds][test-insights] access token refreshed successfully, length:", accessToken.length);

    const customerId = String(connector.external_account_id);
    console.log("[GoogleAds][test-insights] customerId to query:", customerId);

    const insights = await getCampaignInsights(
      accessToken,
      developerToken,
      customerId,
      mccCustomerId
    );

    return NextResponse.json({
      ok: true,
      accountId: customerId,
      accountName: connector.external_account_name,
      currency: config.currency ?? "",
      rowCount: insights.length,
      insights,
    });
  } catch (err) {
    console.error("[GoogleAds] test-insights failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Google Ads insights" },
      { status: 500 }
    );
  }
}
