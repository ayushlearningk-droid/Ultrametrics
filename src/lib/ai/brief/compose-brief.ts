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
  /** Morning Brief V2 — per-section relay markdown, each rendered by its own
   *  <AiResponse>. All optional so legacy consumers (fallbackBrief) and the
   *  no_data path stay valid; cardsMarkdown is retained for backward-compat. */
  topOpportunityMarkdown?: string;
  topRiskMarkdown?: string;
  trendMarkdown?: string;
  recommendationsMarkdown?: string;
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
    roas: "ROAS",
    spend: "Spend",
    cpa: "CPA",
    revenue: "Revenue",
    clicks: "Clicks",
    impressions: "Impressions",
    conversions: "Conversions",
    conversion_rate: "Conv. rate",
  };
  return map[m] ?? m.toUpperCase();
}
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Humanize an engine cause key: "higher_cpc" → "Higher cpc". Idempotent on
 *  already-readable text ("Higher CPC" stays "Higher CPC"). */
function humanizeCause(raw: string): string {
  const s = raw.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Severity ordering for picking the single highest-priority risk. */
const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};
function severityRank(c: CauseJson): number {
  return SEVERITY_RANK[(c.severity ?? "").toLowerCase()] ?? 0;
}

/**
 * Measurable-impact score for ranking recommendations. opportunity_score (0-100,
 * the engine's grounded composite) dominates; the estimated-impact magnitude
 * (largest projected % range) breaks ties. Both come from the tool result.
 */
function recImpactScore(r: RecJson): number {
  const score = typeof r.opportunity_score === "number" ? r.opportunity_score : 0;
  const maxHigh = (r.estimated_impact?.ranges ?? []).reduce(
    (m, rg) => Math.max(m, rg.highPct ?? 0),
    0
  );
  return score * 100 + maxHigh;
}

/** High / Medium / Low from the grounded opportunity_score. */
function priorityFromScore(score?: number): "high" | "medium" | "low" {
  if (typeof score !== "number") return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Top measurable performance changes, phrased plainly (e.g. "CTR up 18%"). */
function topChanges(metrics: TrendMetricJson[], n: number): string[] {
  return [...metrics]
    .filter((t) => t.status !== "stable" && Boolean(t.changeLabel))
    .map((t) => {
      const mag =
        Math.abs(parseFloat(t.changeLabel.replace(/[^0-9.\-]/g, ""))) || 0;
      return { t, mag };
    })
    .sort((a, b) => b.mag - a.mag)
    .slice(0, n)
    .map(({ t }) => {
      const up = t.changeLabel.trim().startsWith("+");
      const num = t.changeLabel.replace(/[+-]/, "").trim();
      return `${metricLabel(t.metric)} ${up ? "up" : "down"} ${num}`;
    });
}

/**
 * CMO-grade executive summary — grounded, concise, actionable. Built only from
 * the existing tool outputs (headline · trends · top cause · ranked recs). Each
 * clause is omitted when its data is absent; no generic AI wording, nothing
 * invented.
 */
function buildExecutiveSummary(args: {
  headline: { spend: number; roas: number };
  currency?: string;
  trendMetrics: TrendMetricJson[];
  topCause?: CauseJson;
  rankedRecs: RecJson[];
  watchOuts: string[];
}): string {
  const { headline, currency, trendMetrics, topCause, rankedRecs, watchOuts } =
    args;
  const parts: string[] = [];

  parts.push(
    `${money(headline.spend, currency)} spent at ROAS ${ratio(headline.roas)}.`
  );

  const changes = topChanges(trendMetrics, 2);
  if (changes.length > 0) parts.push(`${changes.join(", ")}.`);

  if (topCause) {
    parts.push(
      `Top risk: ${humanizeCause(topCause.primaryCause)}` +
        (topCause.severity ? ` (${topCause.severity}).` : ".")
    );
  }

  if (rankedRecs.length > 0) {
    const high = rankedRecs.filter(
      (r) => priorityFromScore(r.opportunity_score) === "high"
    ).length;
    parts.push(
      `${rankedRecs.length} action${rankedRecs.length === 1 ? "" : "s"} ready` +
        (high > 0 ? ` (${high} high-impact)` : "") +
        ` — start with ${rankedRecs[0].action}.`
    );
  } else if (watchOuts.length > 0) {
    parts.push(
      `${watchOuts.length} watch-out${watchOuts.length === 1 ? "" : "s"} to review.`
    );
  }

  return parts.join(" ");
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

  // KPI strip — spend / ROAS / CTR / conversions, each with a trend arrow when
  // the trend engine detected a change (surfaces spend↑↓, ROAS↑↓, CTR↑↓).
  const trendFor = (m: string) => trendMetrics.find((t) => t.metric === m);
  const spendTrend = trendFor("spend");
  const roasTrend = trendFor("roas");
  const ctrTrend = trendFor("ctr");
  const convTrend = trendFor("conversions");
  const kpis: BriefKpi[] = [
    {
      label: "Spend",
      value: money(primary.headline.spend, currency),
      ...(spendTrend
        ? { changeLabel: spendTrend.changeLabel, status: spendTrend.status }
        : {}),
    },
    {
      label: "ROAS",
      value: ratio(primary.headline.roas),
      ...(roasTrend
        ? { changeLabel: roasTrend.changeLabel, status: roasTrend.status }
        : {}),
    },
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

  // Impact-weighted recommendation ranking (opportunity_score, then estimated
  // impact magnitude) — drives the Top Opportunity + the cards' High/Med/Low.
  const rankedRecs = [...recs].sort(
    (a, b) => recImpactScore(b) - recImpactScore(a)
  );
  // Top Risk = the highest-severity grounded cause (never just the first).
  const topRisk = [...causes].sort((a, b) => severityRank(b) - severityRank(a))[0];

  // CMO-grade executive summary, grounded in the tool outputs above.
  const summary = buildExecutiveSummary({
    headline: primary.headline,
    currency,
    trendMetrics,
    topCause: topRisk,
    rankedRecs,
    watchOuts: primary.watch_outs ?? [],
  });

  // Insight cards via relay markdown (reuses AiResponse cards).
  // Morning Brief V2 — Phase 1: order = Top Opportunity → Top Risk → Trend →
  // remaining Recommendations. The highest opportunity_score recommendation is
  // the Top Opportunity (emitted first → the rank-1 OpportunityCard) and is
  // excluded from the remaining list so it never renders twice. Reuses the
  // existing recToMarkdown (recommendation heading → OpportunityCard).
  const [topOpportunity, ...restRecs] = rankedRecs;

  // Per-section relay markdown (each rendered by its own <AiResponse>).
  const topOpportunityMarkdown = topOpportunity
    ? recToMarkdown(topOpportunity)
    : undefined;
  const topRiskMarkdown = topRisk ? causeToMarkdown(topRisk) : undefined;
  const trendMarkdown =
    trendMetrics.length > 0 ? trendsToMarkdown(trendMetrics) : undefined;
  const recBlocks = restRecs.slice(0, 2).map((r) => recToMarkdown(r));
  const recommendationsMarkdown =
    recBlocks.length > 0 ? recBlocks.join("\n\n") : undefined;

  // Backward-compat single blob (same order as the sections above).
  const cardsMarkdown = [
    topOpportunityMarkdown,
    topRiskMarkdown,
    trendMarkdown,
    recommendationsMarkdown,
  ]
    .filter(Boolean)
    .join("\n\n");

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
    cardsMarkdown,
    topOpportunityMarkdown,
    topRiskMarkdown,
    trendMarkdown,
    recommendationsMarkdown,
  };
}
