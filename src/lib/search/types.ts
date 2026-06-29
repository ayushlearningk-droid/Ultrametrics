/**
 * Universal Search — core types (Sprint 58). SEARCH ONLY.
 *
 * The common contract every searchable module implements. No AI, no embeddings,
 * no execution — providers run a read-only, workspace-scoped substring search
 * over their own existing data source and return UI-agnostic results.
 */

/**
 * Stable category keys. The first three are implemented this sprint; the rest
 * are reserved so future providers register without changing existing code.
 */
export type SearchCategory =
  | "conversations"
  | "workspace_memory"
  | "connectors"
  // reserved for later sprints (no provider yet):
  | "reports"
  | "campaigns"
  | "actions"
  | "ai_skills"
  | "projects"
  | "generated_assets";

/** A workspace-scoped search request. workspaceId is server-resolved. */
export interface SearchQuery {
  workspaceId: string;
  q: string;
  /** Per-provider result cap. */
  limit: number;
}

/** A single, display-ready result. UI decides how to render it. */
export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  snippet?: string;
  /** Optional deep-link path (no UI built this sprint). */
  url?: string;
  /** ISO timestamp for recency sorting/labels. */
  updatedAt?: string;
}

/**
 * A searchable module. `search()` must be read-only and resolve (never throw for
 * "no results"); the service isolates failures, but providers should still
 * degrade gracefully.
 */
export interface SearchProvider {
  category: SearchCategory;
  /** Human label for the category (UI/debug). */
  label: string;
  search(query: SearchQuery): Promise<SearchResult[]>;
}

/** Default per-provider result cap when the caller doesn't specify one. */
export const DEFAULT_SEARCH_LIMIT = 10;
