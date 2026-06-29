/**
 * Universal Search — barrel + built-in provider registration (Sprint 58).
 *
 * Importing this module registers the three built-in providers exactly once.
 * Future providers add a registerProvider(...) line here (or call it from their
 * own module) without changing the service, registry, or existing providers.
 */

import { registerProvider, hasProviders } from "./registry";
import { conversationSearchProvider } from "./providers/conversations";
import { workspaceMemorySearchProvider } from "./providers/workspace-memory";
import { connectorSearchProvider } from "./providers/connectors";

/** Register the built-in providers (idempotent across hot reloads). */
export function registerBuiltInProviders(): void {
  if (hasProviders()) return;
  registerProvider(conversationSearchProvider);
  registerProvider(workspaceMemorySearchProvider);
  registerProvider(connectorSearchProvider);
}

// Register on first import so any consumer of the service has providers ready.
registerBuiltInProviders();

export { runSearch, type UnifiedSearchResponse, type RunSearchOptions } from "./service";
export {
  registerProvider,
  getProviders,
  getProvider,
  hasProviders,
} from "./registry";
export {
  DEFAULT_SEARCH_LIMIT,
  type SearchProvider,
  type SearchResult,
  type SearchQuery,
  type SearchCategory,
} from "./types";
