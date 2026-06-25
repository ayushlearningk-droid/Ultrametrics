/**
 * Action Engine — provider adapter registry (Sprint 14A).
 *
 * Single lookup point mapping a provider id → its ActionProviderAdapter, mirror
 * of the metrics-adapter registry. The executor resolves adapters only through
 * here, so adding a provider is a one-line registration with no executor change.
 *
 * Sprint 14A: every registered adapter is a disabled stub (`enabled === false`),
 * so resolving one is safe — the executor inspects `enabled`/`supports`/
 * `validate` and never calls `execute()`.
 */

import type { ActionProviderAdapter } from "@/lib/actions/providers/types";
import { metaAdsAdapter } from "@/lib/actions/providers/meta-ads";
import { googleAdsAdapter } from "@/lib/actions/providers/google-ads";

const REGISTRY: ReadonlyMap<string, ActionProviderAdapter> = new Map([
  [metaAdsAdapter.provider, metaAdsAdapter],
  [googleAdsAdapter.provider, googleAdsAdapter],
]);

/** Resolve an adapter by provider id, or null when none is registered. */
export function getActionAdapter(
  provider: string | null | undefined
): ActionProviderAdapter | null {
  if (!provider) return null;
  return REGISTRY.get(provider) ?? null;
}

/** All registered provider ids (e.g. for diagnostics). */
export function registeredProviders(): string[] {
  return [...REGISTRY.keys()];
}

/** Whether a provider is registered AND its execution is enabled. */
export function isProviderExecutionEnabled(provider: string | null): boolean {
  const adapter = getActionAdapter(provider);
  return adapter?.enabled ?? false;
}
