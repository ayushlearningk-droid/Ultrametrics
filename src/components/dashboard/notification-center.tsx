"use client";

/**
 * Notification Center (Sprint 22) — unified, filterable notification drawer.
 *
 * Reads the reactive notifications store (sync + actions, real data). Provides
 * category filters, read/unread + severity states, bulk actions (mark all read /
 * clear read), rich cards (icon · title · description · timestamp · CTA), and a
 * token-only empty state. Motion exclusively from src/lib/motion.ts (no spring,
 * no blur).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  RefreshCw,
  ListChecks,
  Sparkles,
  FileText,
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, slideUp, staggerChildren, DUR, EASE_OUT } from "@/lib/motion";
import {
  useNotifications,
  hydrateNotifications,
  markRead,
  markAllRead,
  clearRead,
  type AppNotification,
  type NotifCategory,
} from "@/lib/stores/notifications";

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

type Filter = "all" | "unread" | "ai" | "sync" | "actions" | "reports";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "ai", label: "AI" },
  { id: "sync", label: "Sync" },
  { id: "actions", label: "Actions" },
  { id: "reports", label: "Reports" },
];

const CATEGORY_ICON: Record<NotifCategory, React.ElementType> = {
  ai: Sparkles,
  sync: RefreshCw,
  actions: ListChecks,
  reports: FileText,
  workspace: Building2,
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

/** Severity badge — strict 3-colour: brand / muted-red / slate. */
function SeverityIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "success")
    return <CheckCircle2 className="h-3.5 w-3.5 text-brand" />;
  if (type === "failed")
    return <XCircle className="h-3.5 w-3.5 text-red-400/80" />;
  if (type === "warning")
    return <Clock3 className="h-3.5 w-3.5 text-red-400/80" />;
  return <Clock3 className="h-3.5 w-3.5 text-slate-300" />;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const reduce = useReducedMotion();
  const { visible, readIds, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  // Hydrate on open; refresh ensures the latest sync/action events.
  useEffect(() => {
    if (open) void hydrateNotifications();
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "all":
        return visible;
      case "unread":
        return visible.filter((n) => !readIds.has(n.id));
      default:
        return visible.filter((n) => n.category === filter);
    }
  }, [visible, readIds, filter]);

  const hasRead = visible.some((n) => readIds.has(n.id));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            variants={fadeIn}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l border-white/[0.08] bg-[hsl(var(--card))] shadow-2xl sm:w-[400px]"
            initial={reduce ? false : { x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-foreground-muted" />
                <span className="type-body font-semibold text-foreground">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="chip chip-emerald tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 type-caption font-semibold transition-colors",
                    filter === f.id
                      ? "border-brand/40 bg-brand/15 text-brand"
                      : "border-white/[0.1] bg-white/[0.03] text-foreground-muted hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Bulk actions */}
            <div className="flex items-center justify-end gap-2 border-b border-white/[0.06] px-4 py-2">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
              <button
                type="button"
                onClick={clearRead}
                disabled={!hasRead}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear read
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                    <Bell className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <p className="type-body font-semibold text-foreground">
                    {filter === "unread" ? "You're all caught up" : "Nothing here yet"}
                  </p>
                  <p className="max-w-[15rem] type-caption text-foreground-muted">
                    {filter === "all"
                      ? "Sync and action events will show up here."
                      : "No notifications match this filter."}
                  </p>
                </div>
              ) : (
                <motion.ul
                  className="flex flex-col gap-1.5"
                  variants={staggerChildren}
                  initial={reduce ? false : "hidden"}
                  animate="visible"
                >
                  {filtered.map((n) => {
                    const Icon = CATEGORY_ICON[n.category];
                    const unread = !readIds.has(n.id);
                    return (
                      <motion.li key={n.id} variants={slideUp}>
                        <div
                          onMouseEnter={() => unread && markRead(n.id)}
                          className={cn(
                            "card card-hover flex items-start gap-3 p-3 transition-opacity",
                            !unread && "opacity-65"
                          )}
                        >
                          <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground-muted">
                            <Icon className="h-4 w-4" />
                            {unread && (
                              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate type-body font-semibold text-foreground">
                              {n.title}
                            </p>
                            {n.description && (
                              <p className="mt-0.5 line-clamp-2 type-caption text-foreground-muted">
                                {n.description}
                              </p>
                            )}
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 type-caption text-foreground-muted">
                                <SeverityIcon type={n.type} />
                                <span
                                  className="tabular-nums"
                                  title={new Date(n.createdAt).toLocaleString()}
                                >
                                  {relativeTime(n.createdAt)}
                                </span>
                              </span>
                              {n.cta && (
                                <Link
                                  href={n.cta.href}
                                  onClick={() => {
                                    markRead(n.id);
                                    onClose();
                                  }}
                                  className="inline-flex shrink-0 items-center gap-1 type-caption font-semibold text-brand transition-colors hover:text-brand/80"
                                >
                                  {n.cta.label}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
