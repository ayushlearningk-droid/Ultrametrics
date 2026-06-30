"use client";

/**
 * Production Generation Queue — QueueSummary (Sprint 63).
 * Live counts per status across the whole pipeline. Clicking focuses a filter.
 */

import { cn } from "@/lib/utils";
import { useQueue } from "./queue-context";
import { QUEUE_STATUSES } from "./queue-data";

const LABEL: Record<string, string> = {
  running: "Running",
  queued: "Queued",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function QueueSummary() {
  const { counts, total, filter, setFilter } = useQueue();
  return (
    <div className="studio-glass flex flex-wrap items-center gap-1.5 p-1.5">
      <button
        type="button"
        aria-pressed={filter === "all"}
        onClick={() => setFilter("all")}
        className={cn(
          "studio-focusable rounded-[var(--studio-radius-sm)] px-2.5 py-1 type-caption transition-colors",
          filter === "all" ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
        )}
      >
        All <span className="tabular-nums">{total}</span>
      </button>
      {QUEUE_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={filter === s}
          onClick={() => setFilter(s)}
          className={cn(
            "studio-focusable flex items-center gap-1 rounded-[var(--studio-radius-sm)] px-2.5 py-1 type-caption transition-colors",
            filter === s ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          )}
        >
          {LABEL[s]} <span className="tabular-nums">{counts[s]}</span>
        </button>
      ))}
    </div>
  );
}
