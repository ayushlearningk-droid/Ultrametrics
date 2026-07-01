/**
 * Provider secret abstraction (Sprint 64L).
 *
 * Reads provider API keys from environment variables ONLY — no hardcoded keys,
 * no UI, no storage. Convention: `<PROVIDER_ID_UPPER>_API_KEY` (e.g. FLUX_API_KEY).
 * On the client, non-`NEXT_PUBLIC_` env vars are absent, so `apiKey` is null and
 * the executor produces a structured "missing key" error — it never crashes and
 * never exposes a key. Real keys are read server-side when live execution moves
 * behind an API route (future integration point).
 */

export interface ProviderSecret {
  providerId: string;
  /** null when no key is configured for this environment. */
  apiKey: string | null;
}

function readEnv(name: string): string | null {
  if (typeof process === "undefined" || !process.env) return null;
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

/** Resolve a provider's secret from the environment. Pure w.r.t. inputs. */
export function getProviderSecret(providerId: string): ProviderSecret {
  const envName = `${providerId.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
  return { providerId, apiKey: readEnv(envName) };
}

export function hasProviderSecret(providerId: string): boolean {
  return getProviderSecret(providerId).apiKey !== null;
}
