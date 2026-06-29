import { createAdminClient } from "@/lib/supabase/admin";
import { META_OAUTH_PENDING_TTL_SECONDS } from "@/lib/meta/constants";
import {
  encryptToken,
  decryptToken,
  type EncryptedToken,
} from "@/lib/crypto/token-vault";
import type { OAuthPendingSession } from "@/types/database";

/**
 * Pending-session token encoding (Sprint 55C).
 *
 * The short-lived OAuth access token in oauth_pending_sessions.access_token is
 * now encrypted at rest with the existing AES-256-GCM Token Vault. The encrypted
 * envelope is JSON-serialized and stored in the same TEXT column (no schema
 * change). Reads decrypt transparently; legacy plaintext rows (pre-migration,
 * transient) are detected and returned as-is for backward compatibility.
 * Tampered/undecryptable envelopes fail closed (throw).
 */
function isEncryptedEnvelope(value: unknown): value is EncryptedToken {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ciphertext === "string" &&
    typeof v.iv === "string" &&
    typeof v.tag === "string" &&
    typeof v.keyVersion === "number"
  );
}

/** Encrypt a pending access token into the stored column representation. */
export function encodePendingAccessToken(plaintext: string): string {
  return JSON.stringify(encryptToken(plaintext));
}

/**
 * Decrypt a stored pending access token. Returns legacy plaintext unchanged when
 * the value is not an encrypted envelope. Fail-closed: a value that parses as an
 * envelope but fails authentication throws (caller treats the session as
 * unusable).
 */
export function decodePendingAccessToken(stored: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return stored; // legacy plaintext token (not JSON)
  }
  if (isEncryptedEnvelope(parsed)) return decryptToken(parsed);
  return stored; // JSON, but not an envelope → legacy value
}

export type CreateOAuthPendingInput = {
  userId: string;
  workspaceId: string;
  state: string;
  accessToken: string;
  provider?: string;
};

export async function createOAuthPendingSession(
  input: CreateOAuthPendingInput
): Promise<OAuthPendingSession> {
  const admin = createAdminClient();
  const expiresAt = new Date(
    Date.now() + META_OAUTH_PENDING_TTL_SECONDS * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("oauth_pending_sessions")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      provider: input.provider ?? "meta_ads",
      state: input.state,
      access_token: encodePendingAccessToken(input.accessToken),
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to store OAuth session");
  }

  // Keep the return contract as plaintext (the column now holds an envelope).
  const row = data as OAuthPendingSession;
  return { ...row, access_token: input.accessToken };
}

export async function deleteOAuthPendingForUserWorkspace(
  userId: string,
  workspaceId: string,
  provider = "meta_ads"
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("oauth_pending_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);
}
