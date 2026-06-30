"use client";

/**
 * Production Generation Queue — QueueGroups (Sprint 63).
 * Renders the visible pipeline grouped by status / priority / none, with
 * loading skeletons, an empty state, and an infinite-scroll sentinel seam.
 */

import { Inbox } from "lucide-react";
import { useQueue } from "./queue-context";
import { QueueItem } from "./queue-item";
import { QUEUE_STATUSES, type QueueItem as QueueItemType, type QueuePriority } from "./queue-data";

const PRIORITIES: QueuePriority[] = ["high", "normal", "low"];

function Skeletons() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="studio-card flex items-center gap-3 p-2.5">
          <span className="studio-skeleton aspect-video w-20 rounded-[var(--studio-radius-md)]" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="studio-skeleton h-4 w-1/3 rounded" />
            <span className="studio-skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="studio-card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="studio-tile flex h-12 w-12 items-center justify-center text-foreground-muted">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="type-body font-semibold text-foreground">Nothing in this view</p>
      <p className="type-caption text-foreground-muted">Adjust the filter or clear your search.</p>
    </div>
  );
}

function Section({ label, list }: { label: string; list: QueueItemType[] }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="type-eyebrow text-foreground-muted">{label}</h3>
        <span className="type-caption tabular-nums text-foreground-muted">{list.length}</span>
      </div>
      {list.map((item) => (
        <QueueItem key={item.id} item={item} />
      ))}
    </section>
  );
}

export function QueueGroups() {
  const { items, groupBy, loading } = useQueue();

  if (loading) return <Skeletons />;
  if (items.length === 0) return <Empty />;

  if (groupBy === "none") {
    return (
      <div className="flex flex-col gap-2" data-virtualize="false">
        {items.map((item) => (
          <QueueItem key={item.id} item={item} />
        ))}
        <div data-infinite-scroll-sentinel aria-hidden />
      </div>
    );
  }

  const keys = groupBy === "status" ? QUEUE_STATUSES : PRIORITIES;
  const groups = keys
    .map((k) => ({ k, list: items.filter((i) => (groupBy === "status" ? i.status === k : i.priority === k)) }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="flex flex-col gap-5" data-virtualize="false">
      {groups.map((g) => (
        <Section key={g.k} label={g.k[0].toUpperCase() + g.k.slice(1)} list={g.list} />
      ))}
      <div data-infinite-scroll-sentinel aria-hidden />
    </div>
  );
}
