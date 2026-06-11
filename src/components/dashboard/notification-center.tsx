"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, RefreshCw, Clock, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  connectorName: string;
  provider: string;
  status: string;
  records: number;
  createdAt: string;
  completedAt: string | null;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusIcon({ type }: { type: Notification["type"] }) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-400" />;
    case "info":
      return <RefreshCw className="h-4 w-4 animate-spin text-brand" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Stop background scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const day = new Date(n.createdAt).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(n);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-white/[0.08] bg-[hsl(222_44%_5%)] shadow-2xl shadow-black/60"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold text-sm">Activity</p>
                {notifications.length > 0 && (
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    {notifications.length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-1 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-lg bg-white/[0.03]"
                      style={{ animationDelay: `${i * 60}ms` }}
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025]">
                    <Bell className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No activity yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sync events will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-4">
                  {Object.entries(grouped).map(([day, items]) => (
                    <div key={day}>
                      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        {day}
                      </p>
                      <ul className="space-y-1">
                        {items.map((n, i) => {
                          const BrandIcon = BRAND_ICON_MAP[n.provider];
                          return (
                            <motion.li
                              key={n.id}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.2 }}
                            >
                              <div
                                className={cn(
                                  "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                                  n.type === "error"
                                    ? "border-red-500/20 bg-red-500/[0.04]"
                                    : "border-white/[0.06] bg-white/[0.02]"
                                )}
                              >
                                <div className="shrink-0 mt-0.5">
                                  {BrandIcon ? (
                                    <BrandIcon className="h-7 w-7" />
                                  ) : (
                                    <GenericPlatformIcon className="h-7 w-7" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium leading-snug">
                                    {n.message}
                                  </p>
                                  <div className="mt-0.5 flex items-center gap-1.5">
                                    <StatusIcon type={n.type} />
                                    <p className="text-[10px] text-muted-foreground">
                                      {relativeTime(n.createdAt)}
                                      {n.type === "success" && n.records > 0 && (
                                        <> · {n.records.toLocaleString()} rows</>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-5 py-3">
              <a
                href="/dashboard/sync-jobs"
                className="block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                View all sync jobs →
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
