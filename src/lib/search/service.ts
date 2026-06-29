/**
 * Universal Search — unified service (Sprint 58).
 *
 * Runs every registered provider in PARALLEL and returns grouped results.
 * Read-only. Failure-isolated: one provider erroring (or timing out) degrades to
 * an empty group for that category and is reported in `errors`, never failing
 * the whole search.
 */

import { getProviders } from "./registry";
import {
  DEFAULT_SEARCH_LIMIT,
  type SearchCategory,
  type SearchResult,
} from "./types";

export interface UnifiedSearchResponse {
  query: string;
  /** Results grouped by category. */
  results: Partial<Record<SearchCategory, SearchResult[]>>;
  /** Result count per category. */
  counts: Partial<Record<SearchCategory, number>>;
  /** Total across all categories. */
  total: number;
  /** Categories whose provider failed (non-fatal). */
  errors: SearchCategory[];
}

export interface RunSearchOptions {
  q: string;
  workspaceId: string;
  limit?: number;
}

/** Run all registered providers in parallel and group their results. */
export async function runSearch({
  q,
  workspaceId,
  limit = DEFAULT_SEARCH_LIMIT,
}: RunSearchOptions): Promise<UnifiedSearchResponse> {
  const providers = getProviders();
  const trimmed = q.trim();

  const response: UnifiedSearchResponse = {
    query: trimmed,
    results: {},
    counts: {},
    total: 0,
    errors: [],
  };

  // Empty query → empty (no provider work).
  if (!trimmed) return response;

  const settled = await Promise.allSettled(
    providers.map((p) =>
      p.search({ workspaceId, q: trimmed, limit }).then((results) => ({
        category: p.category,
        results,
      }))
    )
  );

  settled.forEach((outcome, i) => {
    const category = providers[i].category;
    if (outcome.status === "fulfilled") {
      const results = outcome.value.results;
      if (results.length > 0) {
        response.results[category] = results;
        response.counts[category] = results.length;
        response.total += results.length;
      }
    } else {
      response.errors.push(category);
      console.error(`[search] provider "${category}" failed`, {
        error:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason),
      });
    }
  });

  return response;
}
