"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import { Sparkline } from "@/components/home/sparkline";
import { cn } from "@/lib/utils";

export interface HealthConnector {
  id: string;
  provider: string;
  providerName: string;
  status: "active" | "paused" | "error" | "disconnected";
  lastSync: string | null;
  href: string;
}

interface MetaMetrics {
  spend: string;
  ctr: string;
  trend: number | null;
  sparkData: number[];
}

interface GoogleMetrics {
  cost: string;
  conversions: string;
  roas: string | null;
}

interface DailyRow {
  date_start: string;
  spend: string;
  ctr: string;
}

interface CampaignRow {
  costCurrency: number;
  conversions: number;
  conversionsValue: number;
}

function relativeTime(d: string | null) {
  if (!d) return "Never synced";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `Synced ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Synced ${h}h ago`;
  return `Synced ${Math.floor(h / 24)}d ago`;
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400 shadow-[0_0_6px_1px] shadow-emerald-400/30",
  paused: "bg-amber-400",
  error: "bg-red-400 shadow-[0_0_6px_1px] shadow-red-400/30",
  disconnected: "bg-white/20",
};

export function CampaignHealthStrip({
  connectors,
}: {
  connectors: HealthConnector[];
}) {
  const [metaMetrics, setMetaMetrics] = useState<MetaMetrics | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [googleMetrics, setGoogleMetrics] = useState<GoogleMetrics | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const hasMeta = connectors.some(
      (c) => c.provider === "meta_ads" && c.status === "active"
    );
    if (!hasMeta) return;

    setMetaLoading(true);
    Promise.all([
      fetch("/api/meta/test-insights")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/meta/insights-daily")
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([totals, daily]) => {
      if (!totals?.success || !totals.insights?.length) {
        setMetaLoading(false);
        return;
      }

      const rows = totals.insights as Record<string, string>[];
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];
      const sorted = [...dailyRows].sort(
        (a, b) =>
          new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );
      const recent = sorted.slice(-7);
      const prev = sorted.slice(-14, -7);

      const totalSpend = rows.reduce(
        (s, r) => s + parseFloat(r.spend ?? "0"),
        0
      );
      const avgCtr = rows.length
        ? rows.reduce((s, r) => s + parseFloat(r.ctr ?? "0"), 0) / rows.length
        : 0;

      let trend: number | null = null;
      if (recent.length >= 3 && prev.length >= 3) {
        const rS = recent.reduce((s, r) => s + parseFloat(r.spend), 0);
        const pS = prev.reduce((s, r) => s + parseFloat(r.spend), 0);
        if (pS > 0) trend = ((rS - pS) / pS) * 100;
      }

      const sparkData = recent.map((r) => parseFloat(r.spend));

      setMetaMetrics({
        spend: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(totalSpend),
        ctr: `${avgCtr.toFixed(2)}%`,
        trend,
        sparkData,
      });
      setMetaLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasGoogle = connectors.some(
      (c) => c.provider === "google_ads" && c.status === "active"
    );
    if (!hasGoogle) return;

    setGoogleLoading(true);
    fetch("/api/google-ads/test-insights")
      .then((r) => r.json())
      .catch(() => null)
      .then((data) => {
        if (!data?.ok || !data.insights?.length) {
          setGoogleLoading(false);
          return;
        }
        const rows: CampaignRow[] = data.insights;
        const totalCost = rows.reduce((s, r) => s + r.costCurrency, 0);
        const totalConv = rows.reduce((s, r) => s + r.conversions, 0);
        const totalConvValue = rows.reduce((s, r) => s + r.conversionsValue, 0);
        const roas =
          totalCost > 0 && totalConvValue > 0
            ? (totalConvValue / totalCost).toFixed(1) + "×"
            : null;

        const currency = data.currency || "USD";
        const fmtCost = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(totalCost);

        setGoogleMetrics({
          cost: fmtCost,
          conversions: totalConv > 0 ? totalConv.toFixed(0) : "0",
          roas,
        });
        setGoogleLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (connectors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.07] px-6 py-10 text-center">
        <p className="text-sm text-white/25">No sources connected yet.</p>
        <Link
          href="/dashboard/connectors"
          className="text-sm text-brand/60 transition-colors hover:text-brand"
        >
          Connect a source →
        </Link>
      </div>
    );
  }

  const cols =
    connectors.length === 1
      ? "grid-cols-1 max-w-xs"
      : connectors.length === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid grid-cols-1 gap-3", cols)}>
      {connectors.map((c) => {
        const BrandIcon = BRAND_ICON_MAP[c.provider];
        const isMeta = c.provider === "meta_ads";
        const isGoogle = c.provider === "google_ads";
        const showMetaMetrics = isMeta && c.status === "active";
        const showGoogleMetrics = isGoogle && c.status === "active";

        return (
          <Link
            key={c.id}
            href={c.href}
            className="panel panel-hover group relative flex flex-col p-5"
          >
            {/* Status dot */}
            <div
              className={cn(
                "absolute right-4 top-4 h-[6px] w-[6px] rounded-full",
                STATUS_DOT[c.status] ?? "bg-white/20"
              )}
            />

            {/* Platform header */}
            <div className="mb-4 flex items-center gap-2.5">
              {BrandIcon ? (
                <BrandIcon className="h-[18px] w-[18px] shrink-0 opacity-75 transition-opacity group-hover:opacity-100" />
              ) : (
                <GenericPlatformIcon
                  className="h-[18px] w-[18px] shrink-0 opacity-75"
                  label={c.providerName}
                />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                {c.providerName}
              </span>
            </div>

            {/* Meta metrics */}
            {showMetaMetrics ? (
              metaLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-24 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
                </div>
              ) : metaMetrics ? (
                <div>
                  <p className="font-mono text-[26px] font-semibold tabular-nums leading-none tracking-tight text-foreground/90">
                    {metaMetrics.spend}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="space-y-0.5">
                      {metaMetrics.trend !== null && (
                        <div
                          className={cn(
                            "flex items-center gap-1 font-mono text-[11px] font-medium",
                            metaMetrics.trend >= 0
                              ? "text-emerald-400/80"
                              : "text-red-400/70"
                          )}
                        >
                          {metaMetrics.trend >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {metaMetrics.trend >= 0 ? "+" : ""}
                          {metaMetrics.trend.toFixed(1)}%
                        </div>
                      )}
                      <p className="text-[11px] text-white/30">
                        {metaMetrics.ctr} CTR
                      </p>
                    </div>
                    {metaMetrics.sparkData.length >= 2 && (
                      <Sparkline
                        data={metaMetrics.sparkData}
                        color="#4A6CF7"
                        width={72}
                        height={28}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-white/25">No data yet</p>
              )
            ) : showGoogleMetrics ? (
              /* Google Ads metrics */
              googleLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-24 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
                </div>
              ) : googleMetrics ? (
                <div>
                  <p className="font-mono text-[26px] font-semibold tabular-nums leading-none tracking-tight text-foreground/90">
                    {googleMetrics.cost}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    <p className="font-mono text-[11px] text-emerald-400/80">
                      {googleMetrics.conversions} conversions
                    </p>
                    {googleMetrics.roas && (
                      <p className="text-[11px] text-white/30">
                        {googleMetrics.roas} ROAS
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-white/25">No data yet</p>
              )
            ) : (
              <div>
                <p
                  className={cn(
                    "text-[13px] font-medium",
                    c.status === "error"
                      ? "text-red-400/80"
                      : c.status === "paused"
                      ? "text-amber-400/80"
                      : "text-white/55"
                  )}
                >
                  {c.status === "active"
                    ? "Active"
                    : c.status === "error"
                    ? "Needs attention"
                    : c.status === "paused"
                    ? "Paused"
                    : "Disconnected"}
                </p>
                <p className="mt-1 text-[11px] text-white/25">
                  {relativeTime(c.lastSync)}
                </p>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
