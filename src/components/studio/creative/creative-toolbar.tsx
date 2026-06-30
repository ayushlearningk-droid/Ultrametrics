"use client";

/**
 * Production Creative Browser — toolbar pieces (Sprint 63).
 * CreativeSearch · CreativeFilters · CreativeSort · CreativeViewToggle — each
 * independently reusable, bound to the browser state. Keyboard + focus. The
 * search carries an inert AI-search seam for a future sprint.
 */

import { Search, Sparkles, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreativeBrowser } from "./creative-context";
import type { CreativeFilter, CreativeSortId } from "./creative-data";

const FILTERS: { id: CreativeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
  { id: "generated", label: "Generated" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "archived", label: "Archived" },
  { id: "collections", label: "Collections" },
];

const SORTS: { id: CreativeSortId; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "name", label: "Name" },
  { id: "version", label: "Version" },
];

export function CreativeSearch() {
  const { query, setQuery } = useCreativeBrowser();
  return (
    <div className="studio-glass flex items-center gap-2 px-3 py-2">
      <Search className="h-3.5 w-3.5 text-foreground-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search creatives, tags…"
        aria-label="Search creatives"
        className="min-w-0 flex-1 bg-transparent type-caption text-foreground outline-none placeholder:text-foreground-muted"
      />
      <button
        type="button"
        aria-disabled
        title="AI search (coming soon)"
        aria-label="AI search (coming soon)"
        className="studio-focusable flex h-5 w-5 cursor-default items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted/60 hover:text-foreground"
      >
        <Sparkles className="h-3 w-3" />
      </button>
    </div>
  );
}

export function CreativeFilters() {
  const { filter, setFilter } = useCreativeBrowser();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={filter === f.id}
          onClick={() => setFilter(f.id)}
          className={cn(
            "studio-focusable rounded-full px-2.5 py-1 type-caption transition-colors",
            filter === f.id ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function CreativeSort() {
  const { sort, setSort } = useCreativeBrowser();
  return (
    <div className="flex items-center gap-1">
      <span className="type-caption text-foreground-muted">Sort</span>
      {SORTS.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={sort === s.id}
          onClick={() => setSort(s.id)}
          className={cn(
            "studio-focusable rounded-[var(--studio-radius-sm)] px-2 py-1 type-caption transition-colors",
            sort === s.id ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function CreativeViewToggle() {
  const { view, setView } = useCreativeBrowser();
  return (
    <div className="studio-glass flex items-center gap-0.5 p-0.5">
      {(
        [
          { id: "grid", icon: LayoutGrid, label: "Grid" },
          { id: "list", icon: List, label: "List" },
        ] as const
      ).map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          aria-label={label}
          onClick={() => setView(id)}
          className={cn(
            "studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] transition-colors",
            view === id ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
