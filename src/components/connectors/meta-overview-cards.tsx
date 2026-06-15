"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  TrendingUp,
  Zap,
  Target,
  ArrowDownRight,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";

import { Sparkline } from "@/components/home/sparkline";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/format/currency";

/* ─── Types ──────────────────────────────────────────────────────── */

interface DailyRow {
  date_start: string;
  spend: string;
  ctr: string;
  clicks: string;
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

/* ─── AI analysis (real data only) ───────────────────────────────── */

type AnalysisType = "critical" | "opportunity" | "healthy" | "insufficient";

interface EvidenceChip {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}

interface Analysis {
  type: AnalysisType;
  headline: string;
  subtext: string;
  evidence: EvidenceChip[];
  sparkData?: number[];
  /** which recommended actions to surface, by id */
  actions: string[];
}

function pct(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(0)}%`;
}

function buildAnalysis(daily: DailyRow[]): Analysis {
  if (daily.length < 10) {
    return {
      type: "insufficient",
      headline: "Building your performance baseline",
      subtext:
        "AI analysis activates after 14 days of campaign data. Your ads are being monitored — insights will surface automatically as history accumulates.",
      evidence: [],
      actions: [],
    };
  }

  const sorted = [...daily].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );
  const recent = sorted.slice(-7);
  const prev = sorted.slice(-14, -7);

  const rSpend = recent.reduce((s, r) => s + parseFloat(r.spend), 0);
  const pSpend = prev.reduce((s, r) => s + parseFloat(r.spend), 0);
  const rCtr = recent.length
    ? recent.reduce((s, r) => s + parseFloat(r.ctr), 0) / recent.length
    : 0;
  const pCtr = prev.length
    ? prev.reduce((s, r) => s + parseFloat(r.ctr), 0) / prev.length
    : 0;

  const spendPct = pSpend ? ((rSpend - pSpend) / pSpend) * 100 : 0;
  const ctrPct = pCtr ? ((rCtr - pCtr) / pCtr) * 100 : 0;
  const sparkData = recent.map((r) => parseFloat(r.spend));

  if (spendPct > 12 && ctrPct < -8) {
    return {
      type: "critical",
      headline: "Creative fatigue on Meta Ads",
      subtext:
        "Spend is climbing while click-through is falling — a classic overexposure signal. Refreshing creatives now recovers efficiency before cost-per-result rises further.",
      evidence: [
        { label: "CTR", value: pct(ctrPct), tone: "down" },
        { label: "Spend", value: pct(spendPct), tone: "up" },
      ],
      sparkData,
      actions: ["refresh", "reduce"],
    };
  }

  if (ctrPct > 8 && spendPct > 0) {
    return {
      type: "opportunity",
      headline: "Meta Ads gaining momentum",
      subtext:
        "Click-through is rising alongside spend — your current creatives are resonating. Scaling budget on top performers now compounds the return while the signal holds.",
      evidence: [
        { label: "CTR", value: pct(ctrPct), tone: "up" },
        { label: "Spend", value: pct(spendPct), tone: "up" },
      ],
      sparkData,
      actions: ["increase", "expand"],
    };
  }

  if (rCtr < 0.8) {
    return {
      type: "critical",
      headline: "CTR below industry benchmark",
      subtext:
        "Average click-through is trailing the 1.5% benchmark. Tighter audiences and stronger creative hooks typically recover efficiency within 5–7 days.",
      evidence: [
        { label: "Avg CTR", value: `${rCtr.toFixed(2)}%`, tone: "down" },
        { label: "Benchmark", value: "1.5%", tone: "neutral" },
      ],
      sparkData,
      actions: ["refresh", "expand"],
    };
  }

  return {
    type: "healthy",
    headline: "Performance is stable",
    subtext:
      "No anomalies detected across active campaigns. Ultrametrics keeps watching for creative fatigue as audience frequency builds.",
    evidence: [
      { label: "Avg CTR", value: `${rCtr.toFixed(2)}%`, tone: "neutral" },
      { label: "Spend", value: pct(spendPct), tone: spendPct >= 0 ? "up" : "down" },
    ],
    sparkData,
    actions: ["increase"],
  };
}

/* ─── severity → accent token ────────────────────────────────────── */

const SEV = {
  critical: { tone: "warn", label: "Needs attention", spark: "#F59E0B" },
  opportunity: { tone: "brand", label: "Opportunity", spark: "#34D399" },
  healthy: { tone: "brand", label: "Stable", spark: "#34D399" },
  insufficient: { tone: "muted", label: "Monitoring", spark: "#34D399" },
} as const;

/* ─── recommended actions catalogue (presentation only) ──────────── */

const ACTIONS: Record<
  string,
  { Icon: React.ElementType; title: string; outcome: string; reasoning: string }
> = {
  increase: {
    Icon: TrendingUp,
    title: "Increase budget",
    outcome: "Compound a working signal",
    reasoning:
      "Top ad sets are converting efficiently. Adding budget while CTR is rising captures more of the same audience before performance plateaus.",
  },
  refresh: {
    Icon: Zap,
    title: "Refresh creatives",
    outcome: "Recover declining CTR",
    reasoning:
      "Falling click-through with steady spend points to ad fatigue. New visuals and hooks reset frequency and typically restore efficiency within a week.",
  },
  expand: {
    Icon: Target,
    title: "Expand audience",
    outcome: "Extend reach at current efficiency",
    reasoning:
      "Strong engagement suggests the creative travels. Broadening the lookalike segment grows reach without diluting the audiences already responding.",
  },
  reduce: {
    Icon: ArrowDownRight,
    title: "Reduce spend",
    outcome: "Protect cost-per-result",
    reasoning:
      "When spend rises faster than results, trimming the weakest ad sets preserves overall efficiency while creatives are reworked.",
  },
};

/* ─── small primitives ───────────────────────────────────────────── */

function ChipTone(tone: "up" | "down" | "neutral") {
  if (tone === "up") return "border-brand/30 text-brand bg-brand/[0.07]";
  if (tone === "down") return "border-warn/30 text-warn bg-warn/[0.07]";
  return "border-white/[0.12] text-foreground-muted bg-white/[0.03]";
}

function MetricSkeleton() {
  return <div className="anim-flow mt-2 h-7 w-24 rounded-md bg-white/[0.06]" />;
}

function relativeTime(d: string | null) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Main ───────────────────────────────────────────────────────── */

export function MetaOverviewCards({
  connector,
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
  const sev = analysis ? SEV[analysis.type] : SEV.insufficient;

  /* ── derive metric values + 7d deltas from REAL data ───────────── */
  const totalSpend = totals
    ? totals.reduce((acc, r) => acc + parseFloat(r.spend ?? "0"), 0)
    : null;
  const totalImp = totals
    ? totals.reduce((acc, r) => acc + parseFloat(r.impressions ?? "0"), 0)
    : null;
  const totalClicks = totals
    ? totals.reduce((acc, r) => acc + parseFloat(r.clicks ?? "0"), 0)
    : null;
  const avgCtr =
    totals && totals.length
      ? totals.reduce((acc, r) => acc + parseFloat(r.ctr ?? "0"), 0) / totals.length
      : null;
  const avgCpc =
    totals && totals.length
      ? totals.reduce((acc, r) => acc + parseFloat(r.cpc ?? "0"), 0) / totals.length
      : null;

  // 7d-over-7d deltas + per-metric sparklines from daily rows
  const sorted = daily
    ? [...daily].sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      )
    : [];
  const recent = sorted.slice(-7);
  const prev = sorted.slice(-14, -7);
  const spendSpark = recent.map((r) => parseFloat(r.spend));
  const ctrSpark = recent.map((r) => parseFloat(r.ctr));
  const clicksSpark = recent.map((r) => parseFloat(r.clicks ?? "0"));
  const impSpark = recent.map((r) => parseFloat(r.impressions ?? "0"));
  // CPC proxy trend: cost per 1k impressions per day (real, from spend/impressions)
  const cpmSpark = recent.map((r) => {
    const imp = parseFloat(r.impressions ?? "0");
    return imp > 0 ? (parseFloat(r.spend) / imp) * 1000 : 0;
  });

  function delta(sel: (r: DailyRow) => number): number | null {
    if (recent.length < 3 || prev.length < 3) return null;
    const r = recent.reduce((s, x) => s + sel(x), 0);
    const p = prev.reduce((s, x) => s + sel(x), 0);
    return p ? ((r - p) / p) * 100 : null;
  }
  const spendDelta = delta((r) => parseFloat(r.spend));
  const ctrDelta = delta((r) => parseFloat(r.ctr));
  const clicksDelta = delta((r) => parseFloat(r.clicks ?? "0"));
  const impDelta = delta((r) => parseFloat(r.impressions ?? "0"));
  const cpcDelta = delta((r) => {
    const imp = parseFloat(r.impressions ?? "0");
    return imp > 0 ? parseFloat(r.spend) / imp : 0;
  });

  const metrics: {
    label: string;
    value: string | null;
    delta: number | null;
    spark: number[];
    deltaGood: "up" | "down";
  }[] = [
    {
      label: "Spend",
      value: totalSpend === null ? null : formatCurrency(totalSpend, currency),
      delta: spendDelta,
      spark: spendSpark,
      deltaGood: "up",
    },
    {
      label: "CTR",
      value: avgCtr === null ? null : `${avgCtr.toFixed(2)}%`,
      delta: ctrDelta,
      spark: ctrSpark,
      deltaGood: "up",
    },
    {
      label: "CPC",
      value: avgCpc === null ? null : formatCurrency(avgCpc, currency, { decimals: 2 }),
      delta: cpcDelta,
      spark: cpmSpark,
      deltaGood: "down",
    },
    {
      label: "Clicks",
      value: totalClicks === null ? null : formatNumber(totalClicks, currency, { compact: true }),
      delta: clicksDelta,
      spark: clicksSpark,
      deltaGood: "up",
    },
    {
      label: "Impressions",
      value: totalImp === null ? null : formatNumber(totalImp, currency, { compact: true }),
      delta: impDelta,
      spark: impSpark,
      deltaGood: "up",
    },
  ];

  const surfacedActions = (analysis?.actions ?? []).map((id) => ACTIONS[id]).filter(Boolean);

  const tokenHealthy = connector.status === "active";

  return (
    <div className="space-y-6 anim-settle">

      {/* ═══ SECTION 2 · Performance Command Center (L2) ═══════════ */}
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <p className="type-eyebrow text-foreground-muted/80">Performance · last 30 days</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => {
            const good =
              m.delta != null &&
              ((m.deltaGood === "up" && m.delta >= 0) ||
                (m.deltaGood === "down" && m.delta <= 0));
            return (
              <div key={m.label} className="panel panel-hover overflow-hidden p-5">
                <div className="flex items-start justify-between">
                  <p className="type-eyebrow text-foreground-muted/80">{m.label}</p>
                  {m.delta != null && (
                    <span
                      className={cn(
                        "font-mono type-caption tabular-nums",
                        good ? "text-brand" : "text-warn"
                      )}
                    >
                      {pct(m.delta)}
                    </span>
                  )}
                </div>
                {m.value === null ? (
                  <MetricSkeleton />
                ) : (
                  <p className="mt-2 font-mono type-display tabular-nums">{m.value}</p>
                )}
                {m.spark.length >= 2 && (
                  <div className="mt-3 -mb-1">
                    <Sparkline data={m.spark} color={sev.spark} width={220} height={28} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ SECTION 3 · AI Intelligence Surface (L3) ══════════════ */}
      <div className="surface-elevated relative overflow-hidden p-7 sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span
              className={cn(
                "anim-pulse absolute inline-flex h-3 w-3 rounded-full",
                sev.tone === "warn" ? "bg-warn/40" : "bg-brand/40"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-[7px] w-[7px] rounded-full shadow-[0_0_8px_2px]",
                sev.tone === "warn"
                  ? "bg-warn shadow-warn/50"
                  : "bg-brand shadow-brand/50"
              )}
            />
          </span>
          <span className="type-eyebrow text-foreground-muted">AI detected</span>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 type-caption",
              sev.tone === "warn"
                ? "border-warn/30 bg-warn/[0.07] text-warn"
                : "border-brand/30 bg-brand/[0.07] text-brand"
            )}
          >
            {sev.label}
          </span>
          {analysis?.type === "insufficient" && (
            <span className="rounded-full border border-white/[0.12] bg-white/[0.03] px-2.5 py-0.5 type-caption text-foreground-muted">
              Preview
            </span>
          )}
        </div>

        <div className="mt-5 flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="space-y-3">
                <div className="anim-flow h-8 w-2/3 rounded-lg bg-white/[0.07]" />
                <div className="anim-flow h-4 w-full max-w-xl rounded bg-white/[0.05]" />
                <div className="anim-flow h-4 w-4/5 max-w-lg rounded bg-white/[0.04]" />
              </div>
            ) : (
              <>
                <h2 className="type-display max-w-2xl text-balance">
                  {analysis?.headline}
                </h2>
                <p className="mt-3 max-w-2xl type-body leading-relaxed text-foreground-muted">
                  {analysis?.subtext}
                </p>

                {/* Evidence chips — real deltas only */}
                {analysis && analysis.evidence.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {analysis.evidence.map((c) => (
                      <span
                        key={c.label}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 type-caption font-mono tabular-nums",
                          ChipTone(c.tone)
                        )}
                      >
                        <span className="opacity-70">{c.label}</span>
                        <span className="font-semibold">{c.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* spend spark, anchored right */}
          {!loading && analysis?.sparkData && analysis.sparkData.length >= 2 && (
            <div className="hidden shrink-0 flex-col items-end lg:flex">
              <p className="mb-2 type-caption text-foreground-muted/60">7-day spend</p>
              <Sparkline data={analysis.sparkData} color={sev.spark} width={180} height={56} />
            </div>
          )}
        </div>

        {/* Recommended actions — inside the AI surface */}
        {!loading && surfacedActions.length > 0 && (
          <div className="mt-7 border-t border-white/[0.06] pt-6">
            <div className="mb-3 flex items-center gap-2.5">
              <Sparkles className="h-3.5 w-3.5 text-foreground-muted/70" />
              <p className="type-eyebrow text-foreground-muted/80">Recommended actions</p>
              <span className="font-mono type-caption tabular-nums text-foreground-muted/45">
                {surfacedActions.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {surfacedActions.map((a) => {
                const Icon = a.Icon;
                return (
                  <div key={a.title} className="panel panel-hover p-5">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/[0.1] text-brand">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="type-body font-semibold text-foreground/90">
                            {a.title}
                          </p>
                          <span className="shrink-0 type-caption text-brand">{a.outcome}</span>
                        </div>
                        <p className="mt-1.5 type-body leading-relaxed text-foreground-muted">
                          {a.reasoning}
                        </p>
                        <button className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/[0.06] px-3.5 py-2 type-caption font-medium text-brand transition-all hover:border-brand/55 hover:bg-brand/[0.12]">
                          {a.title}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SECTION 5 · Sync Infrastructure ═══════════════════════ */}
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <FileSpreadsheet className="h-3.5 w-3.5 text-foreground-muted/70" />
          <p className="type-eyebrow text-foreground-muted/80">Sync infrastructure</p>
        </div>
        <div className="panel grid grid-cols-2 gap-px overflow-hidden bg-white/[0.04] lg:grid-cols-4">
          {[
            {
              label: "Google Sheets",
              value: tokenHealthy ? "Connected" : "Paused",
              dot: tokenHealthy,
            },
            {
              label: "Scheduler",
              value: tokenHealthy ? "Automated · Active" : "Paused",
              dot: tokenHealthy,
            },
            {
              label: "Last successful sync",
              value: connector.last_synced_at
                ? relativeTime(connector.last_synced_at)
                : "Not yet synced",
            },
            {
              label: "Token health",
              value: tokenHealthy ? "Healthy" : "Action needed",
              dot: tokenHealthy,
            },
          ].map((cell) => (
            <div key={cell.label} className="bg-surface-1/80 px-5 py-4">
              <p className="type-caption text-foreground-muted/60">{cell.label}</p>
              <div className="mt-1.5 flex items-center gap-2">
                {"dot" in cell && (
                  <span
                    className={cn(
                      "h-[6px] w-[6px] rounded-full",
                      cell.dot ? "bg-brand shadow-[0_0_6px_1px] shadow-brand/40" : "bg-warn"
                    )}
                  />
                )}
                <p className="truncate type-body text-foreground/85">{cell.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
