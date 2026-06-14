"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Lightbulb,
  Zap,
  Target,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/format/currency";

/* ─── Types ──────────────────────────────────────────────────────── */

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

interface ConnectorInfo {
  name: string;
  status: string;
  last_synced_at: string | null;
  external_account_id?: string | null;
}

/* ─── Analysis ───────────────────────────────────────────────────── */

type AnalysisType = "critical" | "opportunity" | "healthy" | "insufficient";

interface Analysis {
  type: AnalysisType;
  headline: string;
  subtext: string;
  severity: string;
  confidence: number;
  impact: string;
  roasPill?: string;
  ctrPill?: string;
}

function buildAnalysis(rows: CampaignRow[]): Analysis {
  if (!rows.length) {
    return {
      type: "insufficient",
      headline: "Monitoring your\ncampaigns.",
      subtext:
        "AI analysis activates after the first data sync. Keep your campaigns running — personalised insights will appear automatically.",
      severity: "Monitoring",
      confidence: 0,
      impact: "Pending",
    };
  }

  const totalCost = rows.reduce((s, r) => s + r.costCurrency, 0);
  const totalConvValue = rows.reduce((s, r) => s + r.conversionsValue, 0);
  const totalConv = rows.reduce((s, r) => s + r.conversions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImp = rows.reduce((s, r) => s + r.impressions, 0);

  const roas = totalCost > 0 ? totalConvValue / totalCost : 0;
  const avgCtr = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0;

  const highRoasCampaigns = rows
    .filter(
      (r) =>
        r.costCurrency > 0 &&
        r.conversionsValue > 0 &&
        r.conversionsValue / r.costCurrency > 3
    )
    .sort(
      (a, b) =>
        b.conversionsValue / b.costCurrency - a.conversionsValue / a.costCurrency
    );

  const zeroConvCampaigns = rows.filter(
    (r) => r.conversions === 0 && r.costCurrency > totalCost * 0.08
  );

  if (roas > 3 && highRoasCampaigns.length > 0) {
    const top = highRoasCampaigns[0];
    const topRoas = top.conversionsValue / top.costCurrency;
    return {
      type: "opportunity",
      headline: `${roas.toFixed(1)}× ROAS\ndetected.`,
      subtext: `"${top.campaignName}" is returning ${topRoas.toFixed(1)}× ROAS — among the strongest in your account. These campaigns are likely budget-constrained. Scaling daily spend by 20–30% could unlock significantly more conversions at proven efficiency.`,
      severity: "Positive",
      confidence: 89,
      impact: "High",
      roasPill: `${roas.toFixed(1)}×`,
      ctrPill: `${avgCtr.toFixed(2)}%`,
    };
  }

  if (zeroConvCampaigns.length > 0) {
    const names = zeroConvCampaigns
      .slice(0, 2)
      .map((c) => `"${c.campaignName}"`)
      .join(" and ");
    return {
      type: "critical",
      headline: "Budget leakage\ndetected.",
      subtext: `${names} ${zeroConvCampaigns.length > 1 ? "are" : "is"} consuming budget with zero conversions. A keyword and audience audit is recommended before scaling — stopping waste is the fastest path to improving blended ROAS.`,
      severity: "Warning",
      confidence: 84,
      impact: "High",
      ctrPill: `${avgCtr.toFixed(2)}%`,
    };
  }

  if (avgCtr < 0.8 && totalImp > 10000) {
    return {
      type: "critical",
      headline: "CTR below\nindustry benchmark.",
      subtext: `Average CTR is ${avgCtr.toFixed(2)}%, well below the 1.5% search benchmark. Stronger ad copy, tighter match types, and ad extensions can typically recover CTR within 5–7 days of structured A/B testing.`,
      severity: "Warning",
      confidence: 81,
      impact: "Medium",
      ctrPill: `${avgCtr.toFixed(2)}%`,
    };
  }

  if (totalConv > 0 && roas > 1) {
    return {
      type: "healthy",
      headline: "Account\nperforming well.",
      subtext: `${totalConv.toFixed(0)} conversions this period across ${rows.length} campaigns with a ${roas.toFixed(1)}× ROAS. No critical signals detected — the priority now is scaling your top performers before competitors respond.`,
      severity: "Stable",
      confidence: 78,
      impact: "Low",
      roasPill: `${roas.toFixed(1)}×`,
      ctrPill: `${avgCtr.toFixed(2)}%`,
    };
  }

  return {
    type: "healthy",
    headline: "Campaigns are\nrunning smoothly.",
    subtext: `${rows.length} campaigns active over the last 30 days with ${formatNumber(totalImp, "USD", { compact: true })} impressions. Continue monitoring — conversion data will enable deeper optimisation recommendations.`,
    severity: "Active",
    confidence: 65,
    impact: "Low",
    ctrPill: `${avgCtr.toFixed(2)}%`,
  };
}

/* ─── Severity styles ────────────────────────────────────────────── */

const SEV_STYLE = {
  critical: {
    glow: "radial-gradient(ellipse 70% 55% at 50% -10%, rgba(245,158,11,0.11), transparent)",
    accentBar: "bg-gradient-to-b from-amber-400 to-amber-600",
    severityTag: "bg-amber-400/10 border-amber-400/30 text-amber-300",
    ctaPrimary:
      "bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20 hover:border-amber-400/55",
    liveColor: "bg-amber-400",
    livePing: "bg-amber-400",
  },
  opportunity: {
    glow: "radial-gradient(ellipse 70% 55% at 50% -10%, rgba(52,211,153,0.09), transparent)",
    accentBar: "bg-gradient-to-b from-emerald-400 to-emerald-600",
    severityTag: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300",
    ctaPrimary:
      "bg-emerald-400/10 border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/20 hover:border-emerald-400/55",
    liveColor: "bg-emerald-400",
    livePing: "bg-emerald-400",
  },
  healthy: {
    glow: "radial-gradient(ellipse 70% 55% at 50% -10%, rgba(52,211,153,0.04), transparent)",
    accentBar: "bg-gradient-to-b from-emerald-400/60 to-emerald-600/40",
    severityTag: "bg-emerald-400/[0.06] border-emerald-400/20 text-emerald-400/70",
    ctaPrimary:
      "bg-white/[0.04] border-white/10 text-white/55 hover:bg-white/[0.07] hover:border-white/20",
    liveColor: "bg-emerald-400/70",
    livePing: "bg-emerald-400/70",
  },
  insufficient: {
    glow: "none",
    accentBar: "bg-gradient-to-b from-brand/50 to-brand/20",
    severityTag: "bg-brand/[0.08] border-brand/20 text-brand/80",
    ctaPrimary:
      "bg-white/[0.04] border-white/10 text-white/40 hover:bg-white/[0.07] hover:border-white/18",
    liveColor: "bg-brand/60",
    livePing: "bg-brand/60",
  },
};

/* ─── Campaign health score ──────────────────────────────────────── */

function campaignScore(r: CampaignRow): number {
  const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
  const roas =
    r.costCurrency > 0 && r.conversionsValue > 0
      ? r.conversionsValue / r.costCurrency
      : 0;
  let score = 50;
  if (ctr > 3) score += 25;
  else if (ctr > 1.5) score += 15;
  else if (ctr < 0.5 && r.impressions > 500) score -= 15;
  if (roas > 4) score += 25;
  else if (roas > 2) score += 15;
  else if (roas > 1) score += 5;
  else if (r.conversions === 0 && r.costCurrency > 0) score -= 10;
  return Math.max(10, Math.min(99, score));
}

function healthLabel(score: number) {
  if (score >= 80)
    return { label: "Excellent", text: "text-emerald-400", bar: "bg-emerald-400" };
  if (score >= 65)
    return { label: "Good", text: "text-emerald-400/80", bar: "bg-emerald-400/70" };
  if (score >= 45)
    return { label: "Fair", text: "text-amber-400", bar: "bg-amber-400" };
  return { label: "Poor", text: "text-red-400", bar: "bg-red-400" };
}

/* ─── Opportunities ──────────────────────────────────────────────── */

interface Opp {
  id: number;
  IconEl: React.ElementType;
  type: string;
  title: string;
  action: string;
  impact: string;
  confidence: number;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  tagClass: string;
  btnClass: string;
}

const EMERALD_OPP = {
  colorClass: "text-emerald-400",
  borderClass: "border-emerald-500/20",
  bgClass: "bg-emerald-500/[0.04]",
  tagClass: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300",
  btnClass:
    "border-emerald-400/25 text-emerald-300/80 hover:bg-emerald-400/[0.08] hover:border-emerald-400/50 hover:text-emerald-200",
};

const AMBER_OPP = {
  colorClass: "text-amber-400",
  borderClass: "border-amber-500/20",
  bgClass: "bg-amber-500/[0.04]",
  tagClass: "bg-amber-400/10 border-amber-400/30 text-amber-300",
  btnClass:
    "border-amber-400/25 text-amber-300/80 hover:bg-amber-400/[0.08] hover:border-amber-400/50 hover:text-amber-200",
};

const BLUE_OPP = {
  colorClass: "text-blue-400",
  borderClass: "border-blue-500/20",
  bgClass: "bg-blue-500/[0.04]",
  tagClass: "bg-blue-400/10 border-blue-400/30 text-blue-300",
  btnClass:
    "border-blue-400/25 text-blue-300/80 hover:bg-blue-400/[0.08] hover:border-blue-400/50 hover:text-blue-200",
};

function buildOpportunities(rows: CampaignRow[], currency: string): Opp[] {
  const totalCost = rows.reduce((s, r) => s + r.costCurrency, 0);
  const totalConvValue = rows.reduce((s, r) => s + r.conversionsValue, 0);
  const roas = totalCost > 0 ? totalConvValue / totalCost : 0;
  const opps: Opp[] = [];

  // 1 — Scale best ROAS campaign
  const byRoas = [...rows]
    .filter((r) => r.costCurrency > 0 && r.conversionsValue > 0)
    .sort(
      (a, b) =>
        b.conversionsValue / b.costCurrency - a.conversionsValue / a.costCurrency
    );

  if (byRoas.length > 0) {
    const top = byRoas[0];
    const topRoas = top.conversionsValue / top.costCurrency;
    opps.push({
      id: 1,
      IconEl: TrendingUp,
      type: "SCALE",
      title: `Scale "${top.campaignName}"`,
      action: "Increase Daily Budget",
      impact: `${topRoas.toFixed(1)}× ROAS · Likely budget-constrained`,
      confidence: 87,
      ...EMERALD_OPP,
    });
  } else {
    opps.push({
      id: 1,
      IconEl: TrendingUp,
      type: "SCALE",
      title: "Enable Smart Bidding",
      action: "Switch to Target CPA",
      impact: "Automate bids for better cost efficiency",
      confidence: 74,
      ...EMERALD_OPP,
    });
  }

  // 2 — Fix worst performer or add negative keywords
  const zeroConv = rows.filter(
    (r) => r.conversions === 0 && r.costCurrency > totalCost * 0.08
  );
  const byBadCtr = [...rows]
    .filter((r) => r.impressions > 1000)
    .sort(
      (a, b) => a.clicks / a.impressions - b.clicks / b.impressions
    );

  if (zeroConv.length > 0) {
    const wasted = zeroConv.reduce((s, r) => s + r.costCurrency, 0);
    opps.push({
      id: 2,
      IconEl: Zap,
      type: "FIX",
      title: `Audit ${zeroConv.length} Zero-Conversion Campaign${zeroConv.length > 1 ? "s" : ""}`,
      action: "Review Keywords & Audiences",
      impact: `${formatCurrency(wasted, currency)} spend · 0 conversions`,
      confidence: 82,
      ...AMBER_OPP,
    });
  } else if (
    byBadCtr.length > 0 &&
    (byBadCtr[0].clicks / byBadCtr[0].impressions) * 100 < 1.5
  ) {
    const worst = byBadCtr[0];
    const ctr = (worst.clicks / worst.impressions) * 100;
    opps.push({
      id: 2,
      IconEl: Zap,
      type: "IMPROVE",
      title: `Refresh "${worst.campaignName}" Ads`,
      action: "Test New Headlines & Copy",
      impact: `CTR ${ctr.toFixed(2)}% · Below 1.5% benchmark`,
      confidence: 76,
      ...AMBER_OPP,
    });
  } else {
    opps.push({
      id: 2,
      IconEl: ShieldCheck,
      type: "PROTECT",
      title: "Add Negative Keywords",
      action: "Audit Search Term Report",
      impact: "Cut wasted spend by 10–25%",
      confidence: 71,
      ...AMBER_OPP,
    });
  }

  // 3 — Expansion or format upgrade
  if (roas > 2) {
    opps.push({
      id: 3,
      IconEl: Target,
      type: "EXPAND",
      title: "Launch Responsive Search Ads",
      action: "Upgrade to RSA Format",
      impact: "RSAs outperform ETAs by up to 11% CTR",
      confidence: 69,
      ...BLUE_OPP,
    });
  } else {
    opps.push({
      id: 3,
      IconEl: Target,
      type: "EXPAND",
      title: "Expand Keyword Coverage",
      action: "Add Long-Tail Variations",
      impact: "Capture high-intent queries at lower CPC",
      confidence: 67,
      ...BLUE_OPP,
    });
  }

  return opps;
}

const FALLBACK_OPPORTUNITIES: Opp[] = [
  {
    id: 1,
    IconEl: TrendingUp,
    type: "SCALE",
    title: "Connect Your Ad Account",
    action: "Sync Campaign Data",
    impact: "Unlock AI-powered recommendations",
    confidence: 100,
    ...EMERALD_OPP,
  },
  {
    id: 2,
    IconEl: ShieldCheck,
    type: "PROTECT",
    title: "Add Negative Keywords",
    action: "Audit Search Term Report",
    impact: "Cut wasted spend by 10–25%",
    confidence: 71,
    ...AMBER_OPP,
  },
  {
    id: 3,
    IconEl: Target,
    type: "EXPAND",
    title: "Launch Responsive Search Ads",
    action: "Upgrade to RSA Format",
    impact: "RSAs outperform ETAs by up to 11% CTR",
    confidence: 69,
    ...BLUE_OPP,
  },
];

/* ─── Skeleton ───────────────────────────────────────────────────── */

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)} />;
}

/* ─── Main Component ─────────────────────────────────────────────── */

export function GoogleOverviewCards({
  connector: _connector,
  wsId: _wsId,
  googleAdsConfig: _googleAdsConfig,
}: {
  connector: ConnectorInfo;
  wsId: string | null;
  googleAdsConfig: unknown;
}) {
  const [rows, setRows] = useState<CampaignRow[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/google-ads/test-insights")
      .then((r) => r.json())
      .catch(() => null)
      .then((data) => {
        if (data?.ok && data.insights?.length) {
          setRows(data.insights);
          setCurrency(data.currency || "USD");
        } else {
          setRows([]);
        }
        setLoading(false);
      });
  }, []);

  const analysis = rows !== null ? buildAnalysis(rows) : null;
  const s = analysis ? SEV_STYLE[analysis.type] : SEV_STYLE.insufficient;

  const totalCost = rows ? rows.reduce((sum, r) => sum + r.costCurrency, 0) : null;
  const totalClicks = rows ? rows.reduce((sum, r) => sum + r.clicks, 0) : null;
  const totalConv = rows ? rows.reduce((sum, r) => sum + r.conversions, 0) : null;
  const avgCpc =
    totalCost !== null && totalClicks !== null && totalClicks > 0
      ? totalCost / totalClicks
      : null;

  const opportunities =
    rows && rows.length > 0
      ? buildOpportunities(rows, currency)
      : FALLBACK_OPPORTUNITIES;

  return (
    <div>

      {/* ══════════════════════════════════════════════════════════════
          1 · AI HERO
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative flex min-h-[calc(100vh-180px)] flex-col justify-center overflow-hidden px-6 py-16 sm:px-8 lg:px-12 xl:px-16"
        style={s.glow !== "none" ? { background: s.glow } : undefined}
      >
        {/* Left accent bar */}
        <div className={cn("absolute inset-y-0 left-0 w-[3px]", s.accentBar)} />

        {/* Live indicator + severity */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="relative flex h-[8px] w-[8px]">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                s.livePing
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-[8px] w-[8px] rounded-full",
                s.liveColor
              )}
            />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/30">
            AI Analysis · Live
          </span>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
              s.severityTag
            )}
          >
            {analysis?.severity ?? "Monitoring"}
          </span>
        </div>

        {/* Headline */}
        <div className="max-w-5xl">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-16 w-1/2" />
            </div>
          ) : (
            <h2 className="whitespace-pre-line text-[52px] font-black leading-[1.03] tracking-[-0.035em] text-foreground/96 sm:text-[62px] lg:text-[74px]">
              {analysis?.headline ?? "Monitoring your\ncampaigns."}
            </h2>
          )}
          {loading ? (
            <div className="mt-7 space-y-2.5">
              <Skeleton className="h-5 w-full max-w-2xl" />
              <Skeleton className="h-5 w-4/5 max-w-xl" />
            </div>
          ) : (
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-white/48">
              {analysis?.subtext}
            </p>
          )}
        </div>

        {/* Data pills */}
        {!loading && analysis && (
          <div className="mt-9 flex flex-wrap gap-3">
            {analysis.roasPill && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/22">
                  ROAS · 30 Day
                </p>
                <p className="mt-1.5 font-mono text-[26px] font-black tabular-nums leading-none text-emerald-400">
                  {analysis.roasPill}
                </p>
              </div>
            )}
            {analysis.ctrPill && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/22">
                  Avg CTR
                </p>
                <p className="mt-1.5 font-mono text-[26px] font-black tabular-nums leading-none text-white/85">
                  {analysis.ctrPill}
                </p>
              </div>
            )}
            {analysis.confidence > 0 && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/22">
                  Confidence
                </p>
                <p className="mt-1.5 font-mono text-[26px] font-black tabular-nums leading-none text-white/85">
                  {analysis.confidence}%
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/22">
                Impact
              </p>
              <p className="mt-1.5 text-[26px] font-black leading-none text-white/85">
                {analysis.impact}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!loading && (
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-[13px] font-bold transition-all",
                s.ctaPrimary
              )}
            >
              Scale top campaigns
              <ArrowRight className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-6 py-3.5 text-[13px] font-medium text-white/32 transition-all hover:border-white/[0.16] hover:text-white/60">
              View full analysis
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          2 · ACCOUNT PERFORMANCE METRICS
      ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] bg-white/[0.012] px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
        <p className="mb-6 text-[9px] font-bold uppercase tracking-[0.28em] text-white/20">
          Account Performance · 30 Days
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 lg:grid-cols-4">
          {[
            {
              label: "Total Cost",
              value:
                loading || totalCost === null
                  ? null
                  : formatCurrency(totalCost, currency),
            },
            {
              label: "Clicks",
              value:
                loading || totalClicks === null
                  ? null
                  : formatNumber(totalClicks, currency, { compact: true }),
            },
            {
              label: "Conversions",
              value:
                loading || totalConv === null ? null : totalConv.toFixed(0),
            },
            {
              label: "Avg. CPC",
              value:
                loading || avgCpc === null
                  ? null
                  : formatCurrency(avgCpc, currency, { decimals: 2 }),
            },
          ].map((m) => (
            <div key={m.label}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
                {m.label}
              </p>
              {m.value === null ? (
                <Skeleton className="mt-2 h-10 w-28" />
              ) : (
                <p className="mt-2 font-mono text-[32px] font-semibold tabular-nums leading-none text-foreground/88">
                  {m.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          3 · TOP OPPORTUNITIES
      ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="mb-6 flex items-center gap-3">
          <Activity className="h-[13px] w-[13px] text-white/25" />
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/25">
            Top Opportunities · AI Detected
          </p>
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] font-bold text-white/28">
            3
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {opportunities.map((opp) => {
              const OppIcon = opp.IconEl;
              return (
                <div
                  key={opp.id}
                  className={cn(
                    "rounded-2xl border p-5 transition-colors hover:bg-white/[0.02]",
                    opp.borderClass,
                    opp.bgClass
                  )}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]",
                        opp.tagClass
                      )}
                    >
                      {opp.type}
                    </span>
                    <span className="font-mono text-[10px] text-white/22">
                      {opp.confidence}% confidence
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold leading-snug text-foreground/90">
                    {opp.title}
                  </h3>
                  <div className="mt-2.5 flex items-center gap-2">
                    <OppIcon className={cn("h-3.5 w-3.5 shrink-0", opp.colorClass)} />
                    <p className={cn("text-[12px] font-semibold", opp.colorClass)}>
                      {opp.action}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/32">{opp.impact}</p>
                  <button
                    className={cn(
                      "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border py-3 text-[12px] font-bold transition-all",
                      opp.btnClass
                    )}
                  >
                    {opp.action}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          4 · CAMPAIGN HEALTH
      ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] px-6 py-8 pb-16 sm:px-8 lg:px-12 xl:px-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-55" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald-400" />
          </span>
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/25">
            Campaign Health · {rows?.length ?? 0} Active
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : rows && rows.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((r) => {
              const ctr =
                r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
              const roas =
                r.costCurrency > 0 && r.conversionsValue > 0
                  ? r.conversionsValue / r.costCurrency
                  : 0;
              const score = campaignScore(r);
              const h = healthLabel(score);
              return (
                <div
                  key={r.campaignId}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 transition-colors hover:bg-white/[0.032]"
                >
                  {/* Name + status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold leading-snug text-foreground/88">
                      {r.campaignName}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/[0.07] px-2.5 py-1">
                      <div className="h-[5px] w-[5px] rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-400/80">
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Health score bar */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
                        Health Score
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <span className={cn("text-[11px] font-bold", h.text)}>
                          {h.label}
                        </span>
                        <span className={cn("font-mono text-[13px] font-black", h.text)}>
                          {score}
                        </span>
                      </div>
                    </div>
                    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn("h-full rounded-full", h.bar)}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>

                  {/* CTR + Spend */}
                  <div className="mt-4 grid grid-cols-2 divide-x divide-white/[0.05] border-t border-white/[0.05] pt-4">
                    <div className="pr-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/20">
                        CTR
                      </p>
                      <p
                        className={cn(
                          "mt-1.5 font-mono text-[18px] font-bold tabular-nums leading-none",
                          ctr >= 3
                            ? "text-emerald-400"
                            : ctr >= 1.5
                            ? "text-foreground/80"
                            : "text-amber-400"
                        )}
                      >
                        {ctr.toFixed(2)}%
                      </p>
                    </div>
                    <div className="pl-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/20">
                        Spend
                      </p>
                      <p className="mt-1.5 font-mono text-[18px] font-bold tabular-nums leading-none text-foreground/75">
                        {formatCurrency(r.costCurrency, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Conv + ROAS */}
                  <div className="mt-3 flex items-center gap-3">
                    {r.conversions > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-amber-400/70" />
                    )}
                    <span className="text-[10px] text-white/35">
                      {r.conversions > 0
                        ? `${r.conversions.toFixed(0)} conversions`
                        : "No conversions yet"}
                    </span>
                    {roas > 0 && (
                      <span
                        className={cn(
                          "ml-auto font-mono text-[10px] font-semibold",
                          roas > 2 ? "text-emerald-400/80" : "text-white/40"
                        )}
                      >
                        {roas.toFixed(1)}× ROAS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[12px] text-white/25">
            Campaign data will appear after the first sync.
          </p>
        )}
      </section>
    </div>
  );
}

// Keep backward compat — `Lightbulb` imported but only used via SEV_STYLE
void Lightbulb;
void CheckCircle2;
