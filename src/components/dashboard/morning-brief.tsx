"use client";

/**
 * Morning Brief — home surface (Sprint 4 Phase B).
 *
 * Renders the composed BriefData: greeting + grounded summary + KPI strip +
 * the insight cards. The cards are produced by feeding relay-format markdown to
 * the EXISTING <AiResponse> renderer (reusing Opportunity / Root Cause / Trend
 * cards — no duplicate components). CTAs seed Ask and open the drawer.
 */

import { AiResponse } from "@/components/os/ai-response";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { useAsk } from "@/components/os/ask-provider";
import type { BriefData } from "@/lib/ai/brief/compose-brief";

export function MorningBrief({ data }: { data: BriefData }) {
  const { open, send } = useAsk();

  const onPrompt = (text: string) => {
    void send(text);
    open();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            {data.greeting}
          </h1>
          <span className="text-[13px] text-foreground-muted">
            · {data.dateLabel}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/80">
          {data.summary}
        </p>
      </header>

      {/* KPI strip */}
      <KpiStrip kpis={data.kpis} />

      {/* Insight cards (reused AiResponse renderer) */}
      {data.status === "ok" && data.cardsMarkdown ? (
        <AiResponse content={data.cardsMarkdown} onPrompt={onPrompt} />
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
