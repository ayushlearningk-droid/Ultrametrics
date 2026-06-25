"use client";

/**
 * Morning Brief — home surface (Sprint 4 Phase B; V2 Phase 2 — labeled sections).
 *
 * Renders the composed BriefData as labeled executive sections: Executive
 * Summary → Key Metrics (KPI strip) → Top Opportunity → Top Risk → Trend
 * Analysis → Recommendations. Each insight section feeds its OWN per-section
 * relay markdown to the EXISTING <AiResponse> renderer (reusing Opportunity /
 * Root Cause / Trend cards — no duplicate components). CTAs seed Ask + open the
 * drawer. Section labels are plain eyebrows rendered here (AiResponse turns
 * headings into cards, so labels must live outside it).
 */

import type { ReactNode } from "react";
import { AiResponse } from "@/components/os/ai-response";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import {
  BriefActivityFeed,
  type ActivityItem,
} from "@/components/dashboard/brief-activity-feed";
import { useAsk } from "@/components/os/ask-provider";
import type { BriefData } from "@/lib/ai/brief/compose-brief";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-0.5 type-eyebrow text-foreground-muted">{label}</h2>
      {children}
    </section>
  );
}

/** A single executive stat chip in the hero meta row. */
function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="type-body font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="type-caption text-foreground-muted">{label}</span>
    </div>
  );
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
}: {
  data: BriefData;
  activity?: ActivityItem[];
}) {
  const { open, send } = useAsk();

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

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
      {/* 1. AI Executive Summary — Morning Brief hero (KPI strip fused below) */}
      <header className="space-y-5">
        <div className="space-y-3">
          <span className="type-eyebrow text-foreground-muted">
            Executive Brief · {data.greeting} · {data.dateLabel}
          </span>
          <h1 className="type-display max-w-3xl text-balance text-foreground">
            {data.summary}
          </h1>
          {(opportunityCount > 0 ||
            riskCount > 0 ||
            actionCount > 0 ||
            lastSync) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
              <HeroStat
                value={opportunityCount}
                label={opportunityCount === 1 ? "opportunity" : "opportunities"}
              />
              <HeroStat
                value={riskCount}
                label={riskCount === 1 ? "risk" : "risks"}
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
          )}
        </div>

        {/* 2. KPI Strip — fused directly under the hero (no section heading) */}
        {data.kpis.length > 0 && <KpiStrip kpis={data.kpis} />}
      </header>

      {/* Divider — separates the brief header from the insight body */}
      <div className="h-px bg-white/[0.06]" />

      {/* 3–6. Insight sections (each reuses the existing AiResponse cards) */}
      {hasInsights ? (
        <div className="space-y-8">
          {/* 3–4. Opportunity | Risk — side-by-side on desktop */}
          {(data.topOpportunityMarkdown || data.topRiskMarkdown) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
              {data.topOpportunityMarkdown && (
                <Section label="Top Opportunity">
                  <AiResponse
                    content={data.topOpportunityMarkdown}
                    onPrompt={onPrompt}
                  />
                </Section>
              )}
              {data.topRiskMarkdown && (
                <Section label="Top Risk">
                  <AiResponse content={data.topRiskMarkdown} onPrompt={onPrompt} />
                </Section>
              )}
            </div>
          )}

          {/* 5. Trend Analysis — full width */}
          {data.trendMarkdown && (
            <Section label="Trend Analysis">
              <AiResponse content={data.trendMarkdown} onPrompt={onPrompt} />
            </Section>
          )}

          {/* 6. Recommendations — full width */}
          {data.recommendationsMarkdown && (
            <Section label="Recommendations">
              <AiResponse
                content={data.recommendationsMarkdown}
                onPrompt={onPrompt}
              />
            </Section>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
          <p className="type-body text-foreground-muted">
            No insights yet — connect a source or wait for the next sync to
            generate your brief.
          </p>
        </div>
      )}

      {/* 7. Activity Feed — full width, below Recommendations */}
      <Section label="Activity Feed">
        <BriefActivityFeed items={activity} />
      </Section>
    </div>
  );
}
