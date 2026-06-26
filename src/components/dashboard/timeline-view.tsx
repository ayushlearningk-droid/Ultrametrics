"use client";

/**
 * Unified AI Activity Timeline (Sprint 23).
 *
 * Renders a chronological, filterable, searchable timeline built server-side
 * from existing data only (sync jobs · AI recommendations · action executions ·
 * rollbacks). Pure presentation: grouping (Today/Yesterday/Earlier), category
 * filters, search, token-only empty state, motion.ts animation, and keyboard
 * navigation (↑/↓ between cards, Enter follows a card's CTA).
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  RefreshCw,
  ListChecks,
  Undo2,
  FileText,
  Building2,
  ArrowRight,
  Waypoints,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerChildren, slideUp } from "@/lib/motion";

export type TLCategory =
  | "ai"
  | "sync"
  | "action"
  | "rollback"
  | "report"
  | "workspace";
export type TLStatus = "success" | "failed" | "warning" | "info" | "pending";

export interface TimelineEvent {
  id: string;
  category: TLCategory;
  status: TLStatus;
  title: string;
  description?: string;
  provider?: string;
  createdAt: string;
  cta?: { label: string; href: string };
}

type Filter = "all" | "ai" | "sync" | "action" | "rollback" | "report";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "sync", label: "Sync" },
  { id: "action", label: "Actions" },
  { id: "rollback", label: "Rollbacks" },
  { id: "report", label: "Reports" },
];

const CATEGORY_ICON: Record<TLCategory, React.ElementType> = {
  ai: Sparkles,
  sync: RefreshCw,
  action: ListChecks,
  rollback: Undo2,
  report: FileText,
  workspace: Building2,
};

const STATUS_CHIP: Record<TLStatus, { label: string; chip: string }> = {
  success: { label: "Success", chip: "chip chip-emerald" },
  failed: { label: "Failed", chip: "chip chip-red" },
  warning: { label: "Warning", chip: "chip chip-slate" },
  pending: { label: "Pending", chip: "chip chip-slate" },
  info: { label: "Info", chip: "chip chip-slate" },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Calendar-day bucket relative to now. */
function dayGroup(dateStr: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfToday - 86_400_000) return "Yesterday";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "Yesterday", "Earlier"] as const;

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false) ||
        (e.provider?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [events, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of filtered) {
      const g = dayGroup(e.createdAt);
      const arr = map.get(g) ?? [];
      arr.push(e);
      map.set(g, arr);
    }
    return GROUP_ORDER.map((g) => ({ group: g, items: map.get(g) ?? [] })).filter(
      (x) => x.items.length > 0
    );
  }, [filtered]);

  // Keyboard navigation: ↑/↓ move focus between timeline cards.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const cards = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>("[data-tl-card]") ?? []
    );
    if (cards.length === 0) return;
    e.preventDefault();
    const idx = cards.indexOf(document.activeElement as HTMLElement);
    const next =
      idx === -1
        ? 0
        : e.key === "ArrowDown"
          ? Math.min(idx + 1, cards.length - 1)
          : Math.max(idx - 1, 0);
    cards[next]?.focus();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 lg:py-10">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <span className="type-eyebrow text-foreground-muted">Activity</span>
        <h1 className="type-display text-foreground">Timeline</h1>
      </header>

      {/* Search */}
      <div className="surface-glass flex items-center gap-2.5 px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, description or provider…"
          aria-label="Search timeline"
          className="flex-1 bg-transparent type-body text-foreground outline-none placeholder:text-foreground-muted"
        />
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="tablist"
        aria-label="Timeline filters"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 type-caption font-semibold transition-colors",
              filter === f.id
                ? "border-brand/40 bg-brand/15 text-brand"
                : "border-white/[0.1] bg-white/[0.03] text-foreground-muted hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {groups.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Waypoints className="h-6 w-6 text-foreground-muted" />
          <p className="type-body font-semibold text-foreground">
            Nothing to show
          </p>
          <p className="max-w-sm type-caption text-foreground-muted">
            {query || filter !== "all"
              ? "No activity matches your search or filter."
              : "Sync, AI, and action activity will appear here as it happens."}
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          onKeyDown={onKeyDown}
          className="flex flex-col gap-6"
        >
          {groups.map(({ group, items }) => (
            <section key={group} className="flex flex-col gap-2">
              <h2 className="type-eyebrow text-foreground-muted">{group}</h2>
              <motion.ul
                className="flex flex-col gap-2"
                variants={staggerChildren}
                initial={reduce ? false : "hidden"}
                animate="visible"
              >
                {items.map((e) => (
                  <motion.li key={e.id} variants={slideUp}>
                    <TimelineCard event={e} />
                  </motion.li>
                ))}
              </motion.ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineCard({ event: e }: { event: TimelineEvent }) {
  const Icon = CATEGORY_ICON[e.category];
  const status = STATUS_CHIP[e.status];

  const inner = (
    <>
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate type-body font-semibold text-foreground">
            {e.title}
          </p>
          <span className={cn(status.chip, "shrink-0")}>{status.label}</span>
        </div>
        {e.description && (
          <p className="mt-0.5 line-clamp-2 type-caption text-foreground-muted">
            {e.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 type-caption text-foreground-muted">
            {e.provider && (
              <span className="truncate capitalize">{e.provider}</span>
            )}
            {e.provider && <span aria-hidden>·</span>}
            <span
              className="shrink-0 tabular-nums"
              title={new Date(e.createdAt).toLocaleString()}
            >
              {relativeTime(e.createdAt)}
            </span>
          </span>
          {e.cta && (
            <span className="inline-flex shrink-0 items-center gap-1 type-caption font-semibold text-brand">
              {e.cta.label}
              <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </>
  );

  const base =
    "card flex items-start gap-3 p-3 outline-none transition-colors focus-visible:border-brand/40";

  if (e.cta) {
    return (
      <Link
        href={e.cta.href}
        data-tl-card
        aria-label={`${e.title} — ${status.label}. ${e.cta.label}`}
        className={cn(base, "card-hover card-interactive")}
      >
        {inner}
      </Link>
    );
  }
  return (
    <article
      data-tl-card
      tabIndex={0}
      aria-label={`${e.title} — ${status.label}`}
      className={base}
    >
      {inner}
    </article>
  );
}
