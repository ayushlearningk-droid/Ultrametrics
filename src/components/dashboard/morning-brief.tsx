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
import { useAsk } from "@/components/os/ask-provider";
import type { BriefData } from "@/lib/ai/brief/compose-brief";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
        {label}
      </h2>
      {children}
    </section>
  );
}

export function MorningBrief({ data }: { data: BriefData }) {
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
          {data.greeting}
        </h1>
        <span className="text-[13px] text-foreground-muted">
          · {data.dateLabel}
        </span>
      </header>

      {/* 1. Executive Summary */}
      <Section label="Executive Summary">
        <p className="text-[13px] leading-relaxed text-foreground/80">
          {data.summary}
        </p>
      </Section>

      {/* 2. KPI Strip */}
      {data.kpis.length > 0 && (
        <Section label="Key Metrics">
          <KpiStrip kpis={data.kpis} />
        </Section>
      )}

      {/* 3–6. Insight sections (each reuses the existing AiResponse cards) */}
      {hasInsights ? (
        <>
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
          {data.trendMarkdown && (
            <Section label="Trend Analysis">
              <AiResponse content={data.trendMarkdown} onPrompt={onPrompt} />
            </Section>
          )}
          {data.recommendationsMarkdown && (
            <Section label="Recommendations">
              <AiResponse
                content={data.recommendationsMarkdown}
                onPrompt={onPrompt}
              />
            </Section>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 text-center">
          <p className="text-[13px] text-foreground-muted">
            No insights yet — connect a source or wait for the next sync to
            generate your brief.
          </p>
        </div>
      )}
    </div>
  );
}
