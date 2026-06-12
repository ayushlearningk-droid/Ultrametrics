"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyRow {
  date_start: string;
  spend: string;
  ctr: string;
  impressions: string;
}

type Direction = "up" | "stable" | "down";

interface Signal {
  label: string;
  status: string;
  direction: Direction;
}

const DIR_COLOR: Record<Direction, string> = {
  up: "text-emerald-400",
  stable: "text-white/50",
  down: "text-amber-400",
};

const DIR_ICON_COLOR: Record<Direction, string> = {
  up: "text-emerald-400/50",
  stable: "text-white/18",
  down: "text-amber-400/50",
};

function computeSignals(
  rSpend: number,
  pSpend: number,
  rImpressions: number,
  pImpressions: number,
  avgCtr: number
): Signal[] {
  const spendPct = pSpend ? ((rSpend - pSpend) / pSpend) * 100 : 0;
  const impPct = pImpressions ? ((rImpressions - pImpressions) / pImpressions) * 100 : 0;

  const performance: Signal =
    spendPct > 15
      ? { label: "Performance", status: "Excellent", direction: "up" }
      : spendPct > 5
      ? { label: "Performance", status: "Growing", direction: "up" }
      : spendPct > -5
      ? { label: "Performance", status: "Stable", direction: "stable" }
      : { label: "Performance", status: "Declining", direction: "down" };

  const reach: Signal =
    impPct > 10
      ? { label: "Reach", status: "Growing", direction: "up" }
      : impPct > -5
      ? { label: "Reach", status: "Stable", direction: "stable" }
      : { label: "Reach", status: "Shrinking", direction: "down" };

  const ctrSignal: Signal =
    avgCtr > 2
      ? { label: "CTR", status: "Excellent", direction: "up" }
      : avgCtr > 1.5
      ? { label: "CTR", status: "Strong", direction: "up" }
      : avgCtr > 1
      ? { label: "CTR", status: "Fair", direction: "stable" }
      : { label: "CTR", status: "Weak", direction: "down" };

  const spendSignal: Signal =
    spendPct > 8
      ? { label: "Spend", status: "Active", direction: "up" }
      : spendPct > -8
      ? { label: "Spend", status: "Stable", direction: "stable" }
      : { label: "Spend", status: "Declining", direction: "down" };

  return [performance, reach, ctrSignal, spendSignal];
}

const SKELETON_SIGNALS = ["Performance", "Reach", "CTR", "Spend"];

export function MetaMetricsStrip() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/meta/test-insights").then((r) => r.json()).catch(() => null),
      fetch("/api/meta/insights-daily").then((r) => r.json()).catch(() => null),
    ]).then(([totals, daily]) => {
      if (!totals?.success || !totals.insights?.length) {
        setSignals(null);
        setLoading(false);
        return;
      }

      const rows = totals.insights as Record<string, string>[];
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];
      const sorted = [...dailyRows].sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );
      const recent7 = sorted.slice(-7);
      const prev7 = sorted.slice(-14, -7);

      const avgCtr = rows.length
        ? rows.reduce((s, r) => s + parseFloat(r.ctr ?? "0"), 0) / rows.length
        : 0;

      const rSpend = recent7.reduce((s, r) => s + parseFloat(r.spend), 0);
      const pSpend = prev7.reduce((s, r) => s + parseFloat(r.spend), 0);
      const rImpressions = recent7.reduce((s, r) => s + parseFloat(r.impressions ?? "0"), 0);
      const pImpressions = prev7.reduce((s, r) => s + parseFloat(r.impressions ?? "0"), 0);

      setSignals(computeSignals(rSpend, pSpend, rImpressions, pImpressions, avgCtr));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center divide-x divide-white/[0.05] px-6 py-3.5 sm:px-8 lg:px-12 xl:px-16">
        <div className="h-2.5 w-28 animate-pulse rounded bg-white/[0.04] pr-5" />
        {SKELETON_SIGNALS.map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-5 py-0.5">
            <div
              className="h-2 w-16 animate-pulse rounded bg-white/[0.04]"
              style={{ animationDelay: `${i * 70}ms` }}
            />
            <div
              className="h-3.5 w-12 animate-pulse rounded bg-white/[0.06]"
              style={{ animationDelay: `${i * 70}ms` }}
            />
          </div>
        ))}
      </div>
    );
  }

  const items: Signal[] = signals ?? [
    { label: "Performance", status: "No data", direction: "stable" },
    { label: "Reach", status: "No data", direction: "stable" },
    { label: "CTR", status: "No data", direction: "stable" },
    { label: "Spend", status: "No data", direction: "stable" },
  ];

  return (
    <div className="flex items-center divide-x divide-white/[0.05] px-6 sm:px-8 lg:px-12 xl:px-16">
      {/* Section label */}
      <p className="py-3.5 pr-5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/18">
        Account Health
      </p>

      {/* Signals */}
      {items.map((sig) => (
        <div key={sig.label} className="flex items-center gap-2 px-5 py-3.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/22">
            {sig.label}
          </p>
          {sig.direction === "up" ? (
            <TrendingUp className={cn("h-[11px] w-[11px]", DIR_ICON_COLOR.up)} />
          ) : sig.direction === "down" ? (
            <TrendingDown className={cn("h-[11px] w-[11px]", DIR_ICON_COLOR.down)} />
          ) : (
            <Minus className={cn("h-[11px] w-[11px]", DIR_ICON_COLOR.stable)} />
          )}
          <span className={cn("text-[12px] font-semibold leading-none", DIR_COLOR[sig.direction])}>
            {sig.status}
          </span>
        </div>
      ))}
    </div>
  );
}
