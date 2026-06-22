/**
 * Ask Ultrametrics — Morning Brief composition layer (Sprint 4 Phase B).
 *
 * Composes a deterministic, grounded daily brief by REUSING the existing tool
 * handlers (get_executive_summary / get_recommendations / get_root_cause) — so
 * every engine (recommendations, root-cause, exec-summary, trend, impact) is
 * reused, never re-implemented. The insight sections are emitted as relay-format
 * markdown that the existing <AiResponse> parser renders into the existing cards
 * (Opportunity / Root Cause / Trend) — no duplicate card components.
 *
 * Read-only and grounded: numbers come from the tool results verbatim; nothing
 * is invented. Per-provider (never blends currencies).
 */

import "server-only";
import { metricsToolHandlers } from "@/lib/ai/tools/metrics-tools";
import { getConnectorsByWorkspace } from "@/lib/data/dashboard";
import { CAPABILITIES } from "@/lib/metrics/capabilities";
import type { WorkspaceContext } from "@/lib/ai/types";
import type { MetricsProvider } from "@/lib/metrics/types";

export interface BriefKpi {
  label: string;
  value: string;
  /** e.g. "+18%" (from the trend engine), optional. */
  changeLabel?: string;
  /** "improving" | "declining" | "stable", optional. */
  status?: string;
}

export interface BriefData {
  greeting: string;
  dateLabel: string;
  status: "ok" | "no_data";
  provider?: string;
  currency?: string;
  /** One-line grounded summary (deterministic; no model call). */
  summary: string;
  kpis: BriefKpi[];
  /** Relay-format markdown rendered by <AiResponse> into existing cards. */
  cardsMarkdown: string;
}

/* ── Loose shapes of the tool-result JSON we read ─────────────────────────── */

interface RecJson {
  kind: string;
  action: string;
  impact: string;
  cta: string;
  opportunity_score?: number;
  opportunity_score_breakdown?: {
    contributions?: { label: string; contribution: number }[];
  };
  why?: { summary?: string };
  evidence_strength?: { level?: string };
  estimated_impact?: {
    status?: string;
    ranges?: { metric: string; direction: string; lowPct: number; highPct: number }[];
    assumptions?: string[];
  };
}
interface CauseJson {
  primaryCause: string;
  severity?: string;
  confidence?: string;
  evidence?: string;
  fixOrder?: string[];
  contributors?: string[];
}
interface TrendMetricJson {
  metric: string;
  changeLabel: string;
  status: string;
}
interface SummaryJson {
  provider: string;
  status: string;
  currency?: string;
  headline?: {
    spend: number;
    revenue: number;
    roas: number;
    ctr: number;
  } | null;
  trends?: { metrics?: TrendMetricJson[] };
  watch_outs?: string[];
}

/* ── Formatting helpers ───────────────────────────────────────────────────── */

function money(v: number, currency?: string): string {
  return `${currency ? currency + " " : ""}${v.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}
function ratio(v: number): string {
  return v.toFixed(2);
}
function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}
function metricLabel(m: string): string {
  const map: Record<string, string> = {
    ctr: "CTR",
    cpc: "CPC",
    cpm: "CPM",
    conversions: "Conversions",
  };
  return map[m] ?? m.toUpperCase();
}
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Build the "## Recommendation — …" markdown for one rec (relay format). */
function recToMarkdown(r: RecJson): string {
  const lines: string[] = [];
  lines.push(`## Recommendation — ${r.action}`);
  lines.push(`Action: ${r.action}`);
  lines.push(`Impact: ${r.impact}`);
  lines.push(`CTA: ${r.cta}`);
  if (typeof r.opportunity_score === "number") {
    lines.push(`Opportunity score: ${r.opportunity_score}/100`);
  }
  if (r.why?.summary) lines.push(`Why: ${r.why.summary}`);
  if (r.evidence_strength?.level) lines.push(`Evidence: ${r.evidence_strength.level}`);

  const contribs = r.opportunity_score_breakdown?.contributions ?? [];
  const composite = contribs.reduce((s, c) => s + c.contribution, 0);
  const breakdown = contribs
    .filter((c) => c.contribution > 0 && composite > 0)
    .map((c) => `${c.label} ${Math.round((c.contribution / composite) * 100)}%`);
  if (breakdown.length > 0) lines.push(`Breakdown: ${breakdown.join(", ")}`);

  const ei = r.estimated_impact;
  if (ei && ei.status === "ok" && (ei.ranges?.length ?? 0) > 0) {
    lines.push("Potential Impact:");
    for (const rg of ei.ranges!) {
      if (rg.direction === "increase")
        lines.push(`+${rg.lowPct}% to +${rg.highPct}% ${rg.metric}`);
      else if (rg.direction === "decrease")
        lines.push(`-${rg.lowPct}% to -${rg.highPct}% ${rg.metric}`);
      else lines.push(`Recover: +${rg.lowPct}% to +${rg.highPct}% ${rg.metric}`);
    }
    if (ei.assumptions?.[0]) lines.push(`Impact Assumption: ${ei.assumptions[0]}`);
  }
  return lines.join("\n");
}

/** Build the "## Top Risk" Root Cause block (relay format) for one cause. */
function causeToMarkdown(c: CauseJson): string {
  const lines: string[] = ["## Top Risk", `Root Cause: ${c.primaryCause}`];
  if (c.severity) lines.push(`Severity: ${c.severity}`);
  if (c.confidence) lines.push(`Confidence: ${c.confidence}`);
  if (c.evidence) lines.push(`Evidence: ${c.evidence}`);
  if ((c.fixOrder?.length ?? 0) > 0) {
    lines.push("Fix Order:");
    c.fixOrder!.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  if ((c.contributors?.length ?? 0) > 0)
    lines.push(`Contributing: ${c.contributors!.join(", ")}`);
  return lines.join("\n");
}

/** Build the "## Trend Overview" block from exec-summary trends. */
function trendsToMarkdown(metrics: TrendMetricJson[]): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const lines = ["## Trend Overview"];
  for (const m of metrics) {
    lines.push(`${metricLabel(m.metric)} ${m.changeLabel} (${cap(m.status)})`);
  }
  return lines.join("\n");
}

function emptyBrief(): BriefData {
  return {
    greeting: greeting(),
    dateLabel: new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    status: "no_data",
    summary:
      "Connect Meta Ads or Google Ads to generate your morning brief.",
    kpis: [],
    cardsMarkdown: "",
  };
}

/* ── Composer ─────────────────────────────────────────────────────────────── */

export async function composeBrief(input: {
  workspaceId: string;
  workspaceName: string;
}): Promise<BriefData> {
  const todayISO = new Date().toISOString().slice(0, 10);

  // Build the same server-resolved context the chat route uses.
  let connectedProviders: MetricsProvider[] = [];
  try {
    const connectors = await getConnectorsByWorkspace(input.workspaceId);
    connectedProviders = [
      ...new Set(
        connectors
          .filter((c) => c.status === "active" && c.provider in CAPABILITIES)
          .map((c) => c.provider as MetricsProvider)
      ),
    ];
  } catch {
    /* fall through — handlers resolve connectors themselves */
  }

  const ctx: WorkspaceContext = {
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    connectedProviders,
    todayISO,
  };

  let summaries: SummaryJson[] = [];
  let recProviders: { provider: string; status: string; recommendations?: RecJson[] }[] = [];
  let causeProviders: { provider: string; status: string; causes?: CauseJson[] }[] = [];

  try {
    const [summaryRaw, recRaw, causeRaw] = await Promise.all([
      metricsToolHandlers.get_executive_summary({}, ctx),
      metricsToolHandlers.get_recommendations({}, ctx),
      metricsToolHandlers.get_root_cause({}, ctx),
    ]);
    summaries = (JSON.parse(summaryRaw).summaries ?? []) as SummaryJson[];
    recProviders = JSON.parse(recRaw).providers ?? [];
    causeProviders = JSON.parse(causeRaw).providers ?? [];
  } catch {
    return emptyBrief();
  }

  // Primary provider = first OK source with headline data (never blend).
  const primary = summaries.find((s) => s.status === "ok" && s.headline);
  if (!primary || !primary.headline) return emptyBrief();

  const currency = primary.currency;
  const recs =
    recProviders.find((p) => p.provider === primary.provider)?.recommendations ?? [];
  const causes =
    causeProviders.find((p) => p.provider === primary.provider)?.causes ?? [];
  const trendMetrics = primary.trends?.metrics ?? [];

  // KPI strip — spend / ROAS / CTR (+ trend arrows where the engine has them).
  const ctrTrend = trendMetrics.find((t) => t.metric === "ctr");
  const convTrend = trendMetrics.find((t) => t.metric === "conversions");
  const kpis: BriefKpi[] = [
    { label: "Spend", value: money(primary.headline.spend, currency) },
    { label: "ROAS", value: ratio(primary.headline.roas) },
    {
      label: "CTR",
      value: pct(primary.headline.ctr),
      ...(ctrTrend
        ? { changeLabel: ctrTrend.changeLabel, status: ctrTrend.status }
        : {}),
    },
  ];
  if (convTrend) {
    kpis.push({
      label: "Conversions",
      value: "—",
      changeLabel: convTrend.changeLabel,
      status: convTrend.status,
    });
  }

  // Deterministic, grounded one-line summary (no model call).
  const watchCount = primary.watch_outs?.length ?? 0;
  const summary =
    `${money(primary.headline.spend, currency)} spent at ROAS ${ratio(primary.headline.roas)}. ` +
    `${recs.length} recommended action${recs.length === 1 ? "" : "s"}, ` +
    `${causes.length} root cause${causes.length === 1 ? "" : "s"} flagged` +
    (watchCount > 0 ? `, ${watchCount} watch-out${watchCount === 1 ? "" : "s"}.` : ".");

  // Insight cards via relay markdown (reuses AiResponse cards).
  const blocks: string[] = [];
  for (const r of recs.slice(0, 3)) blocks.push(recToMarkdown(r));
  if (causes[0]) blocks.push(causeToMarkdown(causes[0]));
  if (trendMetrics.length > 0) blocks.push(trendsToMarkdown(trendMetrics));

  return {
    greeting: greeting(),
    dateLabel: new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    status: "ok",
    provider: primary.provider,
    currency,
    summary,
    kpis,
    cardsMarkdown: blocks.join("\n\n"),
  };
}
