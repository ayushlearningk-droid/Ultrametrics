"use client";

/**
 * Production Generation Queue — state (Sprint 63).
 *
 * Holds the pipeline items + view state (filter / search / group / details).
 * Item actions (cancel/retry/pause/resume/move-priority) mutate presentation
 * state only — there is NO scheduling logic here; a real scheduler/worker plugs
 * in later without changing any component.
 */

import { createContext, useContext, useMemo, useState } from "react";
import { SAMPLE_CREATIVES } from "@/components/studio/creative/creative-data";
import {
  SAMPLE_QUEUE,
  filterQueue,
  searchQueue,
  sortQueue,
  bumpPriority,
  countByStatus,
  type QueueGroupBy,
  type QueueItem,
  type QueueStatus,
} from "./queue-data";

function titleOf(creativeId: string): string {
  return SAMPLE_CREATIVES.find((c) => c.id === creativeId)?.title ?? creativeId;
}

interface QueueValue {
  items: QueueItem[];
  filter: QueueStatus | "all";
  query: string;
  groupBy: QueueGroupBy;
  selectedId: string | null;
  loading: boolean;
  /** Totals across all items (not the filtered view) — drives the summary. */
  counts: Record<QueueStatus, number>;
  total: number;
  setFilter: (f: QueueStatus | "all") => void;
  setQuery: (q: string) => void;
  setGroupBy: (g: QueueGroupBy) => void;
  setSelectedId: (id: string | null) => void;
  // Item actions (presentation-state only).
  pause: (id: string) => void;
  resume: (id: string) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  movePriority: (id: string) => void;
  titleOf: (id: string) => string;
}

const QueueContext = createContext<QueueValue | null>(null);

export function GenerationQueueProvider({
  source = SAMPLE_QUEUE,
  loading = false,
  children,
}: {
  source?: QueueItem[];
  loading?: boolean;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<QueueItem[]>(source);
  const [filter, setFilter] = useState<QueueStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<QueueGroupBy>("status");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const setStatus = (id: string, status: QueueStatus) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));

  const value = useMemo<QueueValue>(() => {
    const visible = sortQueue(searchQueue(filterQueue(items, filter), query, titleOf));
    return {
      items: visible,
      filter,
      query,
      groupBy,
      selectedId,
      loading,
      counts: countByStatus(items),
      total: items.length,
      setFilter,
      setQuery,
      setGroupBy,
      setSelectedId,
      pause: (id) => setStatus(id, "paused"),
      resume: (id) => setStatus(id, "running"),
      cancel: (id) => setStatus(id, "cancelled"),
      retry: (id) => setStatus(id, "queued"),
      movePriority: (id) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, priority: bumpPriority(i.priority) } : i))),
      titleOf,
    };
  }, [items, filter, query, groupBy, selectedId, loading]);

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue(): QueueValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used within a GenerationQueueProvider");
  return ctx;
}

export function useQueueItem(id: string | null): QueueItem | null {
  const { items } = useQueue();
  if (!id) return null;
  return items.find((i) => i.id === id) ?? SAMPLE_QUEUE.find((i) => i.id === id) ?? null;
}
