"use client";

/**
 * Morning Brief — executive home surface (Sprint 19 composition).
 *
 * AI-native, calm, executive layout. Composition only — reuses the existing
 * <AiResponse> cards, <KpiStrip>, and <BriefActivityFeed>; the server-composed
 * BriefData and all data/AI logic are untouched.
 *
 * Structure: Executive Hero (summary + greeting · date · workspace + executive
 * stats) → fused KPI Command Center → Focus Grid (Opportunity | Risk) → Trend
 * Analysis → Recommendations → Activity Rail → Executive Footer.
 *
 * Tokens only (type-*, .card); strict emerald/muted-red/slate; 8pt rhythm;
 * motion exclusively from src/lib/motion.ts.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { AiResponse } from "@/components/os/ai-response";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import {
  BriefActivityFeed,
  type ActivityItem,
} from "@/components/dashboard/brief-activity-feed";
import { useAsk } from "@/components/os/ask-provider";
import { staggerChildren, slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { BriefData } from "@/lib/ai/brief/compose-brief";

function Section({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <h2 className="type-eyebrow text-foreground-muted">{label}</h2>
      {children}
    </section>
  );
}

/** A single executive stat in the hero focus row. Tone colours the value when
 *  non-zero: critical → muted red, positive → emerald, neutral → foreground. */
function HeroStat({
  value,
  label,
  tone = "neutral",
}: {
  value: number;
  label: string;
  tone?: "critical" | "positive" | "neutral";
}) {
  const valueColor =
    value > 0 && tone === "critical"
      ? "text-red-400/80"
      : value > 0 && tone === "positive"
        ? "text-brand"
        : "text-foreground";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn("type-body font-semibold tabular-nums", valueColor)}>
        {value}
      </span>
      <span className="type-caption text-foreground-muted">{label}</span>
    </div>
  );
}

/** First name from a full name, for the greeting. */
function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

/** Humanize a snake/kebab cause key: "bidding_inefficiency" → "Bidding inefficiency". */
function humanize(raw: string): string {
  const s = raw.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Derive a one-line "AI Says" causal statement from the Top Risk relay markdown
 * (Evidence preferred, else the Root Cause). Presentation-only parse — no AI or
 * compose change. Falls back to the executive summary.
 */
function aiSaysLine(topRiskMarkdown: string | undefined, summary: string): string {
  if (topRiskMarkdown) {
    const evidence = /(?:^|\n)\s*Evidence:\s*(.+)/i.exec(topRiskMarkdown);
    if (evidence?.[1]) return evidence[1].trim();
    const cause = /(?:^|\n)\s*Root Cause:\s*(.+)/i.exec(topRiskMarkdown);
    if (cause?.[1]) return humanize(cause[1].trim());
  }
  return summary;
}

/** Parse recommended action titles from the Recommendations relay markdown. */
function recommendedTitles(recommendationsMarkdown: string | undefined): string[] {
  if (!recommendationsMarkdown) return [];
  const out: string[] = [];
  const re = /^##\s*Recommendation\s*—\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(recommendationsMarkdown)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

/** Most-recent sync timestamp from the activity feed, formatted as a label. */
function lastSyncLabel(activity: ActivityItem[]): string | null {
  let latest = 0;
  for (const a of activity) {
    const t = new Date(a.completedAt ?? a.createdAt).getTime();
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  if (!latest) return null;
  const mins = Math.floor((Date.now() - latest) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function MorningBrief({
  data,
  activity = [],
  workspaceName = "Workspace",
  userName = null,
}: {
  data: BriefData;
  activity?: ActivityItem[];
  workspaceName?: string;
  userName?: string | null;
}) {
  const { open, send } = useAsk();
  const reduce = useReducedMotion();

  const onPrompt = (text: string) => {
    void send(text);
    open();
  };

  const hasInsights =
    data.status === "ok" &&
    Boolean(
      data.topOpportunityMarkdown ||
        data.topRiskMarkdown ||
        data.trendMarkdown ||
        data.recommendationsMarkdown
    );

  // Hero meta counts (derived from the already-composed brief — no AI/data
  // changes). Opportunity/Risk are single grounded sections; recommended
  // actions are counted from the relay headings ("## Recommendation — …").
  const opportunityCount = data.topOpportunityMarkdown ? 1 : 0;
  const riskCount = data.topRiskMarkdown ? 1 : 0;
  const actionCount = data.recommendationsMarkdown
    ? (data.recommendationsMarkdown.match(/^## Recommendation —/gm) ?? []).length
    : 0;
  const lastSync = lastSyncLabel(activity);

  // Hero stack content (all derived from the existing brief).
  const firstName = firstNameOf(userName);
  const greeting = firstName ? `${data.greeting}, ${firstName}` : data.greeting;
  const aiSays = hasInsights ? aiSaysLine(data.topRiskMarkdown, data.summary) : null;
  const recommended = recommendedTitles(data.recommendationsMarkdown).slice(0, 5);

  return (
    <motion.div
      className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8"
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      {/* ── Executive Hero — elevated AI surface, the first visual focus ── */}
      <motion.header
        variants={slideUp}
        className="surface-ai shadow-floating flex flex-col gap-6 p-6 md:p-8"
      >
        {/* Greeting */}
        <div className="flex flex-col gap-2">
          <span className="type-eyebrow text-foreground-muted">
            {data.dateLabel} · {workspaceName}
          </span>
          <h1 className="type-display text-foreground">{greeting}</h1>
        </div>

        {/* Yesterday — KPI deltas (fused KPI Command Center) */}
        {data.kpis.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="type-eyebrow text-foreground-muted">Yesterday</span>
            <KpiStrip kpis={data.kpis} />
          </div>
        )}

        {/* Today's Focus — counts */}
        <div className="flex flex-col gap-2">
          <span className="type-eyebrow text-foreground-muted">
            Today&apos;s Focus
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <HeroStat value={riskCount} label="critical" tone="critical" />
            <HeroStat
              value={opportunityCount}
              label={opportunityCount === 1 ? "opportunity" : "opportunities"}
              tone="positive"
            />
            <HeroStat
              value={actionCount}
              label={actionCount === 1 ? "action" : "actions"}
            />
            {lastSync && (
              <span className="type-caption text-foreground-muted">
                Last sync · {lastSync}
              </span>
            )}
          </div>
        </div>

        {/* AI Says — one-line causal statement */}
        {aiSays && (
          <div className="flex flex-col gap-2">
            <span className="type-eyebrow text-foreground-muted">AI Says</span>
            <p className="type-body max-w-3xl text-balance text-foreground/90">
              {aiSays}
            </p>
          </div>
        )}

        {/* Recommended — action titles (seed Ask on click) */}
        {recommended.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="type-eyebrow text-foreground-muted">Recommended</span>
            <ul className="flex flex-col gap-1">
              {recommended.map((title, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onPrompt(`Tell me more about: ${title}`)}
                    className="group flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="type-caption tabular-nums text-foreground-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="type-body text-foreground/90 transition-colors group-hover:text-foreground">
                      {title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.header>

      <motion.div variants={slideUp} className="h-px bg-white/[0.06]" />

      {hasInsights ? (
        <>
          {/* ── Focus Grid — Opportunity | Risk (equal height; stacks on mobile) ── */}
          {(data.topOpportunityMarkdown || data.topRiskMarkdown) && (
            <motion.div
              variants={slideUp}
              className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch"
            >
              {data.topOpportunityMarkdown && (
                <Section label="Top Opportunity" className="h-full">
                  <AiResponse
                    content={data.topOpportunityMarkdown}
                    onPrompt={onPrompt}
                  />
                </Section>
              )}
              {data.topRiskMarkdown && (
                <Section label="Top Risk" className="h-full">
                  <AiResponse content={data.topRiskMarkdown} onPrompt={onPrompt} />
                </Section>
              )}
            </motion.div>
          )}

          {/* ── Trend Analysis — full width ── */}
          {data.trendMarkdown && (
            <motion.div variants={slideUp}>
              <Section label="Trend Analysis">
                <AiResponse content={data.trendMarkdown} onPrompt={onPrompt} />
              </Section>
            </motion.div>
          )}

          {/* ── Recommendations — full width, primary ── */}
          {data.recommendationsMarkdown && (
            <motion.div variants={slideUp}>
              <Section label="Recommendations">
                <AiResponse
                  content={data.recommendationsMarkdown}
                  onPrompt={onPrompt}
                />
              </Section>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          variants={slideUp}
          className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
        >
          <Sparkles className="h-6 w-6 text-foreground-muted" />
          <p className="type-body font-semibold text-foreground">
            No insights yet
          </p>
          <p className="max-w-sm type-caption text-foreground-muted">
            Connect a source or wait for the next sync to generate your brief.
          </p>
        </motion.div>
      )}

      {/* ── Activity Rail — recent syncs (timeline style) ── */}
      <motion.div variants={slideUp}>
        <Section label="Activity">
          <BriefActivityFeed items={activity} />
        </Section>
      </motion.div>

      {/* ── Executive Footer ── */}
      <motion.footer
        variants={slideUp}
        className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-6 type-caption text-foreground-muted"
      >
        <span>Last updated · {lastSync ?? "just now"}</span>
        <span>{workspaceName}</span>
        <span>As of {data.dateLabel}</span>
      </motion.footer>
    </motion.div>
  );
}
