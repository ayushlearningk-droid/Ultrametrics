"use client";

/**
 * AI War Room — Creative Intelligence wall (Sprint 63.4).
 *
 * Every generated creative, grouped into Winners · High Potential · Needs
 * Improvement · Drafts. Each card shows its thumbnail, outcome, current stage,
 * AI confidence, recommendation and assigned AI employee. Confidence + stage are
 * read from the runtime's deterministic Explainability (the explanation authored
 * by the creative's owner) — never fabricated. Recommendations reuse the
 * Marketing-Brain action vocabulary (scale / test / refresh / finish). Cards plug
 * into the shared selection, the existing Inspector and the existing Explain
 * overlay. Presentation only — no backend, no timers, no fake AI.
 */

import { Swords, Gauge, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreativeThumbnail } from "@/components/studio/media";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import { useGeneration, selectAsset } from "@/components/studio/generation/generation-store";
import { openExplanation } from "@/components/studio/generation/explanation-store";
import { useRegions } from "@/components/studio/workspace/region-manager";
import type { CreativeItem } from "./creative-data";

type Band = "Winners" | "High Potential" | "Needs Improvement" | "Drafts";
type Confidence = "high" | "medium" | "low";

const BANDS: Band[] = ["Winners", "High Potential", "Needs Improvement", "Drafts"];

/** Marketing-Brain-style recommendation per band (action vocabulary, no metrics). */
const RECOMMENDATION: Record<Band, string> = {
  Winners: "Scale spend — strongest signal.",
  "High Potential": "A/B test variants to confirm the lift.",
  "Needs Improvement": "Refresh the hook and retest.",
  Drafts: "Finish the draft before review.",
};

const CONF_LABEL: Record<Confidence, string> = { high: "High", medium: "Medium", low: "Low" };

/** Deterministic band from runtime confidence + asset kind. Video reads as more finished. */
function bandFor(confidence: Confidence, kind: string): Band {
  if (kind === "image") {
    return confidence === "high" ? "High Potential" : confidence === "medium" ? "Needs Improvement" : "Drafts";
  }
  return confidence === "high" ? "Winners" : confidence === "medium" ? "High Potential" : "Needs Improvement";
}

interface Intel {
  confidence: Confidence;
  stage: string;
  band: Band;
}

function intelFor(creative: CreativeItem, explanations: { sourceEmployeeId: string; stage: string; confidence: Confidence }[]): Intel {
  // Confidence + current stage come straight from the owner's deterministic
  // explanation (Explainability), never invented.
  const exp = explanations.find((e) => e.sourceEmployeeId === creative.ownerId);
  const confidence = exp?.confidence ?? "medium";
  const stage = exp?.stage ?? "Creative Generated";
  return { confidence, stage, band: bandFor(confidence, creative.media.kind) };
}

function WarCard({ creative, intel, outcomeLabel }: { creative: CreativeItem; intel: Intel; outcomeLabel: string }) {
  const { showRegion } = useRegions();
  const Icon = EMPLOYEE_ICON[creative.ownerId];

  const select = () => {
    selectAsset(creative.id);
    showRegion("inspector", "float");
  };

  return (
    <div className="studio-card flex w-[248px] shrink-0 flex-col overflow-hidden">
      <button type="button" onClick={select} title="Open in Inspector" className="studio-focusable block w-full">
        <CreativeThumbnail media={creative.media} aspect="video" />
      </button>
      <div className="flex flex-col gap-2 p-3">
        <p className="truncate type-body font-semibold text-foreground">{creative.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip chip-emerald">{outcomeLabel}</span>
          <span className="chip chip-slate">{intel.stage}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3 w-3" /> {CONF_LABEL[intel.confidence]} confidence
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon className="h-3 w-3" /> {employeeName(creative.ownerId)}
          </span>
        </div>
        <p className="type-caption text-foreground">{RECOMMENDATION[intel.band]}</p>
        <button
          type="button"
          onClick={() => openExplanation(intel.stage)}
          className="studio-focusable inline-flex w-fit items-center gap-1 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2 py-1 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <Lightbulb className="h-3 w-3" /> Explain
        </button>
      </div>
    </div>
  );
}

export function CreativeWarRoom() {
  const gen = useGeneration();
  if (!gen || gen.creatives.length === 0) return null;

  const outcomeLabel = outcomeById(gen.campaignPlan.outcomeId)?.label ?? gen.campaignPlan.name;
  const intel = gen.creatives.map((c) => ({ creative: c, intel: intelFor(c, gen.explanations) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Swords className="h-3.5 w-3.5 text-brand" />
        AI War Room — Creative Intelligence
      </div>
      {BANDS.map((band) => {
        const cards = intel.filter((x) => x.intel.band === band);
        if (cards.length === 0) return null;
        return (
          <section key={band} className="flex flex-col gap-3">
            <h3 className={cn("flex items-center gap-2 type-caption font-semibold text-foreground")}>
              {band}
              <span className="chip chip-slate">{cards.length}</span>
            </h3>
            <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
              {cards.map(({ creative, intel: ci }) => (
                <WarCard key={creative.id} creative={creative} intel={ci} outcomeLabel={outcomeLabel} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
