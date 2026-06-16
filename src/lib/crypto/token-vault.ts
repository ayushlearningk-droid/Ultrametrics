/**
 * Token vault — AES-256-GCM authenticated encryption for OAuth tokens.
 *
 * C2 Step 1. This module is the single source of crypto truth. It does NOT
 * read or write the database and is not yet wired into any route — that is
 * a later step. Pure functions only, so it is trivially testable.
 *
 * Key: process.env.TOKEN_ENCRYPTION_KEY — 32 raw bytes, base64-encoded
 * (44 chars). Generate with: openssl rand -base64 32
 *
 * Fail-closed: a missing or wrong-length key throws on first use. The vault
 * never silently degrades to plaintext.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 12; // GCM standard nonce length
const CURRENT_KEY_VERSION = 1;

/** Encrypted envelope for a single secret. All byte fields are base64. */
export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
}

let cachedKey: Buffer | null = null;

/**
 * Resolve and validate the encryption key. Throws (fail-closed) if the env
 * var is absent or not exactly 32 bytes once base64-decoded.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` " +
        "and add it to your environment. Tokens cannot be encrypted or decrypted without it."
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("TOKEN_ENCRYPTION_KEY is not valid base64.");
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_BYTES} bytes (got ${key.length}). ` +
        "Generate a valid key with `openssl rand -base64 32`."
    );
  }

  cachedKey = key;
  return key;
}

/** Encrypt a plaintext token into an authenticated envelope. */
export function encryptToken(plaintext: string): EncryptedToken {
  const key = getKey();
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
    keyVersion: CURRENT_KEY_VERSION,
  };
}

/**
 * Decrypt an envelope back to plaintext.
 * Throws if the auth tag does not verify (tampering or wrong key) — callers
 * should catch this and mark the affected connector as needing reconnection.
 */
export function decryptToken(envelope: EncryptedToken): string {
  const key = getKey();

  if (envelope.keyVersion !== CURRENT_KEY_VERSION) {
    throw new Error(
      `Unsupported key_version ${envelope.keyVersion}. Only version ${CURRENT_KEY_VERSION} is configured.`
    );
  }

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

/** Test helper: confirms the configured key round-trips. Throws on failure. */
export function assertVaultHealthy(): void {
  const probe = "vault-health-probe";
  if (decryptToken(encryptToken(probe)) !== probe) {
    throw new Error("Token vault self-check failed: round-trip mismatch.");
  }
}
