/**
 * Connector credentials data layer (C2 Step 1).
 *
 * Bridges the token vault (AES-256-GCM) and the `connector_credentials` table.
 * Stores access tokens (all providers) and optional refresh tokens (Google /
 * Google Ads). Meta connectors store only an access token.
 *
 * NOTE: created in Step 1 but NOT yet wired into any OAuth/sync route. Routes
 * continue to read/write connectors.config until later steps. This module has
 * no callers yet by design.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptToken,
  decryptToken,
  type EncryptedToken,
} from "@/lib/crypto/token-vault";
import { recordCredentialAccess } from "@/lib/data/credential-access-log";

/** Optional context used only for audit logging (never affects behavior). */
export interface CredentialAuditContext {
  workspaceId?: string | null;
}

/**
 * Raised when a credential operation targets a connector that does not belong to
 * the supplied workspace. Defense-in-depth (Sprint 55B): connector_credentials
 * has RLS deny-all and is reached only via the service role, so workspace
 * authorization lives in app code — this makes it explicit and centralized.
 */
export class CredentialAuthorizationError extends Error {
  constructor(connectorId: string, workspaceId: string) {
    super(
      `Connector ${connectorId} does not belong to workspace ${workspaceId}.`
    );
    this.name = "CredentialAuthorizationError";
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Centralized authorization: verify a connector belongs to the given workspace.
 * Throws CredentialAuthorizationError when it does not (or does not exist).
 * Uses the service-role client by design (the vault is server-only).
 */
export async function assertConnectorInWorkspace(
  connectorId: string,
  workspaceId: string,
  admin: AdminClient = createAdminClient()
): Promise<void> {
  const { data } = await admin
    .from("connectors")
    .select("id")
    .eq("id", connectorId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<{ id: string }>();

  if (!data) {
    await recordCredentialAccess({
      connectorId,
      workspaceId,
      action: "authorize",
      success: false,
      reason: "connector does not belong to workspace",
    });
    throw new CredentialAuthorizationError(connectorId, workspaceId);
  }
}

export interface StoreTokenInput {
  connectorId: string;
  accessToken: string;
  /** Optional — Google / Google Ads only. Meta has no refresh token. */
  refreshToken?: string | null;
  /** ISO timestamp the access token expires, if known. */
  tokenExpiresAt?: string | null;
}

export interface ResolvedToken {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  keyVersion: number;
}

/**
 * Encrypt and upsert a connector's token(s) into connector_credentials.
 * One row per connector (connector_id is the PK), so this overwrites on
 * reconnect / refresh.
 */
export async function storeConnectorToken(
  input: StoreTokenInput,
  audit: CredentialAuditContext = {}
): Promise<void> {
  const admin = createAdminClient();

  const access = encryptToken(input.accessToken);
  const refresh =
    input.refreshToken != null && input.refreshToken !== ""
      ? encryptToken(input.refreshToken)
      : null;

  const { error } = await admin.from("connector_credentials").upsert(
    {
      connector_id: input.connectorId,
      access_token_ciphertext: access.ciphertext,
      access_token_iv: access.iv,
      access_token_tag: access.tag,
      refresh_token_ciphertext: refresh?.ciphertext ?? null,
      refresh_token_iv: refresh?.iv ?? null,
      refresh_token_tag: refresh?.tag ?? null,
      token_expires_at: input.tokenExpiresAt ?? null,
      key_version: access.keyVersion,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "connector_id" }
  );

  await recordCredentialAccess({
    connectorId: input.connectorId,
    workspaceId: audit.workspaceId,
    action: "store",
    success: !error,
    reason: error ? "upsert failed" : null,
    keyVersion: access.keyVersion,
  });

  if (error) {
    throw new Error(`Failed to store connector credentials: ${error.message}`);
  }
}

/**
 * Fetch and decrypt a connector's token(s). Returns null when no credential
 * row exists (caller decides whether to fall back to config — that fallback
 * lives in later steps, not here).
 *
 * Throws only on decryption/auth-tag failure (tamper or wrong key); the caller
 * should catch and mark the connector as needing reconnection.
 */
export async function getConnectorToken(
  connectorId: string,
  audit: CredentialAuditContext = {}
): Promise<ResolvedToken | null> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("connector_credentials")
    .select(
      "access_token_ciphertext, access_token_iv, access_token_tag, " +
        "refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, " +
        "token_expires_at, key_version"
    )
    .eq("connector_id", connectorId)
    .maybeSingle<{
      access_token_ciphertext: string;
      access_token_iv: string;
      access_token_tag: string;
      refresh_token_ciphertext: string | null;
      refresh_token_iv: string | null;
      refresh_token_tag: string | null;
      token_expires_at: string | null;
      key_version: number;
    }>();

  if (!row) return null;
  const data = row;

  const accessEnvelope: EncryptedToken = {
    ciphertext: data.access_token_ciphertext,
    iv: data.access_token_iv,
    tag: data.access_token_tag,
    keyVersion: data.key_version,
  };

  try {
    let refreshToken: string | null = null;
    if (
      data.refresh_token_ciphertext &&
      data.refresh_token_iv &&
      data.refresh_token_tag
    ) {
      refreshToken = decryptToken({
        ciphertext: data.refresh_token_ciphertext,
        iv: data.refresh_token_iv,
        tag: data.refresh_token_tag,
        keyVersion: data.key_version,
      });
    }

    const resolved: ResolvedToken = {
      accessToken: decryptToken(accessEnvelope),
      refreshToken,
      tokenExpiresAt: data.token_expires_at,
      keyVersion: data.key_version,
    };

    await recordCredentialAccess({
      connectorId,
      workspaceId: audit.workspaceId,
      action: "read",
      success: true,
      keyVersion: data.key_version,
    });

    return resolved;
  } catch (err) {
    // Decryption / auth-tag failure (tamper or wrong key). Audit, then rethrow.
    await recordCredentialAccess({
      connectorId,
      workspaceId: audit.workspaceId,
      action: "read",
      success: false,
      reason: "decryption failed",
      keyVersion: data.key_version,
    });
    throw err;
  }
}

/** Delete a connector's stored credentials (e.g. on disconnect). */
export async function deleteConnectorToken(
  connectorId: string,
  audit: CredentialAuditContext = {}
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("connector_credentials")
    .delete()
    .eq("connector_id", connectorId);

  await recordCredentialAccess({
    connectorId,
    workspaceId: audit.workspaceId,
    action: "delete",
    success: !error,
    reason: error ? "delete failed" : null,
  });

  if (error) {
    throw new Error(`Failed to delete connector credentials: ${error.message}`);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Workspace-scoped variants (Sprint 55B — defense-in-depth).
 *
 * Prefer these in any path where the workspace is known (OAuth callbacks, sync
 * jobs, API routes). Each verifies the connector belongs to the workspace via
 * assertConnectorInWorkspace BEFORE touching credentials, then delegates to the
 * existing unscoped helper. The unscoped helpers remain for callers that have
 * already authorized the connector upstream (backward compatible).
 * ──────────────────────────────────────────────────────────────────────────── */

/** Store token(s) for a connector after verifying workspace ownership. */
export async function storeConnectorTokenForWorkspace(
  workspaceId: string,
  input: StoreTokenInput
): Promise<void> {
  await assertConnectorInWorkspace(input.connectorId, workspaceId);
  return storeConnectorToken(input, { workspaceId });
}

/** Fetch + decrypt token(s) for a connector after verifying workspace ownership. */
export async function getConnectorTokenForWorkspace(
  connectorId: string,
  workspaceId: string
): Promise<ResolvedToken | null> {
  await assertConnectorInWorkspace(connectorId, workspaceId);
  return getConnectorToken(connectorId, { workspaceId });
}

/** Delete a connector's credentials after verifying workspace ownership. */
export async function deleteConnectorTokenForWorkspace(
  connectorId: string,
  workspaceId: string
): Promise<void> {
  await assertConnectorInWorkspace(connectorId, workspaceId);
  return deleteConnectorToken(connectorId, { workspaceId });
}
