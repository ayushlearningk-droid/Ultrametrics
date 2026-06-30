"use client";

/**
 * Production Prompt Composer (Sprint 63).
 *
 * The command center of the AI Marketing OS — outcome-first, component-driven,
 * inspector-style (Final Cut / Linear / Figma Inspector feel; not a textarea).
 * Left: grouped, reusable selectors. Right: live deterministic inspector
 * (forecast · team · estimate · readiness · generate). Reuses the Outcome,
 * Employees, and Forecast runtimes. Presentation only.
 */

import { Sparkles } from "lucide-react";
import { ComposerProvider, useComposer } from "./composer-context";
import { ComposerSection } from "./composer-primitives";
import {
  OutcomeSelector,
  OfferInput,
  CTASelector,
  AudienceSelector,
  PlatformSelector,
  GoalSelector,
  BrandSelector,
  CampaignSelector,
  BudgetInput,
  ToneSelector,
  CreativeStyleSelector,
  DurationSelector,
  LanguageSelector,
} from "./selectors";
import {
  ForecastPreview,
  AITeamPreview,
  CostEstimator,
  ProviderReadiness,
  GenerateButton,
} from "./inspector";

function ComposerHeader() {
  const { reset } = useComposer();
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Command Center
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Compose your outcome</h1>
        <p className="max-w-xl type-body text-foreground-muted">
          Tell the team the result you want — it decides the creative, the channels, and the plan.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="studio-focusable rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-3 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
      >
        Clear brief
      </button>
    </header>
  );
}

function ComposerBody() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-1 py-4">
      <ComposerHeader />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left — grouped, reusable selectors */}
        <div className="flex flex-col gap-5">
          <ComposerSection title="Outcome & Offer" description="What result do you want?">
            <OutcomeSelector />
            <OfferInput />
            <CTASelector />
          </ComposerSection>

          <ComposerSection title="Audience & Platform">
            <AudienceSelector />
            <PlatformSelector />
            <GoalSelector />
          </ComposerSection>

          <ComposerSection title="Brand & Campaign">
            <BrandSelector />
            <CampaignSelector />
            <BudgetInput />
          </ComposerSection>

          <ComposerSection title="Creative direction">
            <ToneSelector />
            <CreativeStyleSelector />
            <DurationSelector />
            <LanguageSelector />
          </ComposerSection>
        </div>

        {/* Right — live inspector */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <ForecastPreview />
          <AITeamPreview />
          <CostEstimator />
          <ProviderReadiness />
          <GenerateButton />
        </aside>
      </div>
    </div>
  );
}

export function ProductionPromptComposer() {
  return (
    <ComposerProvider>
      <ComposerBody />
    </ComposerProvider>
  );
}
