"use client";

/**
 * AI Studio Home — entry experience (Sprint 63N).
 *
 * The landing the user sees BEFORE the Unified Workspace: outcome-first hero,
 * cinematic AI Movie preview, trending creatives, continue working, AI Employees
 * strip, Brand Library, recent assets, and the Dream Mode summary. The workspace
 * opens only when the user starts an outcome, resumes work, or hits "Open
 * Workspace". Reuses every existing component (one shared runtime via
 * MovieProvider) — no duplicated UI, no new runtime, no architecture change.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clapperboard, Play } from "lucide-react";
import { slideUp } from "@/lib/motion";
import { MovieProvider } from "@/components/studio/movie/movie-context";
import { EmployeeSpotlight } from "@/components/studio/movie/employee-spotlight";
import { ExecutionPath } from "@/components/studio/movie/execution-path";
import { useEmployees } from "@/components/studio/employees/employees-context";
import { EmployeeCard } from "@/components/studio/employees/employee-card";
import { StudioHero } from "@/components/studio/home/hero";
import { BRAND_FACETS } from "@/components/studio/home/data";
import { OUTCOMES } from "@/components/studio/outcomes/outcomes-data";
import { SAMPLE_CREATIVES } from "@/components/studio/creative/creative-data";
import { AdPoster, VideoPreviewCard, CreativeThumbnail } from "@/components/studio/media";
import { DreamModeSummary } from "./dream-mode-summary";

function Reveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={slideUp} initial={reduce ? false : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      {children}
    </motion.div>
  );
}

function Section({ label, description, action, children }: { label: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="type-eyebrow text-foreground-muted">{label}</h2>
          {description && <p className="type-caption text-foreground-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function OpenButton({ onOpen, label = "Open Workspace" }: { onOpen: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="studio-focusable flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-brand px-4 py-2.5 type-body font-semibold text-[hsl(var(--brand-foreground))] transition-transform hover:scale-[1.02] active:scale-100 motion-reduce:hover:scale-100"
    >
      {label} <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function AIEmployeesStrip() {
  const { employees } = useEmployees();
  return (
    <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {employees.map((view) => (
        <EmployeeCard key={view.identity.id} view={view} />
      ))}
    </div>
  );
}

function LandingBody({ onOpen }: { onOpen: () => void }) {
  const reduce = useReducedMotion();
  const trending = SAMPLE_CREATIVES.slice(0, 6);
  const resuming = SAMPLE_CREATIVES.filter((c) => c.recent).slice(0, 3);
  const assets = SAMPLE_CREATIVES.slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-16 px-4 py-10 md:px-10 md:py-14">
      {/* 1 · Outcome-first hero */}
      <motion.div variants={slideUp} initial={reduce ? false : "hidden"} animate="visible" className="flex flex-col gap-5">
        <StudioHero />
        <div className="flex flex-wrap items-center gap-2">
          {OUTCOMES.slice(0, 6).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={onOpen}
              className="studio-focusable inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              <o.icon className="h-3.5 w-3.5 text-brand" />
              {o.label}
            </button>
          ))}
          <OpenButton onOpen={onOpen} />
        </div>
      </motion.div>

      {/* 2 · Cinematic AI Movie preview */}
      <Reveal>
        <Section
          label="AI Movie"
          action={
            <button type="button" onClick={onOpen} className="studio-focusable inline-flex items-center gap-1 type-caption text-brand hover:text-brand/80">
              <Clapperboard className="h-3.5 w-3.5" /> Open in workspace
            </button>
          }
        >
          <div className="studio-hero relative overflow-hidden p-5 md:p-7">
            <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-70" />
            <div className="relative flex flex-col gap-5">
              <EmployeeSpotlight />
              <ExecutionPath />
            </div>
          </div>
        </Section>
      </Reveal>

      {/* 3 · Trending creatives */}
      <Reveal>
        <Section label="Trending Winning Ads">
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {trending.map((c) => (
              <AdPoster key={c.id} media={c.media} title={c.title} platform={c.platform} metrics={c.metrics} />
            ))}
          </div>
        </Section>
      </Reveal>

      {/* 4 · Continue working */}
      <Reveal>
        <Section label="Continue Working" action={<OpenButton onOpen={onOpen} label="Resume in workspace" />}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resuming.map((c) => (
              <button key={c.id} type="button" onClick={onOpen} className="studio-focusable w-full text-left">
                <VideoPreviewCard title={c.title} subtitle="Resume editing" platform={c.platform} />
              </button>
            ))}
          </div>
        </Section>
      </Reveal>

      {/* 5 · AI Employees activity strip */}
      <Reveal>
        <Section label="AI Employees" description="Your always-on creative team.">
          <AIEmployeesStrip />
        </Section>
      </Reveal>

      {/* 6 · Brand Library */}
      <Reveal>
        <Section label="Brand Library">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {BRAND_FACETS.map((f) => (
              <div key={f.id} className="studio-card flex flex-col gap-2.5 p-4">
                <div className="studio-tile flex h-10 w-10 items-center justify-center text-foreground-muted">
                  <f.icon className="h-4 w-4" />
                </div>
                <p className="type-body font-semibold text-foreground">{f.label}</p>
                <span className="chip chip-slate w-fit">Empty</span>
              </div>
            ))}
          </div>
        </Section>
      </Reveal>

      {/* 7 · Recent assets */}
      <Reveal>
        <Section label="Recent Assets">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {assets.map((c) => (
              <CreativeThumbnail key={c.id} media={c.media} aspect="square" />
            ))}
          </div>
        </Section>
      </Reveal>

      {/* 8 · Dream Mode summary */}
      <Reveal>
        <DreamModeSummary />
      </Reveal>

      {/* Footer CTA */}
      <Reveal>
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-foreground-muted">
            <Play className="h-4 w-4" />
          </div>
          <OpenButton onOpen={onOpen} label="Open the AI Studio Workspace" />
        </div>
      </Reveal>
    </div>
  );
}

export function StudioLanding({ onOpen }: { onOpen: () => void }) {
  return (
    <MovieProvider>
      <LandingBody onOpen={onOpen} />
    </MovieProvider>
  );
}
