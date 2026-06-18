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
  Sparkles,
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
const INSIGHT_RE =
  /\b(reason|insight|takeaway|finding|summary|why|opportunit|issue|observation)\b/i;
const STATUS_HEADING_RE =
  /\b(status|connector|source|connected|platform)\b/i;

type Kind = "metric" | "status" | "recommendation" | "insight" | "plain";

function classify(section: Section): {
  kind: Kind;
  metrics: Metric[];
  statuses: ConnectorStatus[];
} {
  const metrics = extractMetrics(section.body);
  const statuses = extractStatuses(section.body);
  const heading = section.heading ?? "";

  if (STATUS_HEADING_RE.test(heading) && statuses.length > 0) {
    return { kind: "status", metrics, statuses };
  }
  if (metrics.length >= 2) {
    return { kind: "metric", metrics, statuses };
  }
  // Recommendations are checked before insights so an "action/recommend"
  // heading renders as a recommendation card, not a generic insight.
  if (RECOMMENDATION_RE.test(heading)) {
    return { kind: "recommendation", metrics, statuses };
  }
  if (INSIGHT_RE.test(heading)) {
    return { kind: "insight", metrics, statuses };
  }
  return { kind: "plain", metrics, statuses };
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

function InsightCard({ heading, body }: { heading: string | null; body: string }) {
  return (
    <div className="rounded-xl border border-brand/20 bg-brand/[0.06] p-4">
      {heading && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
          <Lightbulb className="h-4 w-4 text-brand" />
          {heading}
        </div>
      )}
      <Markdown>{body}</Markdown>
    </div>
  );
}

function RecommendationCard({
  heading,
  body,
}: {
  heading: string | null;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-emerald-200">
        <Sparkles className="h-4 w-4 text-emerald-300" />
        {heading ?? "Recommendations"}
      </div>
      <Markdown>{body}</Markdown>
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
}

/** Render an AI markdown answer as structured cards, with markdown fallback. */
export function AiResponse({ content }: AiResponseProps) {
  const sections = parseSections(content);

  // No headings → nothing to structure; render straight markdown.
  if (sections.length <= 1 && sections[0]?.heading === null) {
    return <Markdown>{content}</Markdown>;
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const { kind, metrics, statuses } = classify(section);
        if (kind === "metric") {
          return <MetricCards key={i} heading={section.heading} metrics={metrics} />;
        }
        if (kind === "status") {
          return <StatusCards key={i} heading={section.heading} statuses={statuses} />;
        }
        if (kind === "recommendation") {
          return (
            <RecommendationCard key={i} heading={section.heading} body={section.body} />
          );
        }
        if (kind === "insight") {
          return <InsightCard key={i} heading={section.heading} body={section.body} />;
        }
        return <Markdown key={i}>{reconstruct(section)}</Markdown>;
      })}
    </div>
  );
}
