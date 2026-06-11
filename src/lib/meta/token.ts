/**
 * Single source of truth for reading the active Meta Ads access token.
 * Reads from connector.config — NOT from oauth_pending_sessions.
 *
 * Meta long-lived tokens are valid for ~60 days. We store the expiry
 * alongside the token so we can surface "Token expired — Reconnect" before
 * any API call is attempted.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type MetaConnectorConfig = {
  currency?: string;
  access_token?: string;
  token_expires_at?: string; // ISO date string
};

/** Number of milliseconds a long-lived Meta token is valid for (60 days). */
export const META_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/** Returns an ISO date 60 days from now — use when storing a new token. */
export function metaTokenExpiresAt(): string {
  return new Date(Date.now() + META_TOKEN_TTL_MS).toISOString();
}

export type MetaTokenResult =
  | {
      status: "ok";
      accessToken: string;
      connectorId: string;
      accountId: string;
      currency: string;
      tokenExpiresAt: string | null;
    }
  | { status: "expired"; connectorId: string; accountId: string }
  | { status: "missing"; connectorId: string }
  | { status: "not_connected" };

/**
 * Resolves the active Meta Ads token for a workspace from the connectors table.
 * Never touches oauth_pending_sessions.
 */
export async function getActiveMetaToken(
  workspaceId: string
): Promise<MetaTokenResult> {
  const admin = createAdminClient();

  const { data: connector } = await admin
    .from("connectors")
    .select("id, external_account_id, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", "meta_ads")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connector) return { status: "not_connected" };

  const config = (connector.config ?? {}) as MetaConnectorConfig;
  const token = config.access_token;
  const accountId = String(connector.external_account_id ?? "");

  if (!token) return { status: "missing", connectorId: connector.id };

  if (config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at).getTime();
    if (Date.now() >= expiresAt) {
      return { status: "expired", connectorId: connector.id, accountId };
    }
  }

  return {
    status: "ok",
    accessToken: token,
    connectorId: connector.id,
    accountId,
    currency: config.currency ?? "USD",
    tokenExpiresAt: config.token_expires_at ?? null,
  };
}

/**
 * Marks a Meta connector as errored (e.g. after a 190 invalid-token response).
 * Called by sync/insights routes when the Meta API rejects the stored token.
 */
export async function markMetaConnectorTokenError(
  connectorId: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("connectors")
    .update({ status: "error", updated_at: new Date().toISOString() })
    .eq("id", connectorId);
}
