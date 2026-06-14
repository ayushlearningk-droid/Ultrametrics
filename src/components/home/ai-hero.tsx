"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
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
    bar: "bg-danger",
    dot: "bg-danger shadow-[0_0_10px_3px] shadow-danger/50",
    heading: "text-danger",
    tag: "border-danger/30 text-danger bg-danger/[0.07]",
    btn: "border-danger/30 text-danger hover:border-danger/60 hover:bg-danger/[0.07]",
    statColor: "text-danger",
    rowHover: "hover:bg-danger/[0.025]",
  },
  opportunity: {
    label: "OPPORTUNITY",
    bar: "bg-brand",
    dot: "bg-brand shadow-[0_0_10px_3px] shadow-brand/50",
    heading: "text-brand",
    tag: "border-brand/30 text-brand bg-brand/[0.07]",
    btn: "border-brand/30 text-brand hover:border-brand/60 hover:bg-brand/[0.07]",
    statColor: "text-brand",
    rowHover: "hover:bg-brand/[0.025]",
  },
  info: {
    label: "INFO",
    bar: "bg-brand",
    dot: "bg-brand/80",
    heading: "text-brand",
    tag: "border-brand/30 text-brand bg-brand/[0.07]",
    btn: "border-brand/30 text-brand hover:border-brand/60 hover:bg-brand/[0.07]",
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
      <span key="opp" className="text-brand">
        {opportunity} {opportunity === 1 ? "opportunity" : "opportunities"}
      </span>
    );
  }
  if (opportunity > 0 && critical > 0) {
    parts.push(<span key="and" className="text-foreground/70"> and </span>);
  }
  if (critical > 0) {
    parts.push(
      <span key="risk" className="text-danger">
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
      <div className="surface-elevated relative w-full overflow-hidden anim-settle shadow-[0_28px_80px_-12px_hsl(240_40%_1%/0.7)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
        <div className="px-8 py-14 sm:px-10">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="anim-pulse absolute inline-flex h-3 w-3 rounded-full bg-brand/40" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-brand shadow-[0_0_8px_2px] shadow-brand/50" />
            </span>
            <span className="type-eyebrow text-foreground-muted">Ultrametrics</span>
          </div>
          <h2 className="type-display max-w-2xl text-balance">
            Connect your first ad account{" "}
            <span className="text-brand">to activate AI monitoring.</span>
          </h2>
          <p className="mt-4 max-w-lg type-body text-foreground-muted">
            Ultrametrics watches your Meta Ads and Google Ads around the clock —
            detecting opportunities, catching issues, and telling you exactly what to do.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/connectors/meta"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 type-body font-medium text-brand-foreground shadow-[0_0_16px_0] shadow-brand/30 transition-all hover:bg-brand/90"
            >
              Connect Meta Ads <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/connectors/google-ads"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 type-body font-medium text-foreground/80 transition-all hover:border-white/[0.22] hover:bg-white/[0.06]"
            >
              Connect Google Ads <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-elevated relative w-full overflow-hidden anim-settle shadow-[0_28px_80px_-12px_hsl(240_40%_1%/0.7)]">
      {/* Internal ambient glow — cinematic depth inside the elevated surface */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 12% -10%, hsl(var(--brand) / 0.07) 0%, transparent 55%), radial-gradient(90% 70% at 100% 0%, hsl(256 90% 68% / 0.05) 0%, transparent 50%)",
        }}
      />
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      {/* ── Status bar ───────────────────────────────────────────── */}
      <div className="relative z-[1] flex items-center justify-between gap-4 border-b border-white/[0.06] px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 items-center justify-center">
            {activeCount > 0 ? (
              <>
                <span className="anim-pulse absolute inline-flex h-3 w-3 rounded-full bg-brand/40" />
                <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-brand shadow-[0_0_8px_2px] shadow-brand/50" />
              </>
            ) : (
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-warn" />
            )}
          </span>
          <span className="type-eyebrow text-foreground-muted">
            {activeCount > 0 ? "Ultrametrics is monitoring" : "Monitoring paused"}
          </span>
          <span className="hidden text-foreground-muted/40 sm:block">·</span>
          <span className="hidden type-caption text-foreground-muted sm:block">
            {activeCount} source{activeCount !== 1 ? "s" : ""}
            {lastSync && <> · {lastSync}</>}
          </span>
        </div>

        {activeCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 type-caption font-medium text-foreground-muted transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-foreground disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync all"}
          </button>
        )}
      </div>

      {/* ── Headline ─────────────────────────────────────────────── */}
      <div className="relative z-[1] px-8 pb-7 pt-7">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-40 anim-flow rounded bg-white/[0.05]" />
            <div className="h-8 w-[520px] max-w-full anim-flow rounded-lg bg-white/[0.07]" />
            <div className="h-3 w-52 anim-flow rounded bg-white/[0.04]" />
          </div>
        ) : (
          <>
            <p className="mb-2.5 type-eyebrow text-foreground-muted">
              Ultrametrics detected {headlineParts}
            </p>
            {findings && findings.length > 0 ? (
              <h2 className="type-display max-w-3xl text-balance">
                {findings[0].title}.
              </h2>
            ) : (
              <h2 className="type-display max-w-3xl text-balance text-foreground/80">
                No issues detected.
              </h2>
            )}
          </>
        )}
      </div>

      {/* ── All healthy ──────────────────────────────────────────── */}
      {!loading && findings && findings.length === 0 && (
        <div className="relative z-[1] border-t border-white/[0.06] px-8 py-7">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-brand/70" />
            <div>
              <p className="type-body font-medium text-foreground/85">
                No issues detected across {activeCount} source{activeCount !== 1 ? "s" : ""}
              </p>
              <p className="mt-0.5 type-caption text-foreground-muted">
                All campaigns are within normal parameters. Ultrametrics will alert you when it detects anything.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Findings → Recommended actions ───────────────────────── */}
      {!loading && findings && findings.length > 0 && (
        <div className="relative z-[1] border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-8 pb-1 pt-5">
            <span className="type-eyebrow text-foreground-muted/80">
              Recommended actions
            </span>
            <span className="font-mono type-caption tabular-nums text-foreground-muted/45">
              {findings.length}
            </span>
          </div>
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
                    <span className={cn("type-eyebrow", s.heading)}>
                      {s.label}
                    </span>
                    {f.metric && (
                      <span className={cn("rounded-full border px-2.5 py-0.5 font-mono type-caption", s.tag)}>
                        {f.metric}
                      </span>
                    )}
                    <Icon className={cn("h-3.5 w-3.5 opacity-60", s.heading)} />
                  </div>
                  <p className="type-body font-semibold text-foreground/90">
                    {f.title}
                  </p>
                  <p className="mt-1.5 max-w-2xl type-body leading-relaxed text-foreground-muted">
                    {f.body}
                  </p>
                </div>

                {/* Action */}
                <div className="shrink-0 pt-1">
                  <Link
                    href={f.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 type-caption font-medium transition-all",
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
