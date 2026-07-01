"use client";

/**
 * AI Studio Command Center (Sprint 63).
 *
 * The production entry surface — ChatGPT/Creatify usability over the Ultrametrics
 * AI Operating System. Composes the command composer with the reused inspector
 * previews (forecast · team · cost · provider readiness) and rows for outcome
 * suggestions, recent campaigns, recent assets, continue working, and the AI
 * Employees strip. "Generate Campaign" invokes the existing flow by opening the
 * Unified Workspace (Outcome → Movie → Employees → Queue → Approval). Reuses
 * every runtime; no duplicate components, no new architecture.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { slideUp } from "@/lib/motion";
import { ComposerProvider } from "@/components/studio/composer/composer-context";
import { ForecastPreview, AITeamPreview, CostEstimator, ProviderReadiness } from "@/components/studio/composer/inspector";
import { EMPLOYEES, EMPLOYEE_ICON } from "@/components/studio/employees/employees-data";
import { OutcomeLibrary } from "@/components/studio/outcomes/outcome-library";
import { SessionsProvider } from "@/components/studio/sessions/sessions-context";
import { SessionsPanel } from "@/components/studio/sessions/sessions-panel";
import { SAMPLE_CREATIVES } from "@/components/studio/creative/creative-data";
import { VideoPreviewCard, CreativeThumbnail } from "@/components/studio/media";
import { useComposer } from "@/components/studio/composer/composer-context";
import { buildGenerationInput } from "@/components/studio/generation/build-input";
import { generate } from "@/components/studio/generation/generation-runtime";
import { setGeneration, useReferenceAssets, useProviderPreference } from "@/components/studio/generation/generation-store";
import { executeGeneration } from "@/components/studio/generation/executor";
import { ProviderMarketplace } from "@/components/studio/providers/provider-marketplace";
import { BrandDnaProvider, useBrandDna } from "@/components/studio/dna/brand-dna-context";
import { MarketingDNA, ActiveBrandDnaSummary } from "@/components/studio/dna/marketing-dna";
import { WorkspaceMemoryProvider, useWorkspaceMemory } from "@/components/studio/memory/workspace-memory-context";
import { MemoryPanel } from "@/components/studio/memory/memory-panel";
import { CommandProvider, useCommand } from "./command-context";
import { CommandComposer } from "./command-composer";

function Reveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={slideUp} initial={reduce ? false : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      {children}
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="type-eyebrow text-foreground-muted">{label}</h2>
      {children}
    </section>
  );
}

function EmployeesStrip() {
  return (
    <div className="studio-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {EMPLOYEES.map((e) => {
        const Icon = EMPLOYEE_ICON[e.id];
        return (
          <div key={e.id} className="studio-card flex w-[196px] shrink-0 items-center gap-2.5 p-3">
            <div className="studio-tile flex h-9 w-9 items-center justify-center text-foreground-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate type-caption font-semibold text-foreground">{e.name}</p>
              <p className="truncate type-caption text-foreground-muted">{e.role}</p>
            </div>
            <span className="ml-auto chip chip-emerald">Ready</span>
          </div>
        );
      })}
    </div>
  );
}

function Body({ onOpen }: { onOpen: () => void }) {
  const reduce = useReducedMotion();
  const { brief } = useComposer();
  const { model, knowledge, skills, connectors, attachments } = useCommand();
  const dna = useBrandDna();
  const { memory } = useWorkspaceMemory();
  const referenceAssets = useReferenceAssets();
  const providerPreference = useProviderPreference();

  // "Generate Campaign" executes the real Generation Runtime with the active
  // Marketing DNA (Sprint 63R), Workspace Memory (Sprint 63S), reference images
  // (Sprint 65.0) and provider preference (Sprint 64C) injected.
  const handleGenerate = () => {
    const input = buildGenerationInput(brief, { model, knowledge, skills, connectors, attachments }, dna, memory, referenceAssets, providerPreference);
    const result = generate(input);
    setGeneration(result);
    // Execution spine (Sprint 64M): route each asset through the orchestrator and
    // execute on the server (OpenAI Images live). Async — the store advances in
    // real time; fire-and-forget so the workspace opens immediately.
    void executeGeneration(result);
    onOpen();
  };

  const campaigns = SAMPLE_CREATIVES.filter((c) => c.status === "approved").slice(0, 3);
  const resuming = SAMPLE_CREATIVES.filter((c) => c.recent).slice(0, 3);
  const assets = SAMPLE_CREATIVES.slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-4 py-10 md:px-10 md:py-14">
      {/* Composer + live inspector */}
      <motion.div variants={slideUp} initial={reduce ? false : "hidden"} animate="visible" className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <CommandComposer onGenerate={handleGenerate} />
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <ActiveBrandDnaSummary />
          <ForecastPreview />
          <AITeamPreview />
          <CostEstimator />
          <ProviderReadiness />
        </aside>
      </motion.div>

      {/* Marketing DNA — the brain every generated campaign inherits */}
      <Reveal>
        <Section label="Marketing DNA">
          <MarketingDNA />
        </Section>
      </Reveal>

      {/* AI Memory — editable preferences inherited by every campaign */}
      <Reveal>
        <Section label="AI Memory">
          <MemoryPanel />
        </Section>
      </Reveal>

      {/* Provider Marketplace — the single provider catalog + action surface */}
      <Reveal>
        <Section label="Providers">
          <ProviderMarketplace />
        </Section>
      </Reveal>

      {/* Outcome Intelligence Library — pick a result, populate the brief */}
      <Reveal>
        <Section label="Outcome Library">
          <OutcomeLibrary />
        </Section>
      </Reveal>

      {/* Workspace Sessions — resume / duplicate / archive / delete */}
      <Reveal>
        <Section label="Workspace Sessions">
          <SessionsPanel onResume={onOpen} />
        </Section>
      </Reveal>

      {/* Recent campaigns */}
      <Reveal>
        <Section label="Recent campaigns">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {campaigns.map((c) => (
              <button key={c.id} type="button" onClick={onOpen} className="studio-focusable w-full text-left">
                <VideoPreviewCard title={c.title} subtitle="Open campaign" platform={c.platform} metrics={c.metrics} />
              </button>
            ))}
          </div>
        </Section>
      </Reveal>

      {/* Continue working */}
      <Reveal>
        <Section label="Continue working">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {resuming.map((c) => (
              <button key={c.id} type="button" onClick={onOpen} className="studio-focusable w-full text-left">
                <VideoPreviewCard title={c.title} subtitle="Resume editing" platform={c.platform} />
              </button>
            ))}
          </div>
        </Section>
      </Reveal>

      {/* Recent assets */}
      <Reveal>
        <Section label="Recent assets">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {assets.map((c) => (
              <CreativeThumbnail key={c.id} media={c.media} aspect="square" />
            ))}
          </div>
        </Section>
      </Reveal>

      {/* AI Employees strip */}
      <Reveal>
        <Section label="AI Employees">
          <EmployeesStrip />
        </Section>
      </Reveal>
    </div>
  );
}

export function AiStudioCommandCenter({ onOpen }: { onOpen: () => void }) {
  return (
    <ComposerProvider>
      <CommandProvider>
        <BrandDnaProvider>
          <WorkspaceMemoryProvider>
            <SessionsProvider>
              <Body onOpen={onOpen} />
            </SessionsProvider>
          </WorkspaceMemoryProvider>
        </BrandDnaProvider>
      </CommandProvider>
    </ComposerProvider>
  );
}
