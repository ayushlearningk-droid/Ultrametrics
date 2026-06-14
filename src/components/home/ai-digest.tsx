"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DigestConnector {
  provider: string;
  status: string;
  name: string;
}

interface DigestItem {
  id: string;
  type: "alert" | "opportunity" | "info" | "success";
  icon: React.ElementType;
  text: string;
  href: string;
}

interface DailyRow {
  date_start: string;
  spend: string;
  ctr: string;
}

interface NotificationInfo {
  status: string;
  connectorName?: string;
}

function buildDigestItems(
  daily: DailyRow[],
  connectors: DigestConnector[],
  notifications: NotificationInfo[]
): DigestItem[] {
  const items: DigestItem[] = [];

  // Connector errors
  const errored = connectors.filter((c) => c.status === "error");
  if (errored.length > 0) {
    items.push({
      id: "conn-err",
      type: "alert",
      icon: AlertTriangle,
      text: `${errored[0].name} needs reconnecting — last sync failed`,
      href: `/dashboard/connectors/${errored[0].provider.replace(/_/g, "-")}`,
    });
  }

  // Performance signals from daily data
  if (daily.length >= 10) {
    const sorted = [...daily].sort(
      (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
    );
    const recent = sorted.slice(-7);
    const prev = sorted.slice(-14, -7);

    if (recent.length >= 5 && prev.length >= 5) {
      const rSpend = recent.reduce((s, r) => s + parseFloat(r.spend), 0);
      const pSpend = prev.reduce((s, r) => s + parseFloat(r.spend), 0);
      const rCtr = recent.reduce((s, r) => s + parseFloat(r.ctr), 0) / recent.length;
      const pCtr = prev.reduce((s, r) => s + parseFloat(r.ctr), 0) / prev.length;

      const spendPct = pSpend ? ((rSpend - pSpend) / pSpend) * 100 : 0;
      const ctrPct = pCtr ? ((rCtr - pCtr) / pCtr) * 100 : 0;

      if (spendPct > 15 && ctrPct < -10) {
        items.push({
          id: "fatigue",
          type: "alert",
          icon: TrendingDown,
          text: `Creative fatigue likely on Meta — spend +${spendPct.toFixed(0)}% but CTR dropped ${Math.abs(ctrPct).toFixed(0)}%`,
          href: "/dashboard/connectors/meta",
        });
      } else if (spendPct > 5 && ctrPct > 5) {
        items.push({
          id: "momentum",
          type: "opportunity",
          icon: TrendingUp,
          text: `Campaigns gaining momentum — CTR up ${ctrPct.toFixed(0)}% with higher spend`,
          href: "/dashboard/connectors/meta",
        });
      }

      if (rCtr < 0.8 && items.length < 2) {
        items.push({
          id: "low-ctr",
          type: "opportunity",
          icon: Lightbulb,
          text: `Meta CTR at ${rCtr.toFixed(2)}% — below the 1.5% benchmark, creative audit recommended`,
          href: "/dashboard/connectors/meta",
        });
      }
    }
  }

  // Recent sync failures
  const fails = notifications.filter((n) => n.status === "failed").slice(0, 1);
  if (fails.length > 0 && items.length < 3) {
    items.push({
      id: "sync-fail",
      type: "alert",
      icon: AlertTriangle,
      text: "Sync failures detected in the last 24h — destination data may be stale",
      href: "/dashboard/sync-jobs",
    });
  }

  // All healthy fallback
  const activeCount = connectors.filter((c) => c.status === "active").length;
  if (items.length === 0 && activeCount > 0) {
    items.push({
      id: "healthy",
      type: "success",
      icon: CheckCircle2,
      text: `${activeCount} source${activeCount > 1 ? "s" : ""} syncing normally — data pipeline is healthy`,
      href: "/dashboard/sync-jobs",
    });
  }

  if (connectors.length === 0) {
    items.push({
      id: "no-sources",
      type: "info",
      icon: Sparkles,
      text: "Connect your first data source to start seeing AI-powered insights",
      href: "/dashboard/connectors",
    });
  }

  return items.slice(0, 3);
}

const TYPE_ICON_CLASS = {
  alert: "text-amber-400",
  opportunity: "text-emerald-400",
  info: "text-brand",
  success: "text-emerald-400",
} as const;

export function AIDigest({ connectors }: { connectors: DigestConnector[] }) {
  const [items, setItems] = useState<DigestItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/meta/insights-daily")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/notifications")
        .then((r) => r.json())
        .catch(() => ({ notifications: [] })),
    ]).then(([daily, notifData]) => {
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];
      const notifications: NotificationInfo[] = notifData?.notifications ?? [];
      setItems(buildDigestItems(dailyRows, connectors, notifications));
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand/[0.18] bg-brand/[0.03]">
      {/* Subtle inner top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

      <div className="px-5 py-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand/70" />
          <p className="text-[11px] font-semibold text-brand/70">
            {loading
              ? "Analyzing your data…"
              : items && items.length > 0
              ? `AI noticed ${items.length} thing${items.length > 1 ? "s" : ""}`
              : "AI Analysis"}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[64, 80, 72].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-white/[0.08]" />
                <div
                  className="h-3 animate-pulse rounded bg-white/[0.05]"
                  style={{ width: `${w}%`, animationDelay: `${i * 100}ms` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-white/[0.05]">
            {(items ?? []).map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Icon
                    className={cn(
                      "mt-px h-3.5 w-3.5 shrink-0",
                      TYPE_ICON_CLASS[item.type]
                    )}
                  />
                  <p className="flex-1 text-[13px] leading-snug text-foreground/75">
                    {item.text}
                  </p>
                  <Link
                    href={item.href}
                    className="group flex shrink-0 items-center gap-1 text-[11px] font-medium text-white/30 transition-colors hover:text-white/70"
                  >
                    View
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
