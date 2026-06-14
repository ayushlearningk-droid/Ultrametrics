"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AreaChart } from "@/components/ui/area-chart";
import { cn } from "@/lib/utils";

interface MetaInsight {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
}

interface DailyRow {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
}

interface MetricCard {
  key: string;
  label: string;
  value: number;
  format: "currency" | "compact" | "number" | "percentage";
  color: string;
  trend?: number;
  chartData?: { label: string; value: number }[];
}

const METRIC_META: Array<{
  key: string;
  label: string;
  format: MetricCard["format"];
  color: string;
  extract: (r: DailyRow) => number;
  aggregate: (rows: MetaInsight[]) => number;
}> = [
  {
    key: "spend",
    label: "Ad Spend",
    format: "currency",
    color: "#4F8BEE",
    extract: (r) => parseFloat(r.spend ?? "0"),
    aggregate: (rows) => rows.reduce((s, r) => s + parseFloat(r.spend ?? "0"), 0),
  },
  {
    key: "impressions",
    label: "Impressions",
    format: "compact",
    color: "#34D399",
    extract: (r) => parseFloat(r.impressions ?? "0"),
    aggregate: (rows) => rows.reduce((s, r) => s + parseFloat(r.impressions ?? "0"), 0),
  },
  {
    key: "clicks",
    label: "Clicks",
    format: "number",
    color: "#A78BFA",
    extract: (r) => parseFloat(r.clicks ?? "0"),
    aggregate: (rows) => rows.reduce((s, r) => s + parseFloat(r.clicks ?? "0"), 0),
  },
  {
    key: "ctr",
    label: "Avg. CTR",
    format: "percentage",
    color: "#F59E0B",
    extract: (r) => parseFloat(r.ctr ?? "0"),
    aggregate: (rows) => rows.length ? rows.reduce((s, r) => s + parseFloat(r.ctr ?? "0"), 0) / rows.length : 0,
  },
];

function formatValue(value: number, format: MetricCard["format"], currency = "USD"): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "compact":
      return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    case "percentage":
      return `${value.toFixed(2)}%`;
    default:
      return new Intl.NumberFormat("en-US").format(Math.round(value));
  }
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function MetricGrid() {
  const [metrics, setMetrics] = useState<MetricCard[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/meta/test-insights").then((r) => r.json()),
      fetch("/api/meta/insights-daily").then((r) => r.json()).catch(() => null),
    ]).then(([totals, daily]) => {
      if (!totals.success || !totals.insights?.length) {
        setNoData(true);
        setLoading(false);
        return;
      }

      if (totals.currency) setCurrency(totals.currency);
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];

      // Split daily rows: last 7 vs previous 7
      const sorted = [...dailyRows].sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );
      const recent7 = sorted.slice(-7);
      const prev7 = sorted.slice(-14, -7);

      const built = METRIC_META.map((m) => {
        const totalValue = m.aggregate(totals.insights);

        const chartData =
          recent7.length >= 2
            ? recent7.map((r) => ({
                label: new Date(r.date_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: m.extract(r),
              }))
            : undefined;

        // Trend: recent 7-day total vs previous 7-day total
        let trend: number | undefined;
        if (recent7.length > 0 && prev7.length > 0) {
          const recentSum = recent7.reduce((s, r) => s + m.extract(r), 0);
          const prevSum = prev7.reduce((s, r) => s + m.extract(r), 0);
          if (prevSum !== 0) {
            trend = ((recentSum - prevSum) / Math.abs(prevSum)) * 100;
          }
        }

        return { key: m.key, label: m.label, value: totalValue, format: m.format, color: m.color, trend, chartData };
      });

      setMetrics(built);
      setLoading(false);
    }).catch(() => {
      setNoData(true);
      setLoading(false);
    });
  }, []);

  const LABELS = ["Ad Spend", "Impressions", "Clicks", "Avg. CTR"];

  if (noData) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LABELS.map((label, i) => (
          <GlassCard key={i} className="flex flex-col gap-3 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight text-muted-foreground/30">—</p>
            <p className="text-xs text-muted-foreground/40">Connect Meta Ads to see data</p>
            <div className="h-14 rounded-lg bg-white/[0.015]" />
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {loading
        ? LABELS.map((label, i) => (
            <motion.div key={i} variants={itemVariants}>
              <GlassCard className="flex flex-col gap-3 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  {label}
                </p>
                <div className="h-8 w-3/4 animate-pulse rounded-md bg-white/[0.06]" />
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-white/[0.04]" />
                <div className="mt-2 h-14 animate-pulse rounded-lg bg-white/[0.03]" />
              </GlassCard>
            </motion.div>
          ))
        : (metrics ?? []).map((m) => (
            <motion.div key={m.key} variants={itemVariants}>
              <GlassCard glow className="flex flex-col gap-2 p-5">
                {/* Label */}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {m.label}
                </p>

                {/* Value row */}
                <div className="flex items-end gap-3">
                  <p
                    className="text-3xl font-bold tracking-tight leading-none"
                    style={{ color: m.color }}
                  >
                    {formatValue(m.value, m.format, currency)}
                  </p>
                </div>

                {/* Trend badge */}
                {m.trend !== undefined && (
                  <TrendBadge trend={m.trend} />
                )}

                {/* Area chart */}
                {m.chartData ? (
                  <div className="mt-auto pt-2">
                    <AreaChart
                      data={m.chartData}
                      color={m.color}
                      height={56}
                      showGrid={false}
                      showTooltip
                      animated
                      formatValue={(v) => formatValue(v, m.format, currency)}
                      className="opacity-90"
                    />
                  </div>
                ) : (
                  <div
                    className="mt-auto h-14 rounded-lg"
                    style={{ background: `linear-gradient(to bottom, ${m.color}10, transparent)` }}
                  />
                )}
              </GlassCard>
            </motion.div>
          ))}
    </motion.div>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  const abs = Math.abs(trend).toFixed(1);
  if (Math.abs(trend) < 0.5) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>Flat vs last week</span>
      </div>
    );
  }
  const up = trend > 0;
  return (
    <div className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-emerald-400" : "text-red-400")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{up ? "+" : "-"}{abs}% vs last week</span>
    </div>
  );
}
