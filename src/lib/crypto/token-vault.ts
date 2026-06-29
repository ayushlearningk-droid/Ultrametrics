/**
 * Token vault — AES-256-GCM authenticated encryption for OAuth tokens.
 *
 * C2 Step 1 · Key rotation Sprint 55A. This module is the single source of
 * crypto truth. It does NOT read or write the database. Pure functions only, so
 * it is trivially testable.
 *
 * ── Keys ───────────────────────────────────────────────────────────────────
 * Each key is 32 raw bytes, base64-encoded (44 chars). Generate one with:
 *   openssl rand -base64 32
 *
 * Two ways to configure keys (backward compatible):
 *   • TOKEN_ENCRYPTION_KEY            — a single key, registered as version 1.
 *   • TOKEN_ENCRYPTION_KEYS           — multi-version registry, comma-separated
 *                                       "version:base64key" pairs, e.g.
 *                                       "1:AAAA…,2:BBBB…". Enables rotation.
 *   • TOKEN_ENCRYPTION_KEY_CURRENT_VERSION — which version NEW data is encrypted
 *                                       with (defaults to the highest version).
 *
 * Envelopes carry their key_version, so ciphertext written under any registered
 * key still decrypts after rotation. New ciphertext is always written under the
 * current version.
 *
 * Fail-closed: missing keys, wrong length, or an unknown envelope version throw
 * on use. The vault never silently degrades to plaintext.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 12; // GCM standard nonce length

/** Encrypted envelope for a single secret. All byte fields are base64. */
export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
}

interface KeyRegistry {
  keys: Map<number, Buffer>;
  current: number;
}

let cachedRegistry: KeyRegistry | null = null;

/** Decode + validate a single base64 key to exactly 32 bytes. */
function parseKey(raw: string, label: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error(`${label} is not valid base64.`);
  }
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `${label} must decode to exactly ${KEY_BYTES} bytes (got ${key.length}). ` +
        "Generate a valid key with `openssl rand -base64 32`."
    );
  }
  return key;
}

/**
 * Resolve and validate the key registry + current version. Throws (fail-closed)
 * if no keys are configured, any key is malformed, or the selected current
 * version is absent. Cached after first successful load.
 */
function getRegistry(): KeyRegistry {
  if (cachedRegistry) return cachedRegistry;

  const keys = new Map<number, Buffer>();

  // 1) Multi-version registry (preferred for rotation).
  const multi = process.env.TOKEN_ENCRYPTION_KEYS?.trim();
  if (multi) {
    for (const part of multi.split(",")) {
      const entry = part.trim();
      if (!entry) continue;
      const sep = entry.indexOf(":");
      if (sep === -1) {
        throw new Error(
          `TOKEN_ENCRYPTION_KEYS entries must be "version:base64key" (got "${entry}").`
        );
      }
      const version = Number(entry.slice(0, sep).trim());
      if (!Number.isInteger(version) || version < 1) {
        throw new Error(
          `TOKEN_ENCRYPTION_KEYS has an invalid version "${entry.slice(0, sep)}".`
        );
      }
      if (keys.has(version)) {
        throw new Error(`TOKEN_ENCRYPTION_KEYS has a duplicate version ${version}.`);
      }
      keys.set(
        version,
        parseKey(entry.slice(sep + 1).trim(), `TOKEN_ENCRYPTION_KEYS v${version}`)
      );
    }
  }

  // 2) Legacy single key → version 1 (backward compatible).
  const legacy = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (legacy) {
    const legacyKey = parseKey(legacy, "TOKEN_ENCRYPTION_KEY");
    const existing = keys.get(1);
    if (existing) {
      // Both provided: they must agree, otherwise version 1 is ambiguous.
      if (!existing.equals(legacyKey)) {
        throw new Error(
          "TOKEN_ENCRYPTION_KEY conflicts with version 1 in TOKEN_ENCRYPTION_KEYS."
        );
      }
    } else {
      keys.set(1, legacyKey);
    }
  }

  if (keys.size === 0) {
    throw new Error(
      "No encryption keys configured. Set TOKEN_ENCRYPTION_KEY or TOKEN_ENCRYPTION_KEYS. " +
        "Generate one with `openssl rand -base64 32`."
    );
  }

  // 3) Current version: explicit env, else the highest registered version.
  let current: number;
  const curEnv = process.env.TOKEN_ENCRYPTION_KEY_CURRENT_VERSION?.trim();
  if (curEnv) {
    current = Number(curEnv);
    if (!Number.isInteger(current)) {
      throw new Error(
        `TOKEN_ENCRYPTION_KEY_CURRENT_VERSION must be an integer (got "${curEnv}").`
      );
    }
    if (!keys.has(current)) {
      throw new Error(
        `TOKEN_ENCRYPTION_KEY_CURRENT_VERSION ${current} is not present in the key registry.`
      );
    }
  } else {
    current = Math.max(...keys.keys());
  }

  cachedRegistry = { keys, current };
  return cachedRegistry;
}

/** The version new ciphertext is written under. */
export function currentKeyVersion(): number {
  return getRegistry().current;
}

function keyForVersion(version: number): Buffer {
  const key = getRegistry().keys.get(version);
  if (!key) {
    throw new Error(
      `No key configured for key_version ${version}. ` +
        "The key that wrote this ciphertext must remain in TOKEN_ENCRYPTION_KEYS until re-encrypted."
    );
  }
  return key;
}

/** Encrypt a plaintext token into an authenticated envelope (current key). */
export function encryptToken(plaintext: string): EncryptedToken {
  const { current } = getRegistry();
  const key = keyForVersion(current);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    keyVersion: current,
  };
}

/**
 * Decrypt an envelope back to plaintext, using the key for its envelope version.
 * Throws if that version's key is not configured, or if the auth tag does not
 * verify (tampering or wrong key) — callers should catch this and mark the
 * affected connector as needing reconnection.
 */
export function decryptToken(envelope: EncryptedToken): string {
  const key = keyForVersion(envelope.keyVersion);

  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(), // throws on auth-tag mismatch
  ]);

  return plaintext.toString("utf8");
}

/** True when an envelope was written under a key older than the current one. */
export function needsReEncryption(envelope: EncryptedToken): boolean {
  return envelope.keyVersion !== getRegistry().current;
}

/**
 * Re-encrypt an envelope under the current key (rotation helper). Decrypts with
 * the envelope's own version, then re-encrypts with the current version. A no-op
 * (returns the same envelope) when it is already current. Pure — the caller is
 * responsible for persisting the result.
 */
export function reEncryptToken(envelope: EncryptedToken): EncryptedToken {
  if (!needsReEncryption(envelope)) return envelope;
  return encryptToken(decryptToken(envelope));
}

/** Test helper: confirms the configured current key round-trips. Throws on failure. */
export function assertVaultHealthy(): void {
  const probe = "vault-health-probe";
  if (decryptToken(encryptToken(probe)) !== probe) {
    throw new Error("Token vault self-check failed: round-trip mismatch.");
  }
}
