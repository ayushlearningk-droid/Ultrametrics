/**
 * Universal Search — provider registry (Sprint 58).
 *
 * A simple in-memory registry keyed by category. Future searchable modules call
 * registerProvider() (typically from src/lib/search/index.ts) to plug in without
 * modifying the service or any existing provider.
 */

import type { SearchCategory, SearchProvider } from "./types";

const registry = new Map<SearchCategory, SearchProvider>();

/** Register (or replace) the provider for a category. */
export function registerProvider(provider: SearchProvider): void {
  registry.set(provider.category, provider);
}

/** All registered providers, in registration order. */
export function getProviders(): SearchProvider[] {
  return Array.from(registry.values());
}

/** The provider for a category, if registered. */
export function getProvider(category: SearchCategory): SearchProvider | undefined {
  return registry.get(category);
}

/** Whether any provider is registered (guards double-registration on reload). */
export function hasProviders(): boolean {
  return registry.size > 0;
}
