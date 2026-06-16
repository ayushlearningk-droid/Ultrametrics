import { NextResponse } from "next/server";
import {
  getCurrentWorkspaceId,
  getUserWorkspaces,
} from "@/lib/data/workspaces";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLatestMetaPendingSession } from "@/lib/meta/pending";
import { metaTokenExpiresAt, type MetaConnectorConfig } from "@/lib/meta/token";
import { storeConnectorToken } from "@/lib/data/connector-credentials";
import { ensureWorkspaceSyncSchedule } from "@/lib/sync/ensure-workspace-schedule";

/**
 * C2 dual-write: store the encrypted access-token envelope alongside the
 * existing connectors.config write. Best-effort — a vault failure must never
 * break the connect flow. connectors.config stays authoritative until PR 4.
 */
async function dualWriteMetaToken(
  connectorId: string | null,
  accessToken: string | null
): Promise<void> {
  if (!connectorId || !accessToken) return;
  try {
    await storeConnectorToken({
      connectorId,
      accessToken,
      tokenExpiresAt: metaTokenExpiresAt(),
    });
  } catch (err) {
    console.error("[C2] meta connect dual-write failed:", err);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      accountId?: string;
      name?: string;
      currency?: string;
    };

    if (!body.accountId || !body.name) {
      return NextResponse.json(
        { error: "Missing required account fields" },
        { status: 400 }
      );
    }

    const workspaces = await getUserWorkspaces();

    const workspaceId =
      await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No active workspace found" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Read the pending session token so we can persist it into the connector.
    const pendingSession = await getLatestMetaPendingSession(workspaceId);
    const accessToken = pendingSession?.access_token ?? null;
    const tokenConfig: MetaConnectorConfig = {
      currency: body.currency ?? "INR",
      ...(accessToken && {
        access_token: accessToken,
        token_expires_at: metaTokenExpiresAt(),
      }),
    };

    const { data: existingConnector, error: existingError } =
      await admin
        .from("connectors")
        .select("id, config")
        .eq("workspace_id", workspaceId)
        .eq("provider", "meta_ads")
        .eq("external_account_id", body.accountId)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    // Existing connector — update token and re-activate rather than
    // returning a no-op duplicate response.
    if (existingConnector) {
      const prevConfig = (existingConnector.config ?? {}) as MetaConnectorConfig;
      await admin
        .from("connectors")
        .update({
          config: { ...prevConfig, ...tokenConfig },
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnector.id);

      await dualWriteMetaToken(existingConnector.id, accessToken);
      await ensureWorkspaceSyncSchedule(workspaceId).catch(() => {});
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { data, error } = await admin
      .from("connectors")
      .insert({
        workspace_id: workspaceId,
        provider: "meta_ads",
        name: body.name,
        status: "active",
        config: tokenConfig,
        external_account_id: body.accountId,
        external_account_name: body.name,
        connected_by: user.id,
      })
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await dualWriteMetaToken(data?.[0]?.id ?? null, accessToken);
    await ensureWorkspaceSyncSchedule(workspaceId).catch(() => {});
    return NextResponse.json({ ok: true, connector: data });
  } catch (err) {
    console.error("CONNECT API CRASH:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}