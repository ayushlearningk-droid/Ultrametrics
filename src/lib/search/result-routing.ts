/**
 * Search result routing (Sprint 59 — Command Center).
 *
 * Maps a Universal Search result (Sprint 58) to a real application route. This
 * is additive UI glue — it does not modify the Sprint 58 providers or API.
 *
 * Conversations are NOT routed here: they open the Ask drawer and hydrate the
 * thread via useAsk().selectConversation(), so this returns null for them and
 * the caller handles that case.
 */

import type { SearchResult } from "./types";

/**
 * Real destination for a search result, or null when the result is handled by a
 * non-navigation surface (conversations → Ask drawer).
 */
export function searchResultHref(result: SearchResult): string | null {
  switch (result.category) {
    case "connectors":
      return "/dashboard/connectors";
    case "workspace_memory":
      // Workspace memory is managed on the settings page (memory panel).
      return "/dashboard/settings";
    case "conversations":
      return null; // handled via the Ask drawer, not navigation
    default:
      // Future categories may carry an explicit url from their provider.
      return result.url ?? null;
  }
}
