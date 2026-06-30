"use client";

/**
 * AI Explainability Layer — Explain trigger + overlay (Sprint 63Y).
 *
 * ExplainButton opens a decision's explanation from any surface (Inspector,
 * Approval, Timeline, Activity Bus). ExplanationOverlay (mounted once in the
 * Unified Workspace) reads the active generation + open store and renders the
 * complete explanation: why · evidence · confidence · alternatives · business
 * impact · source AI employee · timeline stage. Presentation only — the
 * explanation content is produced deterministically by the Generation Runtime.
 */

import { Lightbulb, X, ShieldCheck, CheckCircle2, GitBranch, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useGeneration } from "./generation-store";
import { openExplanation, closeExplanation, useExplanation } from "./explanation-store";

const CONFIDENCE_CHIP: Record<"high" | "medium" | "low", string> = {
  high: "chip-emerald",
  medium: "chip-slate",
  low: "chip-slate",
};

/** Reusable "Explain" affordance — opens the decision explanation for a stage. */
export function ExplainButton({ stage, className }: { stage: string | null; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openExplanation(stage);
      }}
      title="Explain this decision"
      className={cn(
        "studio-focusable inline-flex items-center gap-1 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2 py-1 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground",
        className
      )}
    >
      <Lightbulb className="h-3 w-3" /> Explain
    </button>
  );
}

export function ExplanationOverlay() {
  const gen = useGeneration();
  const { open, stage } = useExplanation();
  if (!open || !gen || gen.explanations.length === 0) return null;

  const ex = gen.explanations.find((e) => e.stage === stage) ?? gen.explanations[0];
  const Icon = EMPLOYEE_ICON[ex.sourceEmployeeId];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeExplanation} />
      <div className="studio-card relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto p-5">
        <header className="flex items-start gap-3">
          <div className="studio-tile flex h-10 w-10 shrink-0 items-center justify-center text-brand">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
              <Lightbulb className="h-3.5 w-3.5 text-brand" /> Decision explanation
            </span>
            <h2 className="type-body font-bold text-foreground">{ex.stage}</h2>
            <p className="type-caption text-foreground-muted">{employeeName(ex.sourceEmployeeId)}</p>
          </div>
          <span className={cn("chip", CONFIDENCE_CHIP[ex.confidence])}>{ex.confidence} confidence</span>
          <button type="button" onClick={closeExplanation} className="studio-focusable text-foreground-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <Section icon={<Lightbulb className="h-3.5 w-3.5 text-brand" />} title="Why this decision">
          <p className="type-caption text-foreground">{ex.why}</p>
        </Section>

        <Section icon={<ShieldCheck className="h-3.5 w-3.5 text-brand" />} title="Evidence">
          <ul className="flex flex-col gap-1">
            {ex.evidence.map((e) => (
              <li key={e} className="flex items-start gap-1.5 type-caption text-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-brand" /> {e}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<GitBranch className="h-3.5 w-3.5 text-brand" />} title="Alternatives considered">
          <div className="flex flex-wrap gap-1.5">
            {ex.alternatives.map((a) => (
              <span key={a} className="chip chip-slate">{a}</span>
            ))}
          </div>
        </Section>

        <Section icon={<TrendingUp className="h-3.5 w-3.5 text-brand" />} title="Business impact">
          <p className="type-caption text-foreground">{ex.businessImpact}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-3">
      <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        {icon}
        {title}
      </span>
      {children}
    </section>
  );
}
