"use client";

/** Production Approval Center — ApprovalSearch + ApprovalFilters (Sprint 63). */

import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApproval } from "./approval-context";
import { APPROVAL_STATUSES } from "./approval-data";

export function ApprovalSearch() {
  const { query, setQuery } = useApproval();
  return (
    <div className="studio-glass flex items-center gap-2 px-3 py-2">
      <Search className="h-3.5 w-3.5 text-foreground-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search approvals…"
        aria-label="Search approvals"
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

const FILTERS = [
  { id: "all" as const, label: "All" },
  ...APPROVAL_STATUSES.map((s) => ({ id: s, label: s === "needs-changes" ? "Needs changes" : s[0].toUpperCase() + s.slice(1) })),
];

export function ApprovalFilters() {
  const { filter, setFilter } = useApproval();
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

export function ApprovalToolbar() {
  return (
    <div className="flex flex-col gap-3">
      <ApprovalSearch />
      <ApprovalFilters />
    </div>
  );
}
