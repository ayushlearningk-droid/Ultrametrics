"use client";

/**
 * Production Generation Queue — toolbar (Sprint 63).
 * QueueSearch · QueueFilters · QueueGroupToggle — each reusable, bound to state.
 */

import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueue } from "./queue-context";
import { QUEUE_STATUSES, type QueueGroupBy } from "./queue-data";

export function QueueSearch() {
  const { query, setQuery } = useQueue();
  return (
    <div className="studio-glass flex items-center gap-2 px-3 py-2">
      <Search className="h-3.5 w-3.5 text-foreground-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the pipeline…"
        aria-label="Search the generation queue"
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

const FILTERS: ({ id: "all"; label: string } | { id: (typeof QUEUE_STATUSES)[number]; label: string })[] = [
  { id: "all", label: "All" },
  ...QUEUE_STATUSES.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) })),
];

export function QueueFilters() {
  const { filter, setFilter } = useQueue();
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

const GROUPS: { id: QueueGroupBy; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "none", label: "None" },
];

export function QueueGroupToggle() {
  const { groupBy, setGroupBy } = useQueue();
  return (
    <div className="flex items-center gap-1">
      <span className="type-caption text-foreground-muted">Group</span>
      {GROUPS.map((g) => (
        <button
          key={g.id}
          type="button"
          aria-pressed={groupBy === g.id}
          onClick={() => setGroupBy(g.id)}
          className={cn(
            "studio-focusable rounded-[var(--studio-radius-sm)] px-2 py-1 type-caption transition-colors",
            groupBy === g.id ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          )}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

export function QueueToolbar() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1">
          <QueueSearch />
        </div>
        <QueueGroupToggle />
      </div>
      <QueueFilters />
    </div>
  );
}
