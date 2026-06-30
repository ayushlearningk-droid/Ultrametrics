"use client";

/**
 * AI Studio Home experience (Sprint 63.1).
 *
 * A premium, outcome-first Home that coexists with the production Unified
 * Workspace — a calm landing inspired by the simplicity of best-in-class studios
 * but built on the Ultrametrics AI Operating System philosophy: the user never
 * picks a tool (Image / Video / Avatar). They pick an OUTCOME, and the AI team
 * decides the tools. Selecting an outcome runs the real Generation Runtime and
 * opens the workspace fully synchronized.
 *
 * Additive and presentation-only: mounts its own reused provider stack, reuses
 * the Outcome Engine, Brand DNA summary, Workspace Sessions, Employees registry,
 * media components, and the Generation Store. No backend, no timers, no new
 * runtime, no architecture change.
 */

import { useMemo, useState } from "react";
import { Sun, Moon, Sparkles, ArrowRight, Settings2, Home as HomeIcon, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudioSection, PremiumCard } from "./primitives";
import { ExploreExperience } from "./explore-experience";
import { ComposerProvider, useComposer } from "@/components/studio/composer/composer-context";
import { CommandProvider, useCommand } from "@/components/studio/command/command-context";
import { BrandDnaProvider } from "@/components/studio/dna/brand-dna-context";
import { ActiveBrandDnaSummary } from "@/components/studio/dna/marketing-dna";
import { useBrandDna } from "@/components/studio/dna/brand-dna-context";
import { WorkspaceMemoryProvider, useWorkspaceMemory } from "@/components/studio/memory/workspace-memory-context";
import { SessionsProvider } from "@/components/studio/sessions/sessions-context";
import { SessionsPanel } from "@/components/studio/sessions/sessions-panel";
import { OUTCOMES, outcomeById, type Outcome } from "@/components/studio/outcomes/outcomes-data";
import { EMPLOYEES, EMPLOYEE_ICON } from "@/components/studio/employees/employees-data";
import { SAMPLE_CREATIVES } from "@/components/studio/creative/creative-data";
import { SAMPLE_SESSIONS } from "@/components/studio/sessions/sessions-data";
import { buildGenerationInput } from "@/components/studio/generation/build-input";
import { generate } from "@/components/studio/generation/generation-runtime";
import { setGeneration, useGeneration } from "@/components/studio/generation/generation-store";
import { CreativeThumbnail } from "@/components/studio/media";
import { InspirationLibrary } from "./inspiration-library";
import type { InspirationCard } from "./inspiration-data";

/* The outcome-first prompt never asks "Create Image / Video / Avatar". */
const PROMPT_QUESTION = "What outcome do you want to achieve?";

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1">
      <span className="type-caption font-semibold tabular-nums text-foreground">{value}</span>
      <span className="type-caption text-foreground-muted">{label}</span>
    </span>
  );
}

function GoodMorning() {
  // Deterministic overnight digest from the existing sample records (honest — no
  // fabricated AI activity, no timers).
  const digest = useMemo(() => {
    const active = SAMPLE_SESSIONS.filter((s) => s.status === "active").length;
    const completed = SAMPLE_SESSIONS.filter((s) => s.status === "completed").length;
    const assets = SAMPLE_SESSIONS.reduce((n, s) => n + s.assets, 0);
    const pending = SAMPLE_CREATIVES.filter((c) => c.status === "pending").length;
    return { active, completed, assets, pending };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="studio-hero relative flex flex-col gap-2 overflow-hidden p-6 md:p-7">
        <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-60" />
        <span className="relative flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Sun className="h-3.5 w-3.5 text-brand" />
          Good morning
        </span>
        <h1 className="relative text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Your AI company has been working.
        </h1>
        <p className="relative max-w-xl type-body text-foreground-muted">
          Pick an outcome below — the team decides the creative, copy, audience and placements for you.
        </p>
      </div>

      <PremiumCard className="flex flex-col gap-3 p-5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Moon className="h-3.5 w-3.5 text-brand" />
          While you were sleeping
        </span>
        <div className="flex flex-wrap gap-2">
          <StatPill label="active campaigns" value={digest.active} />
          <StatPill label="completed" value={digest.completed} />
          <StatPill label="assets generated" value={digest.assets} />
          <StatPill label="awaiting approval" value={digest.pending} />
        </div>
        <p className="mt-auto type-caption text-foreground-muted">
          A deterministic digest of your workspace — resume any session below to continue.
        </p>
      </PremiumCard>
    </div>
  );
}

/** The outcome-first prompt + example outcomes. Selecting one runs generation. */
function OutcomePrompt({ onGenerate }: { onGenerate: (outcomeId: string) => void }) {
  const { brief, setField } = useComposer();
  const examples = OUTCOMES.slice(0, 7);

  return (
    <div className="studio-hero relative flex flex-col gap-4 overflow-hidden p-6 md:p-7">
      <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Outcome-first
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{PROMPT_QUESTION}</h2>
      </div>

      <div className="studio-glass relative p-3">
        <textarea
          value={brief.offer}
          onChange={(e) => setField("offer", e.target.value)}
          rows={2}
          aria-label="Add context for the outcome (optional)"
          placeholder="Add context (optional) — then choose an outcome. The AI picks the tools."
          className="w-full resize-none bg-transparent px-2 py-1 type-body leading-relaxed text-foreground outline-none placeholder:text-foreground-muted"
        />
      </div>

      <div className="relative flex flex-wrap gap-2">
        {examples.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onGenerate(o.id)}
            className="studio-card studio-card-interactive studio-focusable inline-flex items-center gap-2 px-3 py-2 text-left"
          >
            <o.icon className="h-4 w-4 text-brand" />
            <span className="type-caption font-semibold text-foreground">{o.label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-foreground-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickOutcomeCard({ outcome, onGenerate }: { outcome: Outcome; onGenerate: (id: string) => void }) {
  const Icon = outcome.icon;
  return (
    <button
      type="button"
      onClick={() => onGenerate(outcome.id)}
      className="studio-card studio-card-interactive studio-focusable flex flex-col items-start gap-2.5 p-4 text-left"
    >
      <div className="studio-tile flex h-11 w-11 items-center justify-center text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <p className="type-body font-semibold text-foreground">{outcome.label}</p>
      <p className="type-caption text-foreground-muted">{outcome.description}</p>
    </button>
  );
}

function EmployeesOverview() {
  return (
    <div className="studio-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {EMPLOYEES.map((e) => {
        const Icon = EMPLOYEE_ICON[e.id];
        return (
          <PremiumCard key={e.id} className="flex w-[196px] shrink-0 items-center gap-2.5 p-3">
            <div className="studio-tile flex h-9 w-9 items-center justify-center text-foreground-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate type-caption font-semibold text-foreground">{e.name}</p>
              <p className="truncate type-caption text-foreground-muted">{e.role}</p>
            </div>
            <span className="ml-auto chip chip-emerald">Ready</span>
          </PremiumCard>
        );
      })}
    </div>
  );
}

function HomeBody({ onOpen, onAdvanced }: { onOpen: () => void; onAdvanced: () => void }) {
  const { brief, setField } = useComposer();
  const { model, knowledge, skills, connectors, attachments } = useCommand();
  const dna = useBrandDna();
  const { memory } = useWorkspaceMemory();
  const gen = useGeneration();

  // Selecting an outcome runs the real Generation Runtime (the AI decides the
  // tools), then opens the fully-synchronized workspace.
  const handleGenerate = (outcomeId: string) => {
    const o = outcomeById(outcomeId);
    const overrideBrief = {
      ...brief,
      outcome: outcomeId,
      objective: o?.objective ?? brief.objective,
      audience: o?.audience ?? brief.audience,
      platform: o?.platforms[0] ?? brief.platform,
    };
    const input = buildGenerationInput(overrideBrief, { model, knowledge, skills, connectors, attachments }, dna, memory);
    setGeneration(generate(input));
    onOpen();
  };

  // Clicking an inspiration card POPULATES the outcome prompt only — it never
  // generates. The user still approves generation from the prompt or quick
  // outcomes.
  const handleInspire = (card: InspirationCard) => {
    const o = outcomeById(card.outcomeId);
    setField("outcome", card.outcomeId);
    setField("offer", card.prompt);
    if (o) {
      setField("objective", o.objective);
      setField("audience", o.audience);
      setField("platform", o.platforms[0]);
    }
  };

  // Explore (Sprint 63.6) clicking a card ONLY prefills the prompt + brand (from
  // the active DNA) and returns to Home — the user still starts generation.
  const [tab, setTab] = useState<"home" | "explore">("home");
  const handleExplore = (card: InspirationCard) => {
    handleInspire(card);
    setField("brand", dna.brandName);
    setTab("home");
  };

  const recentGenerated = gen?.creatives.length ? gen.creatives : SAMPLE_CREATIVES.filter((c) => c.recent).slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-4 py-8 md:px-10 md:py-12">
      {/* Home / Explore tabs */}
      <div className="flex items-center gap-1 self-start rounded-full bg-white/[0.04] p-1">
        {([
          { id: "home" as const, label: "Home", icon: HomeIcon },
          { id: "explore" as const, label: "Explore", icon: Compass },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "studio-focusable inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 type-caption font-semibold transition-colors",
              tab === t.id ? "bg-brand/15 text-brand" : "text-foreground-muted hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "explore" ? (
        <ExploreExperience onSelect={handleExplore} />
      ) : (
      <>
      <GoodMorning />

      <OutcomePrompt onGenerate={handleGenerate} />

      <StudioSection label="Quick outcomes" description="Pick a result — the AI assembles the campaign.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OUTCOMES.map((o) => (
            <QuickOutcomeCard key={o.id} outcome={o} onGenerate={handleGenerate} />
          ))}
        </div>
      </StudioSection>

      <InspirationLibrary onSelect={handleInspire} />

      <StudioSection label="Recent generations" description="Your latest generated assets.">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {recentGenerated.map((c) => (
            <CreativeThumbnail key={c.id} media={c.media} aspect="square" />
          ))}
        </div>
      </StudioSection>

      {/* Continue Working — reuses the Workspace Sessions module (Resume restores the generation). */}
      <StudioSection label="Continue working" description="Resume, duplicate, archive or delete a session.">
        <SessionsPanel onResume={onOpen} />
      </StudioSection>

      <StudioSection label="AI Employees" description="Your always-on creative team.">
        <EmployeesOverview />
      </StudioSection>

      <StudioSection
        label="Brand DNA"
        description="The brain every generated campaign inherits."
        action={
          <button
            type="button"
            onClick={onAdvanced}
            className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2.5 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" /> Advanced brief
          </button>
        }
      >
        <div className="max-w-md">
          <ActiveBrandDnaSummary />
        </div>
      </StudioSection>
      </>
      )}
    </div>
  );
}

export function AiStudioHome({ onOpen, onAdvanced }: { onOpen: () => void; onAdvanced: () => void }) {
  return (
    <ComposerProvider>
      <CommandProvider>
        <BrandDnaProvider>
          <WorkspaceMemoryProvider>
            <SessionsProvider>
              <HomeBody onOpen={onOpen} onAdvanced={onAdvanced} />
            </SessionsProvider>
          </WorkspaceMemoryProvider>
        </BrandDnaProvider>
      </CommandProvider>
    </ComposerProvider>
  );
}
