"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart } from "@/components/ui/area-chart";
import { cn } from "@/lib/utils";

interface DailyRow {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
}

interface Metric {
  key: string;
  label: string;
  value: string;
  rawValue: number;
  trend: number | null;
}

type ChartKey = "spend" | "impressions" | "clicks" | "ctr";

const CHART_COLOR: Record<ChartKey, string> = {
  spend: "#4F8BEE",
  impressions: "#34D399",
  clicks: "#A78BFA",
  ctr: "#F59E0B",
};

export function MetricsRow({ currency = "USD" }: { currency?: string }) {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [chartData, setChartData] = useState<Record<ChartKey, { label: string; value: number }[]> | null>(null);
  const [activeChart, setActiveChart] = useState<ChartKey>("spend");
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

      const rows = totals.insights;
      const cur = totals.currency ?? currency;
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];

      const sorted = [...dailyRows].sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );
      const recent = sorted.slice(-7);
      const prev = sorted.slice(-14, -7);

      function trendFor(key: keyof DailyRow, mode: "sum" | "avg"): number | null {
        if (!recent.length || !prev.length) return null;
        const r = recent.reduce((s, d) => s + parseFloat(d[key] as string ?? "0"), 0);
        const p = prev.reduce((s, d) => s + parseFloat(d[key] as string ?? "0"), 0);
        const rv = mode === "avg" ? r / recent.length : r;
        const pv = mode === "avg" ? p / prev.length : p;
        if (pv === 0) return null;
        return ((rv - pv) / Math.abs(pv)) * 100;
      }

      const totalSpend = rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.spend ?? "0"), 0);
      const totalImp = rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.impressions ?? "0"), 0);
      const totalClicks = rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.clicks ?? "0"), 0);
      const avgCtr = rows.length ? rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.ctr ?? "0"), 0) / rows.length : 0;

      setMetrics([
        {
          key: "spend", label: "Ad Spend", rawValue: totalSpend, trend: trendFor("spend", "sum"),
          value: new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(totalSpend),
        },
        {
          key: "impressions", label: "Impressions", rawValue: totalImp, trend: trendFor("impressions", "sum"),
          value: new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(totalImp),
        },
        {
          key: "clicks", label: "Clicks", rawValue: totalClicks, trend: trendFor("clicks", "sum"),
          value: new Intl.NumberFormat("en-US").format(Math.round(totalClicks)),
        },
        {
          key: "ctr", label: "Avg. CTR", rawValue: avgCtr, trend: trendFor("ctr", "avg"),
          value: `${avgCtr.toFixed(2)}%`,
        },
      ]);

      if (recent.length >= 2) {
        const makeChart = (key: keyof DailyRow) =>
          recent.map((r) => ({
            label: new Date(r.date_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            value: parseFloat(r[key] as string ?? "0"),
          }));

        setChartData({
          spend: makeChart("spend"),
          impressions: makeChart("impressions"),
          clicks: makeChart("clicks"),
          ctr: makeChart("ctr"),
        });
      }

      setLoading(false);
    }).catch(() => {
      setNoData(true);
      setLoading(false);
    });
  }, [currency]);

  if (noData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
          {["Ad Spend", "Impressions", "Clicks", "Avg. CTR"].map((label) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20">{label}</p>
              <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-white/15 lg:text-4xl">—</p>
              <p className="mt-2 text-xs text-white/20">Connect Meta Ads</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        {loading
          ? ["Ad Spend", "Impressions", "Clicks", "Avg. CTR"].map((label) => (
              <div key={label} className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20">{label}</p>
                <div className="h-10 w-28 animate-pulse rounded bg-white/[0.05]" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-white/[0.03]" />
              </div>
            ))
          : (metrics ?? []).map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveChart(m.key as ChartKey)}
                className={cn(
                  "group text-left transition-opacity",
                  chartData && activeChart !== m.key && "opacity-50 hover:opacity-80"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 transition-colors group-hover:text-white/40">
                  {m.label}
                </p>
                <p className={cn(
                  "mt-3 font-mono text-3xl font-semibold leading-none tabular-nums tracking-tight transition-colors lg:text-[2.5rem]",
                  activeChart === m.key ? "text-foreground" : "text-foreground/80"
                )}>
                  {m.value}
                </p>
                {m.trend !== null && (
                  <TrendIndicator trend={m.trend} />
                )}
              </button>
            ))}
      </div>

      {/* Trend chart */}
      {chartData && (
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-4 pb-3 pt-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20">
              {metrics?.find((m) => m.key === activeChart)?.label} · 7-day trend
            </p>
          </div>
          <AreaChart
            data={chartData[activeChart]}
            color={CHART_COLOR[activeChart]}
            height={72}
            showGrid
            showTooltip
            animated
            formatValue={(v) => {
              if (activeChart === "spend") return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(v);
              if (activeChart === "ctr") return `${v.toFixed(2)}%`;
              return new Intl.NumberFormat("en-US", { notation: "compact" }).format(v);
            }}
          />
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: number }) {
  const abs = Math.abs(trend);
  if (abs < 0.5) {
    return (
      <div className="mt-2 flex items-center gap-1 text-[11px] text-white/30">
        <Minus className="h-3 w-3" />
        <span>Flat vs prev week</span>
      </div>
    );
  }
  const up = trend > 0;
  return (
    <div className={cn("mt-2 flex items-center gap-1 text-[11px] font-medium", up ? "text-emerald-400/80" : "text-red-400/80")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{up ? "+" : "−"}{abs.toFixed(1)}% vs prev week</span>
    </div>
  );
}
