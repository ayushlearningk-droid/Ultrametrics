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

import { useState } from "react";
import { Sparkles, ArrowRight, Settings2, Home as HomeIcon, Compass, Users, Download } from "lucide-react";
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
import { buildGenerationInput } from "@/components/studio/generation/build-input";
import { generate } from "@/components/studio/generation/generation-runtime";
import { setGeneration, useGeneration, useReferenceAssets, useProviderPreference } from "@/components/studio/generation/generation-store";
import { executeGeneration } from "@/components/studio/generation/executor";
import { EXECUTION_LABEL, type ExecutionStatus } from "@/components/studio/generation/execution";
import { ReferenceUpload, ingestFiles } from "@/components/studio/command/product-upload";
import { CreativeThumbnail } from "@/components/studio/media";
import { InspirationLibrary } from "./inspiration-library";
import type { InspirationCard } from "./inspiration-data";

/** Product hero — what AI Studio is, understood in 15 seconds. */
function Hero() {
  return (
    <div className="studio-hero relative flex flex-col gap-3 overflow-hidden p-6 md:p-8">
      <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-60" />
      <span className="relative flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        AI Marketing Operating System
      </span>
      <h1 className="relative max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Describe one campaign. Your AI Marketing Team builds everything.
      </h1>
      <p className="relative max-w-xl type-body text-foreground-muted">
        Research · Copy · Creatives · Videos · Campaign · Export. One prompt. Complete campaign.
      </p>
    </div>
  );
}

/** How it works — three steps so a first-timer knows what happens after Generate. */
function HowItWorks() {
  const steps = [
    { n: "1", icon: Sparkles, title: "Describe Campaign", desc: "Tell us the goal in one line." },
    { n: "2", icon: Users, title: "AI Team Builds", desc: "Research, copy, creatives and video — automatically." },
    { n: "3", icon: Download, title: "Review & Export", desc: "Approve the results and export your campaign." },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {steps.map((s) => (
        <PremiumCard key={s.n} className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2">
            <span className="studio-tile flex h-8 w-8 items-center justify-center text-brand">
              <s.icon className="h-4 w-4" />
            </span>
            <span className="type-caption font-semibold text-foreground-muted">Step {s.n}</span>
          </div>
          <p className="type-body font-semibold text-foreground">{s.title}</p>
          <p className="type-caption text-foreground-muted">{s.desc}</p>
        </PremiumCard>
      ))}
    </div>
  );
}

/** Concrete example prompts — clicking populates the prompt (does not generate). */
const EXAMPLE_PROMPTS = [
  "Launch a Diwali grocery campaign",
  "Generate Meta ads for protein powder",
  "Create a fashion sale campaign",
  "Generate reels for Rajmandir Hypermarket",
];

/** The prompt-first campaign starter. "Generate Campaign" runs the real runtime. */
function OutcomePrompt({ onGenerateCampaign, preparing, canGenerate }: { onGenerateCampaign: () => void; preparing: boolean; canGenerate: boolean }) {
  const { brief, setField } = useComposer();

  return (
    <div className="studio-hero relative flex flex-col gap-4 overflow-hidden p-6 md:p-7">
      <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Start here
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Describe your campaign</h2>
      </div>

      <div
        className="studio-glass relative flex flex-col gap-3 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          ingestFiles(e.dataTransfer.files);
        }}
      >
        <textarea
          value={brief.offer}
          onChange={(e) => setField("offer", e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length > 0) ingestFiles(e.clipboardData.files);
          }}
          rows={2}
          aria-label="Describe your campaign"
          placeholder="Describe your campaign — e.g. Launch a Diwali grocery campaign. Drop or paste reference images."
          className="w-full resize-none bg-transparent px-2 py-1 type-body leading-relaxed text-foreground outline-none placeholder:text-foreground-muted"
        />
        <ReferenceUpload />
      </div>

      {/* Example prompts — populate the prompt */}
      <div className="relative flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setField("offer", p)}
            className="studio-card studio-card-interactive studio-focusable inline-flex items-center gap-2 px-3 py-2 text-left"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span className="type-caption font-semibold text-foreground">{p}</span>
          </button>
        ))}
      </div>

      {/* Primary action */}
      <button
        type="button"
        onClick={onGenerateCampaign}
        disabled={!canGenerate || preparing}
        aria-label="Generate campaign"
        className={cn(
          "studio-focusable relative inline-flex w-fit items-center justify-center gap-2 rounded-[var(--studio-radius-md)] px-5 py-2.5 type-body font-semibold transition-transform",
          !canGenerate || preparing
            ? "cursor-not-allowed bg-brand/15 text-brand opacity-60"
            : "bg-brand text-[hsl(var(--brand-foreground))] hover:scale-[1.01] active:scale-100"
        )}
      >
        <Sparkles className="h-4 w-4" />
        {preparing ? "Preparing AI Team…" : "Generate Campaign"}
        {!preparing && <ArrowRight className="h-4 w-4" />}
      </button>
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
  const referenceAssets = useReferenceAssets();
  const providerPreference = useProviderPreference();
  const [preparing, setPreparing] = useState(false);

  // Selecting an outcome runs the real Generation Runtime (the AI decides the
  // tools), then opens the fully-synchronized workspace.
  const handleGenerate = (outcomeId: string) => {
    const o = outcomeById(outcomeId);
    // Populate the brief from the chosen outcome.
    setField("outcome", outcomeId);
    if (o) {
      setField("objective", o.objective);
      setField("audience", o.audience);
      setField("platform", o.platforms[0]);
    }
    // Require a prompt before generating — aligns with the Command Center gate.
    if (!brief.offer.trim()) return;
    const overrideBrief = {
      ...brief,
      outcome: outcomeId,
      objective: o?.objective ?? brief.objective,
      audience: o?.audience ?? brief.audience,
      platform: o?.platforms[0] ?? brief.platform,
    };
    const input = buildGenerationInput(overrideBrief, { model, knowledge, skills, connectors, attachments }, dna, memory, referenceAssets, providerPreference);
    const result = generate(input);
    setGeneration(result);
    // Execution spine (Sprint 64M): route each asset through the orchestrator and
    // execute on the server (OpenAI Images live). Async, fire-and-forget.
    void executeGeneration(result);
    onOpen();
  };

  // Prompt-first primary action: generate using the typed prompt with a sensible
  // default outcome (architecture unchanged — still outcome-driven underneath).
  const handleGenerateCampaign = () => {
    if (!brief.offer.trim()) return;
    setPreparing(true);
    handleGenerate(brief.outcome || OUTCOMES[0].id);
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

  // Only ever show real generated output here — never sample data (Sprint 63.9).
  const recentGenerated = gen?.creatives ?? [];

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
      <Hero />

      <HowItWorks />

      <OutcomePrompt onGenerateCampaign={handleGenerateCampaign} preparing={preparing} canGenerate={!!brief.offer.trim()} />

      <StudioSection label="Quick outcomes" description="Pick a result — the AI assembles the campaign.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OUTCOMES.map((o) => (
            <QuickOutcomeCard key={o.id} outcome={o} onGenerate={handleGenerate} />
          ))}
        </div>
      </StudioSection>

      <InspirationLibrary onSelect={handleInspire} />

      <StudioSection label="Recent campaigns" description="Your latest campaigns — open to review and export.">
        {recentGenerated.length === 0 ? (
          <PremiumCard className="px-6 py-10 text-center">
            <p className="type-body font-semibold text-foreground">No campaigns yet</p>
            <p className="type-caption text-foreground-muted">Describe a campaign above and press Generate — your results will appear here.</p>
          </PremiumCard>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentGenerated.slice(0, 8).map((c) => {
              const status = (c.execution?.status ?? "queued") as ExecutionStatus;
              return (
                <PremiumCard key={c.id} className="flex flex-col gap-2 p-3">
                  <div className="overflow-hidden rounded-[var(--studio-radius-md)]">
                    <CreativeThumbnail media={c.media} aspect="square" />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate type-caption font-semibold text-foreground">{c.title}</p>
                    <span className={cn("chip shrink-0", status === "completed" ? "chip-emerald" : status === "failed" ? "chip-red" : "chip-slate")}>
                      {EXECUTION_LABEL[status]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpen}
                    className="studio-focusable inline-flex items-center justify-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-3 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </button>
                </PremiumCard>
              );
            })}
          </div>
        )}
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
