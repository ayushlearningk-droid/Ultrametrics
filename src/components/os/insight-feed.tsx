"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Lightbulb, TrendingDown, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type InsightType = "alert" | "opportunity" | "info" | "success";

interface Insight {
  id: string;
  type: InsightType;
  icon: React.ElementType;
  title: string;
  body: string;
  cta?: { label: string; href: string };
}

interface DailyRow {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
}

interface ConnectorInfo {
  provider: string;
  name: string;
  status: string;
  last_synced_at: string | null;
}

interface NotificationInfo {
  status: string;
  connectorName: string;
  provider: string;
  createdAt: string;
}

function buildInsights(
  daily: DailyRow[],
  connectors: ConnectorInfo[],
  notifications: NotificationInfo[]
): Insight[] {
  const insights: Insight[] = [];

  // 1. Connector health alerts
  const errorConnectors = connectors.filter((c) => c.status === "error");
  if (errorConnectors.length > 0) {
    insights.push({
      id: "connector-error",
      type: "alert",
      icon: AlertTriangle,
      title: `${errorConnectors[0].name} needs attention`,
      body: "This connector encountered an error during the last sync. Reconnect to restore data flow.",
      cta: {
        label: "Reconnect now",
        href: `/dashboard/connectors/${errorConnectors[0].provider.replace(/_/g, "-")}`,
      },
    });
  }

  // 2. Recent sync failures
  const recentFails = notifications.filter((n) => n.status === "failed").slice(0, 2);
  if (recentFails.length > 0 && errorConnectors.length === 0) {
    insights.push({
      id: "sync-fail",
      type: "alert",
      icon: AlertTriangle,
      title: "Sync failures in the last 24h",
      body: `${recentFails.length} sync job${recentFails.length > 1 ? "s" : ""} failed recently. Your destination data may be stale.`,
      cta: { label: "View activity", href: "/dashboard/sync-jobs" },
    });
  }

  // 3. Performance analysis from daily data
  if (daily.length >= 10) {
    const sorted = [...daily].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    const recent = sorted.slice(-7);
    const prev = sorted.slice(-14, -7);

    if (recent.length >= 5 && prev.length >= 5) {
      const recentSpend = recent.reduce((s, r) => s + parseFloat(r.spend), 0);
      const prevSpend = prev.reduce((s, r) => s + parseFloat(r.spend), 0);
      const recentCtr = recent.reduce((s, r) => s + parseFloat(r.ctr), 0) / recent.length;
      const prevCtr = prev.reduce((s, r) => s + parseFloat(r.ctr), 0) / prev.length;

      const spendPct = prevSpend ? ((recentSpend - prevSpend) / prevSpend) * 100 : 0;
      const ctrPct = prevCtr ? ((recentCtr - prevCtr) / prevCtr) * 100 : 0;

      if (spendPct > 15 && ctrPct < -10) {
        insights.push({
          id: "creative-fatigue",
          type: "alert",
          icon: TrendingDown,
          title: "Possible creative fatigue",
          body: `Spend is up ${spendPct.toFixed(0)}% but CTR dropped ${Math.abs(ctrPct).toFixed(0)}% week-over-week. Refreshing ad creatives may improve efficiency.`,
          cta: { label: "View Meta insights", href: "/dashboard/connectors/meta" },
        });
      } else if (spendPct > 5 && ctrPct > 5) {
        insights.push({
          id: "strong-perf",
          type: "opportunity",
          icon: TrendingUp,
          title: "Campaigns gaining momentum",
          body: `Spend is up ${spendPct.toFixed(0)}% with CTR improving ${ctrPct.toFixed(0)}% week-over-week. Consider scaling your top performers.`,
          cta: { label: "Explore campaigns", href: "/dashboard/connectors/meta" },
        });
      } else if (spendPct < -20) {
        insights.push({
          id: "spend-drop",
          type: "info",
          icon: Lightbulb,
          title: "Spend decreased significantly",
          body: `Your ad spend dropped ${Math.abs(spendPct).toFixed(0)}% this week vs last. Check campaign budgets or seasonal factors.`,
          cta: { label: "Review Meta", href: "/dashboard/connectors/meta" },
        });
      }

      // CTR benchmark insight
      if (recentCtr < 0.8 && insights.length < 3) {
        insights.push({
          id: "low-ctr",
          type: "opportunity",
          icon: Zap,
          title: "CTR below benchmark",
          body: `Your average CTR is ${recentCtr.toFixed(2)}%. Meta Ads typically perform best above 1.5%. A creative audit could significantly improve efficiency.`,
          cta: { label: "View creative performance", href: "/dashboard/connectors/meta" },
        });
      }
    }
  }

  // 4. All healthy fallback
  const activeCount = connectors.filter((c) => c.status === "active").length;
  if (insights.length === 0 && activeCount > 0) {
    insights.push({
      id: "healthy",
      type: "success",
      icon: CheckCircle2,
      title: `${activeCount} source${activeCount > 1 ? "s" : ""} running smoothly`,
      body: "All connected sources are syncing normally. Your data pipeline is healthy.",
      cta: { label: "View activity", href: "/dashboard/sync-jobs" },
    });
  }

  // 5. No connectors
  if (connectors.length === 0) {
    insights.push({
      id: "no-connectors",
      type: "info",
      icon: Zap,
      title: "Connect your first data source",
      body: "Link Meta Ads or Google Ads to start seeing AI-powered insights about your campaigns.",
      cta: { label: "Add connector", href: "/dashboard/connectors" },
    });
  }

  return insights.slice(0, 3);
}

const INSIGHT_STYLES: Record<InsightType, { border: string; bg: string; bar: string; icon: string }> = {
  alert: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.04]",
    bar: "bg-amber-400",
    icon: "text-amber-400",
  },
  opportunity: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.04]",
    bar: "bg-emerald-400",
    icon: "text-emerald-400",
  },
  info: {
    border: "border-brand/20",
    bg: "bg-brand/[0.04]",
    bar: "bg-brand",
    icon: "text-brand",
  },
  success: {
    border: "border-emerald-500/15",
    bg: "bg-emerald-500/[0.03]",
    bar: "bg-emerald-500",
    icon: "text-emerald-400",
  },
};

export function InsightFeed() {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/meta/insights-daily").then((r) => r.json()).catch(() => null),
      fetch("/api/notifications").then((r) => r.json()).catch(() => ({ notifications: [] })),
    ]).then(([daily, notifData]) => {
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];
      const notifications: NotificationInfo[] = notifData?.notifications ?? [];
      setInsights(buildInsights(dailyRows, [], notifications));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-xl bg-white/[0.03]" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    );
  }

  if (!insights?.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {insights.map((insight, i) => {
        const s = INSIGHT_STYLES[insight.type];
        const Icon = insight.icon;
        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: "easeOut" as const }}
            className={cn(
              "relative flex flex-col gap-2 overflow-hidden rounded-xl border p-4 pl-5",
              s.border, s.bg
            )}
          >
            {/* Left accent bar */}
            <div className={cn("absolute left-0 top-4 bottom-4 w-[3px] rounded-r", s.bar)} />

            <div className="flex items-start gap-2.5">
              <Icon className={cn("mt-0.5 h-[14px] w-[14px] shrink-0", s.icon)} />
              <p className="text-[13px] font-semibold leading-tight text-foreground/90">{insight.title}</p>
            </div>

            <p className="text-[12px] leading-relaxed text-white/45 line-clamp-2">{insight.body}</p>

            {insight.cta && (
              <Link
                href={insight.cta.href}
                className={cn("mt-auto flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-80", s.icon)}
              >
                {insight.cta.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
