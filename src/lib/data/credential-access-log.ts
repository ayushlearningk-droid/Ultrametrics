/**
 * Credential access audit log (Sprint 55D — Phase D).
 *
 * Records METADATA ONLY for every credential operation: which connector/workspace,
 * the action, success/failure, a short reason, and the key version. It NEVER
 * stores a plaintext token, ciphertext, IV, or auth tag — no secret may ever be
 * logged here.
 *
 * Writing the audit row is best-effort: a logging failure must never break the
 * underlying credential operation, so insert errors are swallowed (and surfaced
 * to the server console). The table is append-only + immutable at the database
 * level (see migration 20260701000000_credential_access_log.sql).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type CredentialAction = "store" | "read" | "delete" | "authorize";

export interface CredentialAccessEntry {
  connectorId: string;
  workspaceId?: string | null;
  action: CredentialAction;
  success: boolean;
  /** Short, non-sensitive reason. Must never contain a token or secret. */
  reason?: string | null;
  keyVersion?: number | null;
}

/** Append one audit row. Best-effort: never throws. */
export async function recordCredentialAccess(
  entry: CredentialAccessEntry
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("connector_credential_access_log").insert({
      connector_id: entry.connectorId,
      workspace_id: entry.workspaceId ?? null,
      action: entry.action,
      success: entry.success,
      reason: entry.reason ?? null,
      key_version: entry.keyVersion ?? null,
    });
  } catch (err) {
    // Audit logging must never block a credential operation.
    console.error("[audit] failed to record credential access:", err);
  }
}
