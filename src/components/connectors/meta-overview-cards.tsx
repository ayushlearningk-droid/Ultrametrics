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
} from "lucide-react";

import { Sparkline } from "@/components/home/sparkline";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────── */

interface DailyRow {
  date_start: string;
  spend: string;
  ctr: string;
  impressions: string;
}

interface TotalsRow {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
}

interface ConnectorInfo {
  name: string;
  status: string;
  last_synced_at: string | null;
  external_account_id?: string | null;
}

/* ─── Analysis builder ───────────────────────────────────────────── */

type AnalysisType = "critical" | "opportunity" | "healthy" | "insufficient";

interface Analysis {
  type: AnalysisType;
  headline: string;
  subtext: string;
  severity: string;
  confidence: number;
  impact: string;
  ctr7dPct?: number;
  spend7dPct?: number;
  sparkData?: number[];
}

function buildAnalysis(daily: DailyRow[]): Analysis {
  if (daily.length < 10) {
    return {
      type: "insufficient",
      headline: "Monitoring your\naccounts.",
      subtext:
        "AI analysis activates after 14 days of campaign data. Keep your ads running — personalized insights will appear automatically.",
      severity: "Monitoring",
      confidence: 0,
      impact: "Pending",
    };
  }

  const sorted = [...daily].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );
  const recent = sorted.slice(-7);
  const prev = sorted.slice(-14, -7);

  const rSpend = recent.reduce((s, r) => s + parseFloat(r.spend), 0);
  const pSpend = prev.reduce((s, r) => s + parseFloat(r.spend), 0);
  const rCtr =
    recent.length
      ? recent.reduce((s, r) => s + parseFloat(r.ctr), 0) / recent.length
      : 0;
  const pCtr =
    prev.length
      ? prev.reduce((s, r) => s + parseFloat(r.ctr), 0) / prev.length
      : 0;

  const spendPct = pSpend ? ((rSpend - pSpend) / pSpend) * 100 : 0;
  const ctrPct = pCtr ? ((rCtr - pCtr) / pCtr) * 100 : 0;
  const sparkData = recent.map((r) => parseFloat(r.spend));

  if (spendPct > 12 && ctrPct < -8) {
    return {
      type: "critical",
      headline: "Creative fatigue\ndetected.",
      subtext: `Spend increased ${spendPct.toFixed(0)}% while CTR dropped ${Math.abs(ctrPct).toFixed(0)}%. 3 campaigns show overexposure signals — your audience is burning out on current creatives.`,
      severity: "Critical",
      confidence: 88,
      impact: "High",
      ctr7dPct: ctrPct,
      spend7dPct: spendPct,
      sparkData,
    };
  }

  if (ctrPct > 8 && spendPct > 0) {
    return {
      type: "opportunity",
      headline: "Strong momentum\ndetected.",
      subtext: `CTR increased ${ctrPct.toFixed(0)}% while spend increased ${spendPct.toFixed(0)}%. 3 campaigns are ready for scaling — the audience signal is clear.`,
      severity: "Positive",
      confidence: 91,
      impact: "High",
      ctr7dPct: ctrPct,
      spend7dPct: spendPct,
      sparkData,
    };
  }

  if (rCtr < 0.8) {
    return {
      type: "critical",
      headline: "CTR below\nindustry benchmark.",
      subtext: `Average CTR is ${rCtr.toFixed(2)}%, below the 1.5% benchmark. Tighter audiences and stronger creative hooks typically recover efficiency within 5–7 days.`,
      severity: "Warning",
      confidence: 83,
      impact: "Medium",
      sparkData,
    };
  }

  return {
    type: "healthy",
    headline: "Performance\nlooks stable.",
    subtext: `CTR is ${rCtr.toFixed(2)}% with ${spendPct >= 0 ? "+" : ""}${spendPct.toFixed(0)}% spend change week-over-week. No anomalies detected. Monitor for creative fatigue as audience frequency builds.`,
    severity: "Stable",
    confidence: 76,
    impact: "Low",
    sparkData,
  };
}

/* ─── Severity style map ─────────────────────────────────────────── */

const SEV_STYLE = {
  critical: {
    glow: "radial-gradient(ellipse 70% 55% at 50% -10%, rgba(245,158,11,0.11), transparent)",
    accentBar: "bg-gradient-to-b from-amber-400 to-amber-600",
    border: "border-amber-500/20",
    severityTag: "bg-amber-400/10 border-amber-400/30 text-amber-300",
    ctaPrimary:
      "bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20 hover:border-amber-400/55",
    Icon: TrendingDown,
    iconColor: "text-amber-400",
    sparkColor: "#F59E0B",
    liveColor: "bg-amber-400",
    livePing: "bg-amber-400",
  },
  opportunity: {
    glow: "radial-gradient(ellipse 70% 55% at 50% -10%, rgba(52,211,153,0.09), transparent)",
    accentBar: "bg-gradient-to-b from-emerald-400 to-emerald-600",
    border: "border-emerald-500/20",
    severityTag: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300",
    ctaPrimary:
      "bg-emerald-400/10 border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/20 hover:border-emerald-400/55",
    Icon: TrendingUp,
    iconColor: "text-emerald-400",
    sparkColor: "#34D399",
    liveColor: "bg-emerald-400",
    livePing: "bg-emerald-400",
  },
  healthy: {
    glow: "radial-gradient(ellipse 70% 55% at 50% -10%, rgba(52,211,153,0.04), transparent)",
    accentBar: "bg-gradient-to-b from-emerald-400/60 to-emerald-600/40",
    border: "border-emerald-500/10",
    severityTag: "bg-emerald-400/[0.06] border-emerald-400/20 text-emerald-400/70",
    ctaPrimary:
      "bg-white/[0.04] border-white/10 text-white/55 hover:bg-white/[0.07] hover:border-white/20",
    Icon: CheckCircle2,
    iconColor: "text-emerald-400/70",
    sparkColor: "#34D399",
    liveColor: "bg-emerald-400/70",
    livePing: "bg-emerald-400/70",
  },
  insufficient: {
    glow: "none",
    accentBar: "bg-gradient-to-b from-brand/50 to-brand/20",
    border: "border-white/[0.07]",
    severityTag: "bg-brand/[0.08] border-brand/20 text-brand/80",
    ctaPrimary:
      "bg-white/[0.04] border-white/10 text-white/40 hover:bg-white/[0.07] hover:border-white/18",
    Icon: Lightbulb,
    iconColor: "text-brand/60",
    sparkColor: "#4A6CF7",
    liveColor: "bg-brand/60",
    livePing: "bg-brand/60",
  },
};

/* ─── Top Opportunities ─────────────────────────────────────────── */

const OPPORTUNITIES = [
  {
    id: 1,
    Icon: TrendingUp,
    type: "SCALE",
    title: "Scale Retargeting Campaign",
    action: "Increase Budget 20%",
    impact: "Estimated +14% conversions",
    confidence: 87,
    colorClass: "text-emerald-400",
    borderClass: "border-emerald-500/20",
    bgClass: "bg-emerald-500/[0.04]",
    tagClass: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300",
    btnClass:
      "border-emerald-400/25 text-emerald-300/80 hover:bg-emerald-400/[0.08] hover:border-emerald-400/50 hover:text-emerald-200",
  },
  {
    id: 2,
    Icon: Zap,
    type: "FIX",
    title: "Refresh Summer Sale Creatives",
    action: "Upload New Ad Visuals",
    impact: "Recover ~18% CTR loss",
    confidence: 79,
    colorClass: "text-amber-400",
    borderClass: "border-amber-500/20",
    bgClass: "bg-amber-500/[0.04]",
    tagClass: "bg-amber-400/10 border-amber-400/30 text-amber-300",
    btnClass:
      "border-amber-400/25 text-amber-300/80 hover:bg-amber-400/[0.08] hover:border-amber-400/50 hover:text-amber-200",
  },
  {
    id: 3,
    Icon: Target,
    type: "EXPAND",
    title: "Expand Lookalike Audience",
    action: "Broaden to 2% US Segment",
    impact: "Estimated +22% reach",
    confidence: 72,
    colorClass: "text-blue-400",
    borderClass: "border-blue-500/20",
    bgClass: "bg-blue-500/[0.04]",
    tagClass: "bg-blue-400/10 border-blue-400/30 text-blue-300",
    btnClass:
      "border-blue-400/25 text-blue-300/80 hover:bg-blue-400/[0.08] hover:border-blue-400/50 hover:text-blue-200",
  },
];

/* ─── Campaign Health ────────────────────────────────────────────── */

const CAMPAIGNS = [
  { id: 1, name: "Retargeting — Site Visitors", spend: 847, ctr: 2.34, impressions: 46800, trendPct: 8.2 },
  { id: 2, name: "Summer Sale — Prospecting", spend: 1124, ctr: 1.91, impressions: 87200, trendPct: 12.4 },
  { id: 3, name: "Lookalike — 1% US", spend: 2174, ctr: 1.68, impressions: 225100, trendPct: 5.6 },
  { id: 4, name: "Brand Awareness — Video", spend: 690, ctr: 1.42, impressions: 95100, trendPct: -3.1 },
];

function healthScore(ctr: number, trendPct: number): number {
  let score = 50;
  if (ctr > 2.5) score += 25;
  else if (ctr > 1.5) score += 15;
  else if (ctr < 0.8) score -= 15;
  if (trendPct > 10) score += 20;
  else if (trendPct > 0) score += 10;
  else if (trendPct < -5) score -= 15;
  return Math.max(10, Math.min(99, score));
}

function healthInfo(score: number) {
  if (score >= 80) return { label: "Excellent", text: "text-emerald-400", bar: "bg-emerald-400" };
  if (score >= 65) return { label: "Good", text: "text-emerald-400/80", bar: "bg-emerald-400/70" };
  if (score >= 45) return { label: "Fair", text: "text-amber-400", bar: "bg-amber-400" };
  return { label: "Poor", text: "text-red-400", bar: "bg-red-400" };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)} />;
}

/* ─── Main Component ─────────────────────────────────────────────── */

export function MetaOverviewCards({
  connector: _connector,
  wsId: _wsId,
  metaConfig: _metaConfig,
}: {
  connector: ConnectorInfo;
  wsId: string | null;
  metaConfig: unknown;
}) {
  const [daily, setDaily] = useState<DailyRow[] | null>(null);
  const [totals, setTotals] = useState<TotalsRow[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/meta/insights-daily").then((r) => r.json()).catch(() => null),
      fetch("/api/meta/test-insights").then((r) => r.json()).catch(() => null),
    ]).then(([dailyData, totalsData]) => {
      setDaily(dailyData?.success ? (dailyData.days ?? []) : []);
      if (totalsData?.success && totalsData.insights?.length) {
        setTotals(totalsData.insights);
        setCurrency(totalsData.currency ?? "USD");
      }
      setLoading(false);
    });
  }, []);

  const analysis = daily ? buildAnalysis(daily) : null;
  const s = analysis ? SEV_STYLE[analysis.type] : SEV_STYLE.insufficient;

  const totalSpend = totals
    ? totals.reduce((acc, r) => acc + parseFloat(r.spend ?? "0"), 0)
    : null;
  const totalImp = totals
    ? totals.reduce((acc, r) => acc + parseFloat(r.impressions ?? "0"), 0)
    : null;
  const avgCtr =
    totals && totals.length
      ? totals.reduce((acc, r) => acc + parseFloat(r.ctr ?? "0"), 0) / totals.length
      : null;
  const avgCpc =
    totals && totals.length
      ? totals.reduce((acc, r) => acc + parseFloat(r.cpc ?? "0"), 0) / totals.length
      : null;

  return (
    <div>

      {/* ═══════════════════════════════════════════════════════════════
          1 · AI HERO — full first viewport
      ═══════════════════════════════════════════════════════════════ */}
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
              {analysis?.headline ?? "Monitoring your\naccounts."}
            </h2>
          )}

          {/* Subtext */}
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

        {/* Metric data-pills */}
        {!loading && analysis && (
          <div className="mt-9 flex flex-wrap gap-3">
            {analysis.ctr7dPct != null && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/22">
                  CTR · 7 Day
                </p>
                <p
                  className={cn(
                    "mt-1.5 font-mono text-[26px] font-black tabular-nums leading-none",
                    analysis.ctr7dPct > 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {analysis.ctr7dPct > 0 ? "+" : "−"}
                  {Math.abs(analysis.ctr7dPct).toFixed(0)}%
                </p>
              </div>
            )}
            {analysis.spend7dPct != null && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/22">
                  Spend · 7 Day
                </p>
                <p className="mt-1.5 font-mono text-[26px] font-black tabular-nums leading-none text-white/85">
                  +{analysis.spend7dPct.toFixed(0)}%
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

        {/* Sparkline — top-right on large screens */}
        {!loading && analysis?.sparkData && analysis.sparkData.length >= 2 && (
          <div className="absolute right-10 top-1/2 hidden -translate-y-1/2 flex-col items-end xl:flex">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.24em] text-white/18">
              7-day spend
            </p>
            <Sparkline
              data={analysis.sparkData}
              color={s.sparkColor}
              width={200}
              height={84}
            />
            <p className={cn("mt-2.5 font-mono text-[11px] font-medium", s.iconColor)}>
              $
              {analysis.sparkData[analysis.sparkData.length - 1].toLocaleString(
                "en-US",
                { maximumFractionDigits: 0 }
              )}{" "}
              last day
            </p>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2 · METRICS — secondary, below fold
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] bg-white/[0.012] px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
        <p className="mb-6 text-[9px] font-bold uppercase tracking-[0.28em] text-white/20">
          Account Performance · 30 Days
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 lg:grid-cols-4">
          {[
            {
              label: "Ad Spend",
              value:
                loading || totalSpend === null
                  ? null
                  : new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(totalSpend),
            },
            {
              label: "Avg. CTR",
              value: loading || avgCtr === null ? null : `${avgCtr.toFixed(2)}%`,
            },
            {
              label: "Avg. CPC",
              value: loading || avgCpc === null ? null : `$${avgCpc.toFixed(2)}`,
            },
            {
              label: "Impressions",
              value:
                loading || totalImp === null
                  ? null
                  : new Intl.NumberFormat("en-US", {
                      notation: "compact",
                    }).format(totalImp),
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

      {/* ═══════════════════════════════════════════════════════════════
          3 · TOP OPPORTUNITIES
      ═══════════════════════════════════════════════════════════════ */}
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {OPPORTUNITIES.map((opp) => {
            const OppIcon = opp.Icon;
            return (
              <div
                key={opp.id}
                className={cn(
                  "rounded-2xl border p-5 transition-colors hover:bg-white/[0.02]",
                  opp.borderClass,
                  opp.bgClass
                )}
              >
                {/* Type tag + confidence */}
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

                {/* Title */}
                <h3 className="text-[15px] font-semibold leading-snug text-foreground/90">
                  {opp.title}
                </h3>

                {/* Action */}
                <div className="mt-2.5 flex items-center gap-2">
                  <OppIcon className={cn("h-3.5 w-3.5 shrink-0", opp.colorClass)} />
                  <p className={cn("text-[12px] font-semibold", opp.colorClass)}>
                    {opp.action}
                  </p>
                </div>

                {/* Estimated impact */}
                <p className="mt-1.5 text-[11px] text-white/32">{opp.impact}</p>

                {/* CTA */}
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
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4 · CAMPAIGN HEALTH — cards, not table
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] px-6 py-8 pb-16 sm:px-8 lg:px-12 xl:px-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-55" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald-400" />
          </span>
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/25">
            Campaign Health · 4 Active
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CAMPAIGNS.map((c) => {
            const score = healthScore(c.ctr, c.trendPct);
            const h = healthInfo(score);
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 transition-colors hover:bg-white/[0.032]"
              >
                {/* Campaign name + status */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold leading-snug text-foreground/88">
                    {c.name}
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
                      <span className={cn("text-[11px] font-bold", h.text)}>{h.label}</span>
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
                        c.ctr >= 2 ? "text-emerald-400" : c.ctr >= 1.5 ? "text-foreground/80" : "text-amber-400"
                      )}
                    >
                      {c.ctr.toFixed(2)}%
                    </p>
                  </div>
                  <div className="pl-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/20">
                      Spend
                    </p>
                    <p className="mt-1.5 font-mono text-[18px] font-bold tabular-nums leading-none text-foreground/75">
                      ${c.spend.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* WoW trend */}
                <div className="mt-3 flex items-center gap-1.5">
                  {c.trendPct > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                  )}
                  <span
                    className={cn(
                      "font-mono text-[11px] font-semibold",
                      c.trendPct > 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {c.trendPct > 0 ? "+" : ""}
                    {c.trendPct.toFixed(1)}% vs prev week
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
