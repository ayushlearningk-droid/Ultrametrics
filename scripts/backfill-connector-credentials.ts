/**
 * C2 Token Vault — PR 2: one-off backfill.
 *
 * Reads existing plaintext OAuth tokens from connectors.config and writes their
 * AES-256-GCM envelopes into connector_credentials via the Step-1 vault.
 *
 * SCOPE / SAFETY:
 *  - READ-ONLY against connectors.config — it is never modified or cleared.
 *  - WRITE-ONLY into connector_credentials, which no runtime code reads yet
 *    (read cutover is PR 3). So this changes no production behavior.
 *  - Idempotent & re-runnable: storeConnectorToken upserts on connector_id, so
 *    re-running simply re-encrypts the same plaintext (a fresh IV each time).
 *  - Reversible: `DELETE FROM connector_credentials` undoes the entire backfill.
 *
 * USAGE:
 *   # dry run (no writes) — prints what WOULD be backfilled:
 *   npx tsx scripts/backfill-connector-credentials.ts --dry-run
 *
 *   # real run:
 *   npx tsx scripts/backfill-connector-credentials.ts
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * TOKEN_ENCRYPTION_KEY. These are auto-loaded from .env.local if present.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeConnectorToken } from "@/lib/data/connector-credentials";

/* ── Minimal .env.local loader (no dotenv dependency) ─────────────────────── */
/* Vault + admin client read env lazily (at call time), so populating
 * process.env before main() runs is sufficient — import order does not matter. */
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // No .env.local — rely on the ambient environment.
  }
}

loadEnvLocal();

interface ConnectorConfig {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
}

interface ConnectorRow {
  id: string;
  provider: string;
  status: string;
  config: ConnectorConfig | null;
}

const DRY_RUN = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  // Fail fast (matches the vault's fail-closed posture).
  for (const v of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TOKEN_ENCRYPTION_KEY",
  ]) {
    if (!process.env[v]) {
      throw new Error(`Missing required env var: ${v}`);
    }
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("connectors")
    .select("id, provider, status, config");

  if (error) throw new Error(`Failed to read connectors: ${error.message}`);

  const connectors = (data ?? []) as ConnectorRow[];

  let withTokens = 0;
  let backfilled = 0;
  let skippedNoTokens = 0;
  let failed = 0;

  console.log(
    `[backfill]${DRY_RUN ? " (dry-run)" : ""} scanning ${connectors.length} connector(s)…`
  );

  for (const c of connectors) {
    const cfg = c.config ?? {};
    const accessToken = (cfg.access_token ?? "").toString();
    const refreshToken = cfg.refresh_token ?? null;

    // Nothing secret to vault → skip (e.g. never-connected rows).
    if (!accessToken && !refreshToken) {
      skippedNoTokens++;
      continue;
    }
    withTokens++;

    // NOTE: connector_credentials.access_token_ciphertext is NOT NULL. Some
    // providers (Google Ads) store only a refresh token; for those the access
    // token is backfilled as an empty-string envelope — the real secret (the
    // refresh token) is preserved, and PR 3's Ads read path uses the refresh
    // token regardless.
    const summary = `${c.provider} ${c.id} (access:${accessToken ? "yes" : "no"}, refresh:${refreshToken ? "yes" : "no"})`;

    if (DRY_RUN) {
      console.log(`[backfill] would store → ${summary}`);
      backfilled++;
      continue;
    }

    try {
      await storeConnectorToken({
        connectorId: c.id,
        accessToken,
        refreshToken,
        tokenExpiresAt: cfg.token_expires_at ?? null,
      });
      backfilled++;
      console.log(`[backfill] stored → ${summary}`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[backfill] FAILED → ${summary}: ${msg}`);
    }
  }

  /* ── Verification: count credential rows vs connectors-with-tokens ──────── */
  const { count: credCount, error: countErr } = await admin
    .from("connector_credentials")
    .select("connector_id", { count: "exact", head: true });

  if (countErr) {
    console.warn(`[backfill] verify: could not count credentials: ${countErr.message}`);
  }

  console.log("\n[backfill] ── summary ─────────────────────────────");
  console.log(`  connectors scanned        : ${connectors.length}`);
  console.log(`  connectors with tokens    : ${withTokens}`);
  console.log(`  ${DRY_RUN ? "would backfill" : "backfilled"}            : ${backfilled}`);
  console.log(`  skipped (no tokens)       : ${skippedNoTokens}`);
  console.log(`  failed                    : ${failed}`);
  if (!DRY_RUN && typeof credCount === "number") {
    console.log(`  connector_credentials rows: ${credCount}`);
    if (credCount >= withTokens) {
      console.log("  verification: OK (rows ≥ connectors-with-tokens)");
    } else {
      console.warn("  verification: MISMATCH (fewer rows than expected)");
    }
  }
  console.log("──────────────────────────────────────────────");

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[backfill] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
