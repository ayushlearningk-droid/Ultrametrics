"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format/currency";

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  costCurrency: number;
  conversions: number;
  conversionsValue: number;
}

interface AggCampaign {
  id: string;
  name: string;
  cost: number;
  clicks: number;
  conversions: number;
  roas: number | null;
  ctr: number;
}

interface ConnectorInfo {
  name: string;
  status: string;
  last_synced_at: string | null;
  external_account_id?: string | null;
}

function relativeTime(d: string | null) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-white/[0.06]", className)} />;
}

function aggregateCampaigns(rows: CampaignRow[]): AggCampaign[] {
  const map = new Map<string, AggCampaign>();
  for (const r of rows) {
    const existing = map.get(r.campaignId);
    if (existing) {
      existing.cost += r.costCurrency;
      existing.clicks += r.clicks;
      existing.conversions += r.conversions;
      const totalConvValue =
        (existing.roas !== null ? existing.roas * existing.cost : 0) +
        r.conversionsValue;
      existing.roas =
        existing.cost + r.costCurrency > 0
          ? totalConvValue / (existing.cost + r.costCurrency)
          : null;
      existing.ctr =
        existing.clicks > 0
          ? (existing.clicks / (existing.clicks + r.impressions)) * 100
          : 0;
    } else {
      map.set(r.campaignId, {
        id: r.campaignId,
        name: r.campaignName,
        cost: r.costCurrency,
        clicks: r.clicks,
        conversions: r.conversions,
        roas:
          r.costCurrency > 0 && r.conversionsValue > 0
            ? r.conversionsValue / r.costCurrency
            : null,
        ctr:
          r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
}

function buildAIAnalysis(
  campaigns: AggCampaign[],
  totalCost: number,
  totalConv: number
): { title: string; body: string; type: "opportunity" | "info" | "healthy" } {
  if (campaigns.length === 0) {
    return {
      type: "info",
      title: "Data is being collected",
      body:
        "Campaign-level insights appear after the first sync. Your Google Ads data is syncing now.",
    };
  }

  const topByConv = [...campaigns].sort(
    (a, b) => b.conversions - a.conversions
  )[0];
  const highRoas = campaigns.filter(
    (c) => c.roas !== null && c.roas > 3 && c.cost > 0
  );
  const lowPerformers = campaigns.filter(
    (c) => c.conversions === 0 && c.cost > totalCost * 0.05
  );

  if (highRoas.length > 0) {
    const avg = highRoas.reduce((s, c) => s + (c.roas ?? 0), 0) / highRoas.length;
    return {
      type: "opportunity",
      title: `${highRoas.length} campaign${highRoas.length > 1 ? "s" : ""} returning strong ROAS`,
      body: `${highRoas.map((c) => `"${c.name}"`).slice(0, 2).join(" and ")} ${highRoas.length > 1 ? "are" : "is"} returning ${avg.toFixed(1)}× ROAS. These campaigns may be budget-constrained — increasing their daily limits could unlock more efficient conversions.`,
    };
  }

  if (lowPerformers.length > 0) {
    return {
      type: "opportunity",
      title: `${lowPerformers.length} campaign${lowPerformers.length > 1 ? "s" : ""} spending without converting`,
      body: `${lowPerformers.slice(0, 2).map((c) => `"${c.name}"`).join(", ")} ${lowPerformers.length > 1 ? "are" : "is"} consuming meaningful budget with zero conversions in the last 30 days. A keyword and audience audit is recommended.`,
    };
  }

  if (topByConv && topByConv.conversions > 0) {
    return {
      type: "healthy",
      title: `"${topByConv.name}" is your top performer`,
      body: `${topByConv.conversions.toFixed(0)} conversions from ${new Intl.NumberFormat("en-US", { notation: "compact" }).format(topByConv.clicks)} clicks. ${totalConv > 0 ? `Overall account is generating ${totalConv.toFixed(0)} conversions across ${campaigns.length} campaigns.` : ""}`,
    };
  }

  return {
    type: "healthy",
    title: "Account is active across all campaigns",
    body: `${campaigns.length} campaigns tracked over the last 30 days.`,
  };
}

const ANALYSIS_STYLE = {
  opportunity: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.04]",
    bar: "bg-emerald-400",
    icon: "text-emerald-400",
    iconEl: TrendingUp,
  },
  info: {
    border: "border-brand/20",
    bg: "bg-brand/[0.04]",
    bar: "bg-brand",
    icon: "text-brand",
    iconEl: Zap,
  },
  healthy: {
    border: "border-emerald-500/15",
    bg: "bg-emerald-500/[0.02]",
    bar: "bg-emerald-400/50",
    icon: "text-emerald-400/80",
    iconEl: CheckCircle2,
  },
};

export function GoogleOverviewCards({
  connector,
  wsId,
  googleAdsConfig,
}: {
  connector: ConnectorInfo;
  wsId: string | null;
  googleAdsConfig: unknown;
}) {
  const [campaigns, setCampaigns] = useState<AggCampaign[] | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [totalConv, setTotalConv] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/google-ads/test-insights")
      .then((r) => r.json())
      .catch(() => null)
      .then((data) => {
        if (!data?.ok || !data.insights?.length) {
          setCampaigns([]);
          setLoading(false);
          return;
        }
        const rows: CampaignRow[] = data.insights;
        const agg = aggregateCampaigns(rows);
        const cost = agg.reduce((s, c) => s + c.cost, 0);
        const conv = agg.reduce((s, c) => s + c.conversions, 0);
        setCampaigns(agg);
        setTotalCost(cost);
        setTotalConv(conv);
        setCurrency(data.currency || "USD");
        setLoading(false);
      });
  }, []);

  const analysis =
    campaigns !== null ? buildAIAnalysis(campaigns, totalCost, totalConv) : null;
  const s = analysis ? ANALYSIS_STYLE[analysis.type] : null;

  const fmtCur = (v: number) => formatCurrency(v, currency);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

      {/* ── Card 1: AI Analysis ───────────────────────────────── */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border p-5 pl-6",
          s ? s.border : "border-white/[0.07]"
        )}
        style={{ background: s ? undefined : "transparent" }}
      >
        {s && (
          <div
            className={cn(
              "absolute left-0 top-4 bottom-4 w-[3px] rounded-r",
              s.bar
            )}
          />
        )}

        <div className="mb-4 flex items-center gap-2">
          {s && <s.iconEl className={cn("h-[14px] w-[14px]", s.icon)} />}
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
            AI Analysis
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        ) : analysis ? (
          <>
            <p className="text-[14px] font-semibold leading-snug text-foreground/85">
              {analysis.title}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/40">
              {analysis.body}
            </p>
          </>
        ) : null}
      </div>

      {/* ── Card 2: Top Campaigns ─────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-[14px] w-[14px] text-white/25" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
            Top Campaigns · 30d
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="space-y-0 divide-y divide-white/[0.05]">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] text-white/20" />
              <div className="flex items-center gap-6">
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/25">
                  Cost
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/25">
                  Conv.
                </span>
              </div>
            </div>
            {campaigns.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2.5"
              >
                <p className="flex-1 truncate text-[12px] text-foreground/70">
                  {c.name}
                </p>
                <div className="flex items-center gap-6 shrink-0">
                  <span className="font-mono text-[12px] tabular-nums text-foreground/70">
                    {fmtCur(c.cost)}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[12px] tabular-nums",
                      c.conversions > 0
                        ? "text-emerald-400/80"
                        : "text-white/25"
                    )}
                  >
                    {c.conversions.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
            {campaigns.length > 4 && (
              <p className="pt-2 text-[11px] text-white/25">
                +{campaigns.length - 4} more campaigns
              </p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-white/25">
            Campaign data will appear after the first sync.
          </p>
        )}
      </div>

      {/* ── Card 3: Account Summary ───────────────────────────── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-2">
          <div
            className={cn(
              "h-[6px] w-[6px] rounded-full",
              connector.status === "active"
                ? "animate-pulse bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/40"
                : "bg-amber-400"
            )}
          />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
            Account Summary
          </p>
        </div>

        <div className="space-y-0 divide-y divide-white/[0.05]">
          {((): { label: string; value: string; capitalize?: boolean; mono?: boolean }[] => [
            { label: "Status", value: connector.status, capitalize: true },
            {
              label: "Customer ID",
              value: connector.external_account_id ?? "—",
              mono: true,
            },
            {
              label: "Last sync",
              value: relativeTime(connector.last_synced_at),
            },
            ...(totalCost > 0 && totalConv > 0
              ? [
                  {
                    label: "30d CPA",
                    value: fmtCur(totalCost / totalConv),
                    mono: true,
                  },
                ]
              : []),
          ])().map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-2.5"
            >
              <span className="text-[11px] text-white/30">{row.label}</span>
              <span
                className={cn(
                  "text-[12px] font-medium text-foreground/70",
                  row.capitalize && "capitalize",
                  row.mono && "font-mono text-white/45"
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {wsId && !!googleAdsConfig && (
            <a
              href={`/api/connectors/google-ads/oauth/start?workspaceId=${encodeURIComponent(wsId)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] px-3 py-1.5 text-[12px] text-white/40 transition-all hover:border-white/[0.16] hover:text-white/70"
            >
              <RefreshCw className="h-3 w-3" />
              Reconnect
            </a>
          )}
          <Link
            href="/dashboard/sync-jobs"
            className="inline-flex items-center gap-1 text-[12px] text-white/30 transition-colors hover:text-white/60"
          >
            Sync history
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
