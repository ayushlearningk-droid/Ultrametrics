"use client";

/**
 * Universal Search client hook (Sprint 59 — Command Center).
 *
 * Debounced, abortable fetch of the existing read-only /api/search endpoint
 * (Sprint 58). Returns grouped results for the Command Palette to render beneath
 * its command groups. Does not modify the search API or providers.
 *
 *  - Debounced (DEBOUNCE_MS) so each keystroke doesn't fire a request.
 *  - Aborts the in-flight request when the query changes or the component
 *    unmounts (no stale results, no setState-after-unmount).
 *  - Skips queries shorter than MIN_CHARS (commands already cover short input).
 */

import { useEffect, useRef, useState } from "react";
import type { SearchResult, SearchCategory } from "@/lib/search";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export interface UniversalSearchData {
  query: string;
  results: Partial<Record<SearchCategory, SearchResult[]>>;
  counts: Partial<Record<SearchCategory, number>>;
  total: number;
  errors: SearchCategory[];
}

export interface UseUniversalSearch {
  data: UniversalSearchData | null;
  loading: boolean;
  /** True once a query >= MIN_CHARS has been issued (controls empty-state copy). */
  active: boolean;
}

export function useUniversalSearch(
  query: string,
  limit = 5
): UseUniversalSearch {
  const [data, setData] = useState<UniversalSearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_CHARS;

  useEffect(() => {
    // Abort any prior request whenever the query changes.
    abortRef.current?.abort();

    if (!active) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setData(null);
          return;
        }
        const json = (await res.json()) as UniversalSearchData;
        setData(json);
      } catch {
        // Aborts and network errors degrade to "no results" silently.
        if (!controller.signal.aborted) setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, active, limit]);

  return { data, loading, active };
}
