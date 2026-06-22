/**
 * Ask Ultrametrics — structured response renderer (presentation only).
 *
 * Reformats the AI's existing markdown answer into analytics cards WITHOUT
 * inventing data: it parses the markdown the model already produced, and when a
 * section clearly contains metrics, insights/recommendations, or connector
 * status, it renders a styled card. Anything it doesn't recognize falls back to
 * the normal Markdown renderer, so markdown support is fully preserved.
 *
 * Pure presentation — no API, no AI logic, no tools. Operates on the content
 * string passed to it (works on partial/streaming content too, degrading to
 * plain markdown until a section is complete).
 */

import {
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  Trophy,
  BarChart3,
  ShieldCheck,
  Gauge,
  TrendingDown,
  Minus,
  RotateCcw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/os/markdown";

/* ── Parsing ─────────────────────────────────────────────────────────────── */

interface Section {
  heading: string | null;
  level: number;
  body: string;
}

/** Split markdown into heading-delimited sections (preserving body markdown). */
function parseSections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let heading: string | null = null;
  let level = 0;
  let body: string[] = [];

  const flush = () => {
    if (heading !== null || body.join("").trim()) {
      sections.push({ heading, level, body: body.join("\n").trim() });
    }
  };

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      heading = m[2].trim();
      level = m[1].length;
      body = [];
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}

const METRIC_LABELS = new Set([
  "ctr",
  "spend",
  "clicks",
  "impressions",
  "conversions",
  "roas",
  "cpc",
  "cpm",
  "reach",
  "revenue",
  "aov",
  "acos",
  "orders",
  "sessions",
]);

function clean(s: string): string {
  return s.replace(/[*`]/g, "").trim();
}

interface Metric {
  label: string;
  value: string;
}

/** Pull "Label: value" pairs (list, inline, or GFM table rows) for known metrics. */
function extractMetrics(body: string): Metric[] {
  const out: Metric[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    let label: string | null = null;
    let value: string | null = null;

    const table = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (table) {
      label = clean(table[1]);
      value = clean(table[2]);
    } else {
      const kv = /^[-*]?\s*\*{0,2}([A-Za-z ]+?)\*{0,2}\s*[:\-–]\s*(.+)$/.exec(line);
      if (kv) {
        label = clean(kv[1]);
        value = clean(kv[2]);
      }
    }

    if (label && value && METRIC_LABELS.has(label.toLowerCase())) {
      out.push({ label, value });
    }
  }
  return out;
}

/* ── Ranking leaderboards (AI-004B) ──────────────────────────────────────────
 * Detect an entity×metric GFM table (rows = campaign/ad/creative names, columns
 * = known metrics) and render it as a ranked leaderboard instead of a raw
 * markdown table. Pure presentation; only fires on a recognized ranking table,
 * so every other section is unaffected. */

/** First-column header that marks a row as a named entity, not a metric label. */
const NAME_COL_RE = /\b(campaign|ad|ads|creative|asset|name)\b/i;

interface RankingMetric {
  label: string;
  value: string;
}

interface RankingRow {
  name: string;
  values: RankingMetric[];
}

interface RankingTable {
  nameLabel: string;
  rows: RankingRow[];
}

/** Split a GFM table row into cleaned cells (outer pipes stripped). */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => clean(c));
}

/** True when every cell is a GFM separator token (---, :--, --:, :--:). */
function isSeparatorRow(cells: string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, "")))
  );
}

/**
 * Recognize a ranking table: header whose FIRST column is an entity name and
 * which has at least one known-metric column. Returns the parsed rows, or null
 * when the section is not an entity×metric table (so it stays plain markdown /
 * a normal metric card).
 */
function detectRankingTable(body: string): RankingTable | null {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  // Need header + separator + at least one data row.
  if (lines.length < 3) return null;

  const header = splitTableRow(lines[0]);
  if (header.length < 2) return null;
  if (!NAME_COL_RE.test(header[0])) return null;
  if (!isSeparatorRow(splitTableRow(lines[1]))) return null;

  const metricIdx: number[] = [];
  header.forEach((h, i) => {
    if (i > 0 && METRIC_LABELS.has(h.toLowerCase())) metricIdx.push(i);
  });
  if (metricIdx.length === 0) return null;

  const rows: RankingRow[] = [];
  for (const line of lines.slice(2)) {
    const cells = splitTableRow(line);
    const name = cells[0];
    if (!name) continue;
    const values = metricIdx
      .filter((i) => i < cells.length && cells[i] !== "")
      .map((i) => ({ label: header[i], value: cells[i] }));
    if (values.length === 0) continue;
    rows.push({ name, values });
  }
  if (rows.length === 0) return null;

  return { nameLabel: header[0], rows };
}

const PROVIDER_RE =
  /(meta(?:\sads)?|facebook|google(?:\sads)?|ga4|shopify|tiktok|amazon(?:\sads)?|linkedin(?:\sads)?)/i;
const STATUS_RE =
  /(connected|active|ok|healthy|error|failed|no\sdata|unsupported|not\sconnected|disconnected)/i;

type StatusTone = "ok" | "warn" | "error";

interface ConnectorStatus {
  provider: string;
  status: string;
  tone: StatusTone;
}

function toneFor(status: string): StatusTone {
  const s = status.toLowerCase();
  if (/(error|failed|disconnected|not\sconnected)/.test(s)) return "error";
  if (/(no\sdata|unsupported)/.test(s)) return "warn";
  return "ok";
}

/** Pull "<provider> … <status>" rows for connector-status sections. */
function extractStatuses(body: string): ConnectorStatus[] {
  const out: ConnectorStatus[] = [];
  for (const raw of body.split("\n")) {
    const line = clean(raw.replace(/^\s*[-*|]\s*/, ""));
    const p = PROVIDER_RE.exec(line);
    const s = STATUS_RE.exec(line);
    if (p && s) {
      out.push({ provider: p[1], status: s[1], tone: toneFor(s[1]) });
    }
  }
  return out;
}

const RECOMMENDATION_RE =
  /\b(recommendation|recommend|next step|action item|action|suggest)\b/i;
const DIAGNOSTIC_RE = /\b(why|cause|reason|finding|diagnos|changed)\b/i;
const OPPORTUNITY_RE = /\b(opportunit|growth|upside|potential)\b/i;
const RISK_RE = /\b(risk|issue|warning|concern)\b/i;
const STATUS_HEADING_RE =
  /\b(status|connector|source|connected|platform)\b/i;
// AI-013B: an account-level "Trend Overview" section heading.
const TREND_RE = /\btrend\b/i;

type Kind =
  | "metric"
  | "ranking"
  | "status"
  | "trend"
  | "recommendation"
  | "diagnostic"
  | "opportunity"
  | "risk"
  | "plain";

function classify(section: Section): {
  kind: Kind;
  metrics: Metric[];
  statuses: ConnectorStatus[];
  ranking: RankingTable | null;
} {
  const metrics = extractMetrics(section.body);
  const statuses = extractStatuses(section.body);
  const ranking = detectRankingTable(section.body);
  const heading = section.heading ?? "";

  if (STATUS_HEADING_RE.test(heading) && statuses.length > 0) {
    return { kind: "status", metrics, statuses, ranking };
  }
  // AI-013B: a "Trend Overview" heading routes to the trend card before the
  // generic metric card (its CTR/CPC/CPM lines would otherwise read as metrics).
  if (TREND_RE.test(heading)) {
    return { kind: "trend", metrics, statuses, ranking };
  }
  // Ranking (entity×metric table) is checked before the generic metric card so
  // a leaderboard never collapses into a 2-up metric grid.
  if (ranking) {
    return { kind: "ranking", metrics, statuses, ranking };
  }
  if (metrics.length >= 2) {
    return { kind: "metric", metrics, statuses, ranking };
  }
  // Recommendations are checked before insight variants so an "action/recommend"
  // heading renders as a recommendation card, not a generic insight.
  if (RECOMMENDATION_RE.test(heading)) {
    return { kind: "recommendation", metrics, statuses, ranking };
  }
  if (RISK_RE.test(heading)) {
    return { kind: "risk", metrics, statuses, ranking };
  }
  if (OPPORTUNITY_RE.test(heading)) {
    return { kind: "opportunity", metrics, statuses, ranking };
  }
  if (DIAGNOSTIC_RE.test(heading)) {
    return { kind: "diagnostic", metrics, statuses, ranking };
  }
  return { kind: "plain", metrics, statuses, ranking };
}

/** Parse optional Action/Impact/CTA fields from a recommendation body. */
interface RecommendationFields {
  action: string;
  impact: string;
  cta: string;
}

function parseRecommendation(body: string): RecommendationFields | null {
  const field = (name: string): string | null => {
    const re = new RegExp(
      `^\\s*[-*]?\\s*\\*{0,2}${name}\\*{0,2}\\s*:\\s*(.+)$`,
      "im"
    );
    const m = re.exec(body);
    return m ? clean(m[1]) : null;
  };

  const action = field("action");
  const impact = field("impact");
  const cta = field("cta");

  // Structured card only when ALL THREE exist — never fabricate a field.
  if (action && impact && cta) return { action, impact, cta };
  return null;
}

/* ── Trend Overview parsing (AI-013B) ────────────────────────────────────────
 * Parse the account-level trend lines the model relays from AI-013A's
 * trends.metrics (executive summary). Each entry is "<metric> <±N%> <status>",
 * e.g. "CTR +18% (Improving)". Pure presentation — numbers are grounded in the
 * tool result, never invented. Returns [] when nothing matches (graceful
 * fallback to plain markdown). */

type TrendStatus = "improving" | "stable" | "declining";

interface TrendEntry {
  metric: string;
  changeLabel: string;
  /** True when the change is a positive number (drives the arrow direction). */
  up: boolean;
  status: TrendStatus;
}

const TREND_TOKEN_RE =
  /\b(CTR|CPC|CPM|CPA|ROAS|Conversions?)\b[\s:=–-]*([+-]\s?\d+(?:\.\d+)?\s?%)\s*\(?\s*(Improving|Stable|Declining)\s*\)?/gi;

function normalizeMetric(raw: string): string {
  const u = raw.toUpperCase();
  return u.startsWith("CONV") ? "Conversions" : u;
}

function parseTrendEntries(text: string): TrendEntry[] {
  const out: TrendEntry[] = [];
  TREND_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TREND_TOKEN_RE.exec(text)) !== null) {
    const changeLabel = m[2].replace(/\s+/g, "");
    out.push({
      metric: normalizeMetric(m[1]),
      changeLabel,
      up: changeLabel.startsWith("+"),
      status: m[3].toLowerCase() as TrendStatus,
    });
  }
  return out;
}

/* ── Opportunity breakdown (AI-011 Phase 1) ──────────────────────────────────
 * Parse the optional "Why:" / "Evidence:" / "Breakdown:" lines the model emits
 * (AI-010A relay). Pure presentation: these numbers are grounded in the tool
 * result, never invented here. Returns null when no marker is present so every
 * other section degrades to the existing rendering. */

type EvidenceLevel = "strong" | "moderate" | "limited";

interface BreakdownFactor {
  label: string;
  /** 0..100 share for the bar width. */
  percent: number;
}

interface BreakdownData {
  why: string | null;
  evidence: EvidenceLevel | null;
  factors: BreakdownFactor[];
}

/** Match a single "marker:" line (optionally bulleted/bold), case-insensitive. */
function markerLine(body: string, name: string): string | null {
  const re = new RegExp(
    `^\\s*[-*]?\\s*\\*{0,2}${name}\\*{0,2}\\s*:\\s*(.+)$`,
    "im"
  );
  const m = re.exec(body);
  return m ? clean(m[1]) : null;
}

/** Parse "label 45%, label 0.30, …" into bar-ready factors (0..100). */
function parseFactors(line: string | null): BreakdownFactor[] {
  if (!line) return [];
  const out: BreakdownFactor[] = [];
  for (const part of line.split(/[,;]/)) {
    const m = /^(.+?)\s+(\d+(?:\.\d+)?)\s*(%?)$/.exec(part.trim());
    if (!m) continue;
    const label = clean(m[1]);
    let n = parseFloat(m[2]);
    if (!m[3] && n <= 1) n *= 100; // bare fraction → percent
    if (!label || Number.isNaN(n)) continue;
    out.push({ label, percent: Math.max(0, Math.min(100, n)) });
  }
  return out;
}

function parseBreakdown(body: string): BreakdownData | null {
  const why = markerLine(body, "why");
  const evidenceRaw = markerLine(body, "evidence");
  const factors = parseFactors(markerLine(body, "breakdown"));

  let evidence: EvidenceLevel | null = null;
  if (evidenceRaw) {
    const e = evidenceRaw.toLowerCase();
    if (e.includes("strong")) evidence = "strong";
    else if (e.includes("moderate")) evidence = "moderate";
    else if (e.includes("limited") || e.includes("weak")) evidence = "limited";
  }

  if (!why && !evidence && factors.length === 0) return null;
  return { why, evidence, factors };
}

/** Parse an optional "Opportunity score: NN/100" (or "Score: NN") line → 0..100. */
function parseScore(body: string): number | null {
  const line = markerLine(body, "opportunity score") ?? markerLine(body, "score");
  if (!line) return null;
  const m = /(\d+(?:\.\d+)?)/.exec(line);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Remove a single named marker line (e.g. "cta") from a markdown body. */
function stripField(body: string, name: string): string {
  const re = new RegExp(`^\\s*[-*]?\\s*\\*{0,2}${name}\\*{0,2}\\s*:`, "i");
  return body
    .split("\n")
    .filter((l) => !re.test(l))
    .join("\n")
    .trim();
}

/** Remove the marker lines so the body isn't double-rendered as raw markdown. */
function stripBreakdown(body: string): string {
  return body
    .split("\n")
    .filter(
      (l) =>
        !/^\s*[-*]?\s*\*{0,2}(why|evidence|breakdown|opportunity score)\*{0,2}\s*:/i.test(
          l
        )
    )
    .join("\n")
    .trim();
}

/* ── Potential Impact parsing (AI-014B) ──────────────────────────────────────
 * Surfaces the per-opportunity `estimated_impact` (AI-014A) the model relays as
 * a "Potential Impact:" block. Read-only / not-guaranteed: ranges only, never a
 * single number, never a promise. Pure presentation — numbers are grounded in
 * the tool result, never invented. Returns null when absent (graceful fallback). */

type ImpactDirection = "increase" | "decrease" | "recover";

interface ImpactRangeUI {
  metric: string;
  direction: ImpactDirection;
  /** Absolute magnitudes; the arrow carries the direction. */
  low: number;
  high: number;
}

interface ImpactData {
  ranges: ImpactRangeUI[];
  assumption: string | null;
}

const IMPACT_HEADER_RE = /^\s*[-*]?\s*\*{0,2}Potential Impact\*{0,2}\s*:/i;
const IMPACT_LINE_RE =
  /^\s*[-*]?\s*(?:Recover:\s*)?[+-]?\d+%\s*to\s*[+-]?\d+%\s*[A-Za-z][A-Za-z ]*\s*$/i;
const ASSUMPTION_LINE_RE =
  /^\s*[-*]?\s*\*{0,2}Impact Assumption\*{0,2}\s*:/i;
// Capturing form of IMPACT_LINE_RE for extracting the parts of one entry.
const IMPACT_ENTRY_RE =
  /(Recover:\s*)?([+-]?\d+)%\s*to\s*([+-]?\d+)%\s*([A-Za-z][A-Za-z ]*?)\s*$/i;

/** Parse the "Potential Impact:" block. Returns null unless the header exists
 *  AND at least one range line parses. */
function parseImpact(body: string): ImpactData | null {
  if (!IMPACT_HEADER_RE.test(body)) return null;
  const ranges: ImpactRangeUI[] = [];
  for (const raw of body.split("\n")) {
    const m = IMPACT_ENTRY_RE.exec(raw.replace(/^\s*[-*]?\s*/, ""));
    if (!m) continue;
    const direction: ImpactDirection = m[1]
      ? "recover"
      : m[2].startsWith("-")
        ? "decrease"
        : "increase";
    ranges.push({
      metric: clean(m[4]),
      direction,
      low: Math.abs(parseInt(m[2], 10)),
      high: Math.abs(parseInt(m[3], 10)),
    });
  }
  if (ranges.length === 0) return null;
  return { ranges, assumption: markerLine(body, "impact assumption") };
}

/** Remove the contiguous "Potential Impact:" block (header + range lines +
 *  assumption line) without touching surrounding recommendation text. */
function stripImpactBlock(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (IMPACT_HEADER_RE.test(lines[i])) {
      i++; // drop the header
      while (
        i < lines.length &&
        (IMPACT_LINE_RE.test(lines[i]) || ASSUMPTION_LINE_RE.test(lines[i]))
      ) {
        i++; // drop each contiguous block line
      }
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join("\n").trim();
}

/* ── Root Cause parsing (Phase A / AI-015) ───────────────────────────────────
 * Surfaces the per-campaign root cause the model relays from deriveRootCauses:
 * a "Root Cause:" block with severity, confidence, grounded evidence, an ordered
 * fix plan, and any contributing causes. Read-only hypothesis (never "proven").
 * Pure presentation — numbers grounded in the tool result, never invented.
 * Returns null when no "Root Cause:" header is present (graceful fallback). */

type CauseSeverity = "critical" | "high" | "medium" | "low";
type CauseConfidence = "high" | "medium" | "low";

interface RootCauseData {
  cause: string;
  severity: CauseSeverity | null;
  confidence: CauseConfidence | null;
  evidence: string | null;
  fixOrder: string[];
  contributors: string[];
}

const ROOTCAUSE_HEADER_RE =
  /^\s*[-*]?\s*\*{0,2}Root Cause\*{0,2}\s*:\s*(.+)$/im;
// A line that belongs to the Root Cause block (markers, "Fix Order:", numbered).
const ROOTCAUSE_MEMBER_RE =
  /^\s*[-*]?\s*(\*{0,2}(severity|confidence|evidence|contributing|fix order)\*{0,2}\s*:|\d+[.)]\s)/i;

/** Humanize a cause key: "bidding_inefficiency" → "Bidding inefficiency". */
function humanizeCause(raw: string): string {
  const s = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Parse the numbered remediation list that follows the "Fix Order:" line. */
function parseFixOrder(body: string): string[] {
  const lines = body.split("\n");
  const out: string[] = [];
  let inFix = false;
  for (const raw of lines) {
    const l = raw.trim();
    if (/^[-*]?\s*\*{0,2}Fix Order\*{0,2}\s*:/i.test(l)) {
      inFix = true;
      continue;
    }
    if (!inFix) continue;
    const m = /^[-*]?\s*\d+[.)]\s+(.+)$/.exec(l);
    if (m) out.push(clean(m[1]));
    else if (l !== "") break;
  }
  return out;
}

function parseRootCause(body: string): RootCauseData | null {
  const header = ROOTCAUSE_HEADER_RE.exec(body);
  if (!header) return null;

  const sevRaw = (markerLine(body, "severity") ?? "").toLowerCase();
  const severity: CauseSeverity | null = sevRaw.includes("critical")
    ? "critical"
    : sevRaw.includes("high")
      ? "high"
      : sevRaw.includes("medium")
        ? "medium"
        : sevRaw.includes("low")
          ? "low"
          : null;

  const confRaw = (markerLine(body, "confidence") ?? "").toLowerCase();
  const confidence: CauseConfidence | null = confRaw.includes("high")
    ? "high"
    : confRaw.includes("medium")
      ? "medium"
      : confRaw.includes("low")
        ? "low"
        : null;

  const contribLine = markerLine(body, "contributing");
  const contributors = contribLine
    ? contribLine
        .split(/[,;]/)
        .map((c) => humanizeCause(c))
        .filter(Boolean)
    : [];

  return {
    cause: humanizeCause(clean(header[1])),
    severity,
    confidence,
    evidence: markerLine(body, "evidence"),
    fixOrder: parseFixOrder(body),
    contributors,
  };
}

/** Remove the contiguous "Root Cause:" block so it isn't double-rendered. */
function stripRootCause(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (ROOTCAUSE_HEADER_RE.test(lines[i])) {
      i++; // drop the header
      while (i < lines.length && ROOTCAUSE_MEMBER_RE.test(lines[i])) {
        i++; // drop each contiguous block line
      }
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join("\n").trim();
}

/* ── Card primitives ─────────────────────────────────────────────────────── */

function MetricCards({ heading, metrics }: { heading: string | null; metrics: Metric[] }) {
  return (
    <div className="space-y-2">
      {heading && (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-foreground-muted">
          <TrendingUp className="h-3.5 w-3.5 text-brand" />
          {heading}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              {m.label}
            </div>
            <div className="mt-0.5 text-[18px] font-semibold tabular-nums text-foreground">
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked leaderboard of named entities (AI-004B). Rank #1 is emphasized. */
function LeaderboardCard({
  heading,
  table,
}: {
  heading: string | null;
  table: RankingTable;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-foreground-muted">
        <Trophy className="h-3.5 w-3.5 text-brand" />
        {heading ?? table.nameLabel}
      </div>
      <div className="space-y-1.5">
        {table.rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3.5 py-2.5",
              i === 0
                ? "border-brand/25 bg-brand/[0.06]"
                : "border-white/[0.08] bg-white/[0.03]"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold tabular-nums",
                i === 0
                  ? "bg-brand/20 text-brand"
                  : "bg-white/[0.05] text-foreground-muted"
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
              {row.name}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              {row.values.map((v, j) => (
                <div key={j} className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-foreground-muted">
                    {v.label}
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums text-foreground">
                    {v.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type InsightVariant = "diagnostic" | "opportunity" | "risk";

const INSIGHT_STYLES: Record<
  InsightVariant,
  {
    icon: typeof Lightbulb;
    border: string;
    bg: string;
    title: string;
    iconColor: string;
    fallbackLabel: string;
  }
> = {
  diagnostic: {
    icon: Activity,
    border: "border-sky-400/20",
    bg: "bg-sky-400/[0.06]",
    title: "text-sky-100",
    iconColor: "text-sky-300",
    fallbackLabel: "Why it changed",
  },
  opportunity: {
    icon: TrendingUp,
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/[0.06]",
    title: "text-emerald-100",
    iconColor: "text-emerald-300",
    fallbackLabel: "Opportunity",
  },
  risk: {
    icon: ShieldAlert,
    border: "border-red-400/20",
    bg: "bg-red-400/[0.06]",
    title: "text-red-100",
    iconColor: "text-red-300",
    fallbackLabel: "Risk",
  },
};

function InsightCard({
  variant,
  heading,
  body,
}: {
  variant: InsightVariant;
  heading: string | null;
  body: string;
}) {
  const s = INSIGHT_STYLES[variant];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-xl border p-4", s.border, s.bg)}>
      <div className={cn("mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold", s.title)}>
        <Icon className={cn("h-4 w-4", s.iconColor)} />
        {heading ?? s.fallbackLabel}
      </div>
      <Markdown>{body}</Markdown>
    </div>
  );
}

/* ── Opportunity card primitives (AI-011 Phase 1 / Opportunity Cards) ─────── */

const EVIDENCE_STYLES: Record<
  EvidenceLevel,
  { label: string; badge: string; bar: string }
> = {
  strong: {
    label: "Strong evidence",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    bar: "bg-emerald-400/70",
  },
  moderate: {
    label: "Moderate evidence",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    bar: "bg-amber-400/70",
  },
  limited: {
    label: "Limited evidence",
    badge: "border-slate-400/30 bg-slate-400/10 text-slate-200",
    bar: "bg-slate-400/70",
  },
};

/** Evidence-strength pill (strong/moderate/limited). */
function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const ev = EVIDENCE_STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        ev.badge
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      {ev.label}
    </span>
  );
}

/** Rank badge (#1 emphasized, #2/#3 medium, deeper ranks muted). */
function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? "border-brand/40 bg-brand/20 text-brand shadow-[0_0_10px_0] shadow-brand/30"
      : rank <= 3
        ? "border-brand/25 bg-brand/10 text-brand/90"
        : "border-white/[0.1] bg-white/[0.04] text-foreground-muted";
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-lg border px-1.5 text-[12px] font-bold tabular-nums",
        tone
      )}
    >
      #{rank}
    </span>
  );
}

/** 0-100 opportunity-score chip. */
function ScoreChip({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand">
      <Gauge className="h-3 w-3" />
      {score}
      <span className="font-normal text-brand/70">/100</span>
    </span>
  );
}

/** Horizontal factor-contribution bars, tinted by evidence level. */
function FactorBars({
  factors,
  level,
}: {
  factors: BreakdownFactor[];
  level: EvidenceLevel | null;
}) {
  const barColor = level ? EVIDENCE_STYLES[level].bar : "bg-brand/70";
  return (
    <div className="space-y-2">
      {factors.map((f, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="capitalize text-foreground-muted">{f.label}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {Math.round(f.percent)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn("h-full rounded-full", barColor)}
              style={{ width: `${f.percent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Standalone "why + evidence + factor breakdown" card (non-recommendation
 *  sections, e.g. opportunity insights). Renders only the provided parts. */
function BreakdownCard({ data }: { data: BreakdownData }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-foreground-muted">
          <BarChart3 className="h-3.5 w-3.5 text-brand" />
          Why this ranks here
        </div>
        {data.evidence && <EvidenceBadge level={data.evidence} />}
      </div>
      {data.why && (
        <p className="mb-3 text-[13px] leading-relaxed text-foreground/90">
          {data.why}
        </p>
      )}
      {data.factors.length > 0 && (
        <FactorBars factors={data.factors} level={data.evidence} />
      )}
    </div>
  );
}

/** Read-only "Potential Impact" estimate (AI-014B). Ranges only, evidence tier,
 *  and an always-present not-guaranteed caveat. Beneficial by construction, so
 *  every direction is shown in the positive (emerald) tone. */
const IMPACT_ICON: Record<ImpactDirection, typeof TrendingUp> = {
  increase: TrendingUp,
  decrease: TrendingDown,
  recover: RotateCcw,
};

function PotentialImpact({
  data,
  evidence,
}: {
  data: ImpactData;
  evidence: EvidenceLevel | null;
}) {
  return (
    <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
        <Gauge className="h-3.5 w-3.5 text-brand" />
        Potential Impact
        <span className="font-normal normal-case tracking-normal text-foreground-muted/80">
          (estimate{evidence ? ` · ${evidence} evidence` : ""})
        </span>
      </div>
      <div className="space-y-1.5">
        {data.ranges.map((r, i) => {
          const Icon = IMPACT_ICON[r.direction];
          const sign = r.direction === "decrease" ? "−" : "+";
          return (
            <div key={i} className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 capitalize text-foreground/90">
                <Icon className="h-3.5 w-3.5 text-emerald-300" />
                {r.metric}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {sign}
                {r.low}% … {sign}
                {r.high}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground-muted">
        <Info className="mt-px h-3 w-3 shrink-0" />
        <span>
          {data.assumption ? `${data.assumption} · ` : ""}Potential outcome — not
          guaranteed.
        </span>
      </p>
    </div>
  );
}

/* ── Root Cause card (Phase A / AI-015) ──────────────────────────────────── */

const SEVERITY_STYLES: Record<
  CauseSeverity,
  { label: string; chip: string; accent: string }
> = {
  critical: {
    label: "Critical",
    chip: "border-red-400/30 bg-red-400/15 text-red-200",
    accent: "text-red-300",
  },
  high: {
    label: "High",
    chip: "border-red-400/25 bg-red-400/[0.08] text-red-300",
    accent: "text-red-300",
  },
  medium: {
    label: "Medium",
    chip: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    accent: "text-amber-300",
  },
  low: {
    label: "Low",
    chip: "border-slate-400/25 bg-slate-400/10 text-slate-200",
    accent: "text-slate-300",
  },
};

/** Read-only root-cause hypothesis card: cause + severity/confidence, grounded
 *  evidence, and an ordered fix plan. Severity drives the accent. */
function RootCauseCard({
  data,
  heading,
}: {
  data: RootCauseData;
  heading: string | null;
}) {
  const sev = data.severity ? SEVERITY_STYLES[data.severity] : null;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        sev && (data.severity === "critical" || data.severity === "high")
          ? "border-red-400/25 bg-red-400/[0.06]"
          : data.severity === "medium"
            ? "border-amber-400/25 bg-amber-400/[0.06]"
            : "border-white/[0.08] bg-white/[0.025]"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-foreground-muted">
          <ShieldAlert
            className={cn("h-3.5 w-3.5", sev?.accent ?? "text-foreground-muted")}
          />
          {heading ?? "Root Cause"}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {sev && (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                sev.chip
              )}
            >
              {sev.label}
            </span>
          )}
          {data.confidence && (
            <span className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium capitalize text-foreground-muted">
              {data.confidence} confidence
            </span>
          )}
        </div>
      </div>

      <div className="text-[14px] font-semibold text-foreground">
        {data.cause}
      </div>

      {data.evidence && (
        <p className="mt-1 text-[12px] leading-relaxed text-foreground-muted">
          {data.evidence}
        </p>
      )}

      {data.contributors.length > 0 && (
        <p className="mt-1.5 text-[11px] text-foreground-muted/80">
          Contributing: {data.contributors.join(", ")}
        </p>
      )}

      {data.fixOrder.length > 0 && (
        <>
          <div className="my-3 h-px bg-white/[0.06]" />
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
            Fix order
          </div>
          <ol className="space-y-1.5">
            {data.fixOrder.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/90">
                <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand/15 text-[10px] font-bold tabular-nums text-brand">
                  {i + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

/**
 * Visual Opportunity Card — the unified recommendation surface. Header shows the
 * score chip + evidence badge; body shows the action title, impact, factor
 * breakdown bars, an optional "why", a potential-impact estimate, and the CTA.
 * Degrades gracefully: when the model didn't emit Action/Impact/CTA, falls back
 * to markdown (never fabricates a field); each part is shown only when present.
 */
function OpportunityCard({
  heading,
  rank,
  fields,
  score,
  breakdown,
  impact,
  body,
  onPrompt,
}: {
  heading: string | null;
  /** UI-inferred 1-based rank among recommendation cards in this answer. */
  rank: number | null;
  fields: RecommendationFields | null;
  score: number | null;
  breakdown: BreakdownData | null;
  /** AI-014B: parsed Potential Impact block (null when absent). */
  impact: ImpactData | null;
  /** Marker-stripped body, used only for the markdown fallback. */
  body: string;
  onPrompt?: (text: string) => void;
}) {
  const evidence = breakdown?.evidence ?? null;
  // CTA is rendered as a button even in the fallback path: parse it independently
  // and strip its line from the markdown body so it never shows as plain text.
  const cta = fields?.cta ?? markerLine(body, "cta");
  const title = fields?.action ?? heading ?? "Recommendation";
  const fallbackBody = fields ? null : stripField(body, "cta");

  return (
    <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4">
      {/* ── Header: rank + title (left), score + evidence (right) ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {rank !== null && <RankBadge rank={rank} />}
          <h4 className="min-w-0 text-[14px] font-semibold leading-snug text-foreground">
            {title}
          </h4>
        </div>
        {(score !== null || evidence) && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {score !== null && <ScoreChip score={score} />}
            {evidence && <EvidenceBadge level={evidence} />}
          </div>
        )}
      </div>

      {/* ── Body: impact / markdown, divider, breakdown bars, why ── */}
      <div className="mt-3">
        {fields ? (
          <p className="text-[12px] leading-relaxed text-foreground-muted">
            <span className="font-medium text-emerald-300/90">Impact: </span>
            {fields.impact}
          </p>
        ) : (
          <Markdown>{fallbackBody ?? body}</Markdown>
        )}

        {breakdown?.factors.length ? (
          <>
            <div className="my-3 h-px bg-white/[0.06]" />
            <FactorBars factors={breakdown.factors} level={evidence} />
          </>
        ) : null}

        {breakdown?.why && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-foreground/75">
            {breakdown.why}
          </p>
        )}

        {/* AI-014B: read-only potential-impact estimate (ranges + caveat). */}
        {impact && <PotentialImpact data={impact} evidence={evidence} />}
      </div>

      {/* ── Footer: CTA always a button ── */}
      {cta && (
        <div className="mt-3.5">
          <button
            type="button"
            onClick={() => onPrompt?.(cta)}
            disabled={!onPrompt}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/15 px-3 py-1.5 text-[12px] font-medium text-emerald-200 transition-colors hover:bg-emerald-400/25 disabled:cursor-default disabled:opacity-60"
          >
            {cta}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Trend Overview card (AI-013B) ───────────────────────────────────────── */

const TREND_STATUS_STYLES: Record<
  TrendStatus,
  { text: string; label: string }
> = {
  improving: { text: "text-emerald-300", label: "Improving" },
  declining: { text: "text-red-300", label: "Declining" },
  stable: { text: "text-slate-300", label: "Stable" },
};

/** Account-level trend overview (vs previous 30 days). Arrow = direction of
 *  change; colour = status (so a CPC drop reads green "Improving"). */
function TrendOverview({
  heading,
  entries,
}: {
  heading: string | null;
  entries: TrendEntry[];
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-foreground-muted">
        <TrendingUp className="h-3.5 w-3.5 text-brand" />
        {heading ?? "Trend Overview"}
      </div>
      <div className="space-y-1.5">
        {entries.map((e, i) => {
          const s = TREND_STATUS_STYLES[e.status];
          const Arrow =
            e.changeLabel === "0%" || e.changeLabel === "+0%"
              ? Minus
              : e.up
                ? TrendingUp
                : TrendingDown;
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <Arrow className={cn("h-3.5 w-3.5", s.text)} />
                {e.metric}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[13px] font-semibold tabular-nums text-foreground">
                  {e.changeLabel}
                </span>
                <span className={cn("text-[11px] font-medium", s.text)}>
                  {s.label}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TONE_STYLES: Record<
  StatusTone,
  { dot: string; label: string }
> = {
  ok: { dot: "bg-emerald-400 shadow-emerald-400/60", label: "text-emerald-300" },
  warn: { dot: "bg-amber-400 shadow-amber-400/60", label: "text-amber-300" },
  error: { dot: "bg-red-400 shadow-red-400/60", label: "text-red-300" },
};

function StatusCards({
  heading,
  statuses,
}: {
  heading: string | null;
  statuses: ConnectorStatus[];
}) {
  return (
    <div className="space-y-2">
      {heading && (
        <div className="text-[12px] font-semibold uppercase tracking-wide text-foreground-muted">
          {heading}
        </div>
      )}
      <div className="space-y-2">
        {statuses.map((s, i) => {
          const tone = TONE_STYLES[s.tone];
          const Icon =
            s.tone === "ok"
              ? CheckCircle2
              : s.tone === "warn"
                ? CircleDashed
                : AlertTriangle;
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shadow-[0_0_6px_0]",
                    tone.dot
                  )}
                />
                <span className="text-[13px] font-medium capitalize text-foreground">
                  {s.provider}
                </span>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1 text-[12px] font-medium capitalize",
                  tone.label
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Renderer ────────────────────────────────────────────────────────────── */

function reconstruct(section: Section): string {
  if (section.heading === null) return section.body;
  return `${"#".repeat(Math.min(section.level || 3, 6))} ${section.heading}\n\n${section.body}`;
}

export interface AiResponseProps {
  content: string;
  /** Interactive CTA handler (reuses the existing send path). Optional. */
  onPrompt?: (text: string) => void;
}

/** Render an AI markdown answer as structured cards, with markdown fallback. */
export function AiResponse({ content, onPrompt }: AiResponseProps) {
  const sections = parseSections(content);

  // No headings → nothing to structure; render straight markdown — unless the
  // whole answer is a ranking table, which still deserves a leaderboard card.
  if (sections.length <= 1 && sections[0]?.heading === null) {
    const onlyBody = sections[0]?.body ?? content;
    const ranking = sections[0] ? detectRankingTable(onlyBody) : null;
    if (ranking) {
      return <LeaderboardCard heading={null} table={ranking} />;
    }
    // AI-011: surface a breakdown card even on an unstructured answer.
    const bd = parseBreakdown(onlyBody);
    if (bd) {
      return (
        <div className="space-y-3">
          <Markdown>{stripBreakdown(onlyBody)}</Markdown>
          <BreakdownCard data={bd} />
        </div>
      );
    }
    return <Markdown>{content}</Markdown>;
  }

  // UI-inferred rank: a running 1-based counter over recommendation cards, in
  // the model's relayed (ranked) order. No backend/prompt dependency.
  let recRank = 0;

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        // Phase A (AI-015): a "Root Cause:" block renders as a RootCauseCard,
        // independent of heading. Strip the block; render any leftover markdown.
        const rc = parseRootCause(section.body);
        if (rc) {
          const rest = stripRootCause(section.body);
          return (
            <div key={i} className="space-y-3">
              {rest && <Markdown>{rest}</Markdown>}
              <RootCauseCard data={rc} heading={section.heading} />
            </div>
          );
        }

        // AI-011: pull optional Why/Evidence/Breakdown out of the body and strip
        // those marker lines so they aren't double-rendered as raw markdown.
        const bd = parseBreakdown(section.body);
        const view = bd ? { ...section, body: stripBreakdown(section.body) } : section;
        const { kind, metrics, statuses, ranking } = classify(view);

        // Recommendations render as the unified visual OpportunityCard, which
        // owns the rank badge, score chip, evidence badge, breakdown bars, and
        // CTA. No separate BreakdownCard is appended for this branch.
        if (kind === "recommendation") {
          recRank += 1;
          // AI-014B: parse the Potential Impact block and strip it from the
          // markdown fallback body so it never double-renders.
          const impact = parseImpact(section.body);
          const cardBody = impact ? stripImpactBlock(view.body) : view.body;
          return (
            <div key={i}>
              <OpportunityCard
                heading={view.heading}
                rank={recRank}
                fields={parseRecommendation(section.body)}
                score={parseScore(section.body)}
                breakdown={bd}
                impact={impact}
                body={cardBody}
                onPrompt={onPrompt}
              />
            </div>
          );
        }

        const primary = (() => {
          if (kind === "ranking" && ranking) {
            return <LeaderboardCard heading={view.heading} table={ranking} />;
          }
          if (kind === "metric") {
            return <MetricCards heading={view.heading} metrics={metrics} />;
          }
          if (kind === "status") {
            return <StatusCards heading={view.heading} statuses={statuses} />;
          }
          // AI-013B: account-level Trend Overview. Falls back to markdown when no
          // trend lines parse (graceful degradation, no fabricated trends).
          if (kind === "trend") {
            const entries = parseTrendEntries(view.body);
            return entries.length > 0 ? (
              <TrendOverview heading={view.heading} entries={entries} />
            ) : (
              <Markdown>{reconstruct(view)}</Markdown>
            );
          }
          if (kind === "diagnostic" || kind === "opportunity" || kind === "risk") {
            return <InsightCard variant={kind} heading={view.heading} body={view.body} />;
          }
          return <Markdown>{reconstruct(view)}</Markdown>;
        })();

        if (!bd) return <div key={i}>{primary}</div>;
        return (
          <div key={i} className="space-y-3">
            {primary}
            <BreakdownCard data={bd} />
          </div>
        );
      })}
    </div>
  );
}
