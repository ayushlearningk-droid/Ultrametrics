"use client";

/**
 * Production Creative Browser — state (Sprint 63).
 *
 * View mode, filter, search, sort, and quick-preview selection. Derived list is
 * pure (filter → search → sort). No backend, no AI. The data source is swappable
 * for future infinite scroll / realtime without changing consumers.
 */

import { createContext, useContext, useMemo, useState } from "react";
import {
  SAMPLE_CREATIVES,
  filterCreatives,
  searchCreatives,
  sortCreatives,
  type CreativeFilter,
  type CreativeItem,
  type CreativeSortId,
  type CreativeView,
} from "./creative-data";

interface CreativeBrowserValue {
  items: CreativeItem[];
  view: CreativeView;
  filter: CreativeFilter;
  query: string;
  sort: CreativeSortId;
  previewId: string | null;
  setView: (v: CreativeView) => void;
  setFilter: (f: CreativeFilter) => void;
  setQuery: (q: string) => void;
  setSort: (s: CreativeSortId) => void;
  setPreviewId: (id: string | null) => void;
  /** Loading flag — reserved for future async sources (renders skeletons). */
  loading: boolean;
}

const CreativeBrowserContext = createContext<CreativeBrowserValue | null>(null);

export function CreativeBrowserProvider({
  source = SAMPLE_CREATIVES,
  loading = false,
  children,
}: {
  source?: CreativeItem[];
  loading?: boolean;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<CreativeView>("grid");
  const [filter, setFilter] = useState<CreativeFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CreativeSortId>("recent");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const items = useMemo(
    () => sortCreatives(searchCreatives(filterCreatives(source, filter), query), sort),
    [source, filter, query, sort]
  );

  const value = useMemo<CreativeBrowserValue>(
    () => ({ items, view, filter, query, sort, previewId, setView, setFilter, setQuery, setSort, setPreviewId, loading }),
    [items, view, filter, query, sort, previewId, loading]
  );

  return <CreativeBrowserContext.Provider value={value}>{children}</CreativeBrowserContext.Provider>;
}

export function useCreativeBrowser(): CreativeBrowserValue {
  const ctx = useContext(CreativeBrowserContext);
  if (!ctx) throw new Error("useCreativeBrowser must be used within a CreativeBrowserProvider");
  return ctx;
}

export function useCreativeById(id: string | null): CreativeItem | null {
  const { items } = useCreativeBrowser();
  return id ? items.find((c) => c.id === id) ?? SAMPLE_CREATIVES.find((c) => c.id === id) ?? null : null;
}
