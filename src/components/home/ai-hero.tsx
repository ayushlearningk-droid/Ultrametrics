"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── types ──────────────────────────────────────────────────────── */

export interface HeroConnector {
  provider: string;
  status: string;
  name: string;
}

interface Finding {
  id: string;
  severity: "critical" | "opportunity" | "info";
  icon: React.ElementType;
  title: string;
  body: string;
  metric?: string;
  href: string;
  cta: string;
}

interface DailyRow {
  date_start: string;
  spend: string;
  ctr: string;
}

/* ─── severity config ───────────────────────────────────────────── */

const SEV = {
  critical: {
    label: "RISK",
    bar: "bg-red-400",
    dot: "bg-red-400 shadow-[0_0_10px_3px] shadow-red-400/50",
    heading: "text-red-300",
    tag: "border-red-400/30 text-red-300/90 bg-red-400/[0.07]",
    btn: "border-red-400/30 text-red-300/80 hover:border-red-400/60 hover:bg-red-400/[0.07] hover:text-red-200",
    statColor: "text-red-400",
    rowHover: "hover:bg-red-400/[0.025]",
  },
  opportunity: {
    label: "OPPORTUNITY",
    bar: "bg-emerald-400",
    dot: "bg-emerald-400 shadow-[0_0_10px_3px] shadow-emerald-400/50",
    heading: "text-emerald-300",
    tag: "border-emerald-400/30 text-emerald-300/90 bg-emerald-400/[0.07]",
    btn: "border-emerald-400/30 text-emerald-300/80 hover:border-emerald-400/60 hover:bg-emerald-400/[0.07] hover:text-emerald-200",
    statColor: "text-emerald-400",
    rowHover: "hover:bg-emerald-400/[0.025]",
  },
  info: {
    label: "INFO",
    bar: "bg-brand",
    dot: "bg-brand/80",
    heading: "text-brand",
    tag: "border-brand/30 text-brand/90 bg-brand/[0.07]",
    btn: "border-brand/30 text-brand/70 hover:border-brand/60 hover:bg-brand/[0.07] hover:text-brand",
    statColor: "text-brand",
    rowHover: "hover:bg-brand/[0.025]",
  },
};

/* ─── build findings from raw data ──────────────────────────────── */

function buildFindings(
  daily: DailyRow[],
  connectors: HeroConnector[],
  failedJobs: number
): Finding[] {
  const findings: Finding[] = [];

  const errored = connectors.filter((c) => c.status === "error");
  if (errored.length > 0) {
    findings.push({
      id: "conn-err",
      severity: "critical",
      icon: AlertTriangle,
      title: `${errored[0].name} sync is failing`,
      body: "Your last sync encountered an error. Data may be stale. Reconnect the source to restore the pipeline.",
      href: `/dashboard/connectors/${errored[0].provider.replace(/_/g, "-")}`,
      cta: "Reconnect now",
    });
  }

  if (daily.length >= 10) {
    const sorted = [...daily].sort(
      (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
    );
    const recent = sorted.slice(-7);
    const prev = sorted.slice(-14, -7);

    if (recent.length >= 5 && prev.length >= 5) {
      const rSpend = recent.reduce((s, r) => s + parseFloat(r.spend), 0);
      const pSpend = prev.reduce((s, r) => s + parseFloat(r.spend), 0);
      const rCtr = recent.reduce((s, r) => s + parseFloat(r.ctr), 0) / recent.length;
      const pCtr = prev.reduce((s, r) => s + parseFloat(r.ctr), 0) / prev.length;
      const spendPct = pSpend ? ((rSpend - pSpend) / pSpend) * 100 : 0;
      const ctrPct = pCtr ? ((rCtr - pCtr) / pCtr) * 100 : 0;

      if (spendPct > 12 && ctrPct < -8) {
        findings.push({
          id: "fatigue",
          severity: "critical",
          icon: TrendingDown,
          title: "Creative fatigue on Meta Ads",
          body: `Spend rose ${spendPct.toFixed(0)}% week-over-week while CTR dropped ${Math.abs(ctrPct).toFixed(0)}%. This pattern signals audience overexposure — your current creatives are burning out.`,
          metric: `CTR −${Math.abs(ctrPct).toFixed(0)}%`,
          href: "/dashboard/connectors/meta",
          cta: "Review Meta Ads",
        });
      } else if (ctrPct > 8) {
        findings.push({
          id: "momentum",
          severity: "opportunity",
          icon: TrendingUp,
          title: "Meta Ads gaining momentum",
          body: `CTR improved ${ctrPct.toFixed(0)}% week-over-week. Your current creatives are resonating. Increasing budget on top-performing ad sets now would compound returns.`,
          metric: `CTR +${ctrPct.toFixed(0)}%`,
          href: "/dashboard/connectors/meta",
          cta: "Scale budget",
        });
      }

      if (rCtr < 0.8 && findings.filter((f) => f.id !== "conn-err").length < 1) {
        findings.push({
          id: "low-ctr",
          severity: "opportunity",
          icon: Zap,
          title: "CTR below industry benchmark",
          body: `Average CTR is ${rCtr.toFixed(2)}% against a 1.5% industry benchmark. A creative refresh and audience narrowing could significantly reduce cost-per-click.`,
          metric: `${rCtr.toFixed(2)}% CTR`,
          href: "/dashboard/connectors/meta",
          cta: "View Meta insights",
        });
      }
    }
  }

  if (failedJobs > 0 && errored.length === 0 && findings.length < 2) {
    findings.push({
      id: "sync-fail",
      severity: "critical",
      icon: AlertTriangle,
      title: `${failedJobs} sync job${failedJobs > 1 ? "s" : ""} failed`,
      body: "Your destination data may be out of date. Check the pipeline activity log for details.",
      href: "/dashboard/sync-jobs",
      cta: "View activity",
    });
  }

  return findings.slice(0, 4);
}

/* ─── headline builder ───────────────────────────────────────────── */

function buildHeadlineParts(
  findings: Finding[] | null,
  loading: boolean,
  hasNoSources: boolean
): React.ReactNode {
  if (hasNoSources || loading || !findings) return null;

  const critical = findings.filter((f) => f.severity === "critical").length;
  const opportunity = findings.filter((f) => f.severity === "opportunity").length;

  if (findings.length === 0) {
    return (
      <span className="text-foreground/80">No issues detected.</span>
    );
  }

  const parts: React.ReactNode[] = [];

  if (opportunity > 0) {
    parts.push(
      <span key="opp" className="text-emerald-400">
        {opportunity} {opportunity === 1 ? "opportunity" : "opportunities"}
      </span>
    );
  }
  if (opportunity > 0 && critical > 0) {
    parts.push(<span key="and" className="text-foreground/70"> and </span>);
  }
  if (critical > 0) {
    parts.push(
      <span key="risk" className="text-red-400">
        {critical} {critical === 1 ? "risk" : "risks"}
      </span>
    );
  }

  return <>{parts}</>;
}

/* ─── component ─────────────────────────────────────────────────── */

export function AIHero({
  connectors,
  activeCount,
  lastSync,
}: {
  connectors: HeroConnector[];
  activeCount: number;
  lastSync: string | null;
}) {
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    Promise.all([
      fetch("/api/meta/insights-daily").then((r) => r.json()).catch(() => null),
      fetch("/api/notifications").then((r) => r.json()).catch(() => ({ notifications: [] })),
    ]).then(([daily, notifData]) => {
      if (!mounted.current) return;
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];
      const notifications = notifData?.notifications ?? [];
      const failedCount = notifications.filter(
        (n: { status: string }) => n.status === "failed"
      ).length;
      setFindings(buildFindings(dailyRows, connectors, failedCount));
      setLoading(false);
    });
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await Promise.allSettled([
        fetch("/api/sync/meta-to-google-sheets", { method: "POST" }),
        fetch("/api/sync/google-ads-to-google-sheets", { method: "POST" }),
      ]);
      toast.success("Sync triggered for all active sources.");
    } catch {
      toast.error("Could not trigger sync.");
    } finally {
      setSyncing(false);
    }
  }

  const hasNoSources = connectors.length === 0;
  const headlineParts = buildHeadlineParts(findings, loading, hasNoSources);
  const criticalCount = findings?.filter((f) => f.severity === "critical").length ?? 0;
  const opportunityCount = findings?.filter((f) => f.severity === "opportunity").length ?? 0;

  /* ── No sources ── */
  if (hasNoSources) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent"
           style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(74,108,247,0.08)" }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
        <div className="px-8 py-14">
          <div className="mb-6 flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-brand/60" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/30">
              Ultrametrics
            </span>
          </div>
          <h2 className="text-[38px] font-bold leading-[1.1] tracking-tight text-foreground/80">
            Connect your first ad account<br />
            <span className="text-brand/70">to activate AI monitoring.</span>
          </h2>
          <p className="mt-4 text-[14px] text-white/35 max-w-lg">
            Ultrametrics watches your Meta Ads and Google Ads 24/7 — detecting opportunities, catching issues, and telling you exactly what to do.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/connectors/meta"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/70 transition-all hover:border-white/[0.22] hover:bg-white/[0.07] hover:text-white/95"
            >
              Connect Meta Ads <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/connectors/google-ads"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/70 transition-all hover:border-white/[0.22] hover:bg-white/[0.07] hover:text-white/95"
            >
              Connect Google Ads <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/[0.09]"
      style={{
        background: "linear-gradient(160deg, hsl(228 16% 5%) 0%, hsl(228 14% 4%) 100%)",
        boxShadow: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgba(74,108,247,0.06), 0 24px 48px -12px rgba(0,0,0,0.6)",
      }}
    >
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      {/* ── Status bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-8 py-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "block h-[7px] w-[7px] rounded-full",
              activeCount > 0
                ? "animate-pulse bg-brand shadow-[0_0_8px_2px] shadow-brand/40"
                : "bg-amber-400"
            )}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            {activeCount > 0 ? "Ultrametrics is monitoring" : "Monitoring paused"}
          </span>
          <span className="hidden text-white/15 sm:block">·</span>
          <span className="hidden text-[12px] text-white/25 sm:block">
            {activeCount} source{activeCount !== 1 ? "s" : ""}
            {lastSync && <> · {lastSync}</>}
          </span>
        </div>

        {activeCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[11px] font-medium text-white/35 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white/65 disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync all"}
          </button>
        )}
      </div>

      {/* ── Headline ─────────────────────────────────────────────── */}
      <div className="px-8 py-10">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-12 w-[520px] max-w-full animate-pulse rounded-lg bg-white/[0.07]" />
            <div className="h-4 w-52 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ) : (
          <>
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.22em] text-white/30">
              Ultrametrics detected
            </p>
            <h2 className="text-[44px] font-bold leading-[1.08] tracking-tight sm:text-[48px]">
              {headlineParts}
            </h2>
            {findings && findings.length > 0 && (
              <p className="mt-3 text-[13px] text-white/30">
                across {activeCount} active source{activeCount !== 1 ? "s" : ""}
                {" · "}
                <span className="text-white/20">review below</span>
              </p>
            )}
          </>
        )}
      </div>

      {/* ── All healthy ──────────────────────────────────────────── */}
      {!loading && findings && findings.length === 0 && (
        <div className="border-t border-white/[0.06] px-8 py-7">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400/70" />
            <div>
              <p className="text-[14px] font-medium text-foreground/75">
                No issues detected across {activeCount} source{activeCount !== 1 ? "s" : ""}
              </p>
              <p className="mt-0.5 text-[12px] text-white/30">
                All campaigns are within normal parameters. Ultrametrics will alert you when it detects anything.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Findings ─────────────────────────────────────────────── */}
      {!loading && findings && findings.length > 0 && (
        <div className="border-t border-white/[0.07]">
          {findings.map((f, i) => {
            const s = SEV[f.severity];
            const Icon = f.icon;
            return (
              <div
                key={f.id}
                className={cn(
                  "relative flex items-start gap-6 px-8 py-6 transition-colors",
                  s.rowHover,
                  i < findings.length - 1 && "border-b border-white/[0.05]"
                )}
              >
                {/* Severity accent bar */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-r", s.bar)} />

                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  <div className={cn("h-[9px] w-[9px] rounded-full", s.dot)} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={cn("text-[10px] font-bold uppercase tracking-[0.22em]", s.heading)}>
                      {s.label}
                    </span>
                    {f.metric && (
                      <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[10px]", s.tag)}>
                        {f.metric}
                      </span>
                    )}
                    <Icon className={cn("h-3.5 w-3.5 opacity-60", s.heading)} />
                  </div>
                  <p className="text-[16px] font-semibold leading-snug text-foreground/90">
                    {f.title}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/42 max-w-2xl">
                    {f.body}
                  </p>
                </div>

                {/* Action */}
                <div className="shrink-0 pt-1">
                  <Link
                    href={f.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-medium transition-all",
                      s.btn
                    )}
                  >
                    {f.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
    </div>
  );
}
