"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignRow {
  campaignId: string;
  impressions: number;
  clicks: number;
  costCurrency: number;
  conversions: number;
  conversionsValue: number;
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

function computeSignals(rows: CampaignRow[]): Signal[] {
  const totalCost = rows.reduce((s, r) => s + r.costCurrency, 0);
  const totalConvValue = rows.reduce((s, r) => s + r.conversionsValue, 0);
  const totalConv = rows.reduce((s, r) => s + r.conversions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImp = rows.reduce((s, r) => s + r.impressions, 0);

  const roas = totalCost > 0 ? totalConvValue / totalCost : 0;
  const avgCtr = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0;
  const cpa = totalConv > 0 ? totalCost / totalConv : 0;
  const convRate = rows.filter((r) => r.conversions > 0).length / Math.max(rows.length, 1);

  const roasSignal: Signal =
    roas > 4
      ? { label: "ROAS", status: "Excellent", direction: "up" }
      : roas > 2
      ? { label: "ROAS", status: "Strong", direction: "up" }
      : roas > 1
      ? { label: "ROAS", status: "Positive", direction: "stable" }
      : roas > 0
      ? { label: "ROAS", status: "Breakeven", direction: "down" }
      : { label: "ROAS", status: "No Data", direction: "stable" };

  const ctrSignal: Signal =
    avgCtr > 3
      ? { label: "CTR", status: "Excellent", direction: "up" }
      : avgCtr > 1.5
      ? { label: "CTR", status: "Strong", direction: "up" }
      : avgCtr > 0.8
      ? { label: "CTR", status: "Fair", direction: "stable" }
      : avgCtr > 0
      ? { label: "CTR", status: "Weak", direction: "down" }
      : { label: "CTR", status: "No Data", direction: "stable" };

  const efficiencySignal: Signal =
    totalConv === 0
      ? { label: "Efficiency", status: "No Conv.", direction: "stable" }
      : cpa < totalCost * 0.05
      ? { label: "Efficiency", status: "Excellent", direction: "up" }
      : cpa < totalCost * 0.15
      ? { label: "Efficiency", status: "Good", direction: "up" }
      : { label: "Efficiency", status: "Costly", direction: "down" };

  const coverageSignal: Signal =
    convRate >= 1
      ? { label: "Coverage", status: "All Active", direction: "up" }
      : convRate >= 0.5
      ? { label: "Coverage", status: "Partial", direction: "stable" }
      : convRate > 0
      ? { label: "Coverage", status: "Limited", direction: "down" }
      : { label: "Coverage", status: "No Conv.", direction: "stable" };

  return [roasSignal, ctrSignal, efficiencySignal, coverageSignal];
}

const SKELETON_LABELS = ["ROAS", "CTR", "Efficiency", "Coverage"];

export function GoogleMetricsStrip() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/google-ads/test-insights")
      .then((r) => r.json())
      .catch(() => null)
      .then((data) => {
        if (data?.ok && data.insights?.length) {
          setSignals(computeSignals(data.insights as CampaignRow[]));
        } else {
          setSignals(null);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center divide-x divide-white/[0.05] px-6 py-3.5 sm:px-8 lg:px-12 xl:px-16">
        <div className="h-2.5 w-28 animate-pulse rounded bg-white/[0.04] pr-5" />
        {SKELETON_LABELS.map((_, i) => (
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
    { label: "ROAS", status: "No data", direction: "stable" },
    { label: "CTR", status: "No data", direction: "stable" },
    { label: "Efficiency", status: "No data", direction: "stable" },
    { label: "Coverage", status: "No data", direction: "stable" },
  ];

  return (
    <div className="flex items-center divide-x divide-white/[0.05] px-6 sm:px-8 lg:px-12 xl:px-16">
      <p className="py-3.5 pr-5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/18">
        Account Health
      </p>
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
