"use client";

/**
 * Creative Studio (Sprint 37).
 *
 * Renders the deterministic creative plan (diagnosis → brief → hooks → copy →
 * storyboard) produced by the existing creative engines. Reuses the dashboard
 * layout rhythm + the Sprint-36 insight-card kit + design tokens; motion from
 * motion.ts. Planning layer only — no image/video generation. Includes a
 * Creative Pack with copy controls for each asset block.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { staggerChildren, slideUp } from "@/lib/motion";
import {
  CreativeBriefCard,
  CreativeStrategyCard,
  ConfidenceBadge,
  CopyButton,
  BulletListCard,
} from "@/components/os/ai/insight-cards";
import type {
  CreativeSignals,
  CreativeStrategy,
  CreativeBrief,
  HookGroup,
  CopySet,
  Storyboard,
} from "@/lib/ai/creative/types";

function Section({
  label,
  copyText,
  children,
}: {
  label: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={slideUp} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="type-eyebrow text-foreground-muted">{label}</h2>
        {copyText && <CopyButton text={copyText} />}
      </div>
      {children}
    </motion.section>
  );
}

export function CreativeStudio({
  signals,
  strategy,
  brief,
  hooks,
  copy,
  storyboard,
}: {
  signals: CreativeSignals;
  strategy: CreativeStrategy;
  brief: CreativeBrief;
  hooks: HookGroup[];
  copy: CopySet;
  storyboard: Storyboard;
}) {
  const reduce = useReducedMotion();

  const hooksText = hooks
    .map((g) => `${g.category}\n${g.hooks.map((h) => `- ${h}`).join("\n")}`)
    .join("\n\n");
  const headlinesText = copy.headlines.join("\n");
  const storyboardText = [
    ...storyboard.scenes.map((s) => `${s.label}: ${s.direction}`),
    `Ending: ${storyboard.ending}`,
    `CTA: ${storyboard.cta}`,
  ].join("\n");
  const captionsText = copy.captions.join("\n");
  const briefText = [
    `Executive goal: ${brief.executiveGoal}`,
    `Problem: ${brief.problem}`,
    `Direction: ${brief.creativeDirection}`,
    `CTA: ${brief.cta}`,
    `Success metric: ${brief.successMetric}`,
  ].join("\n");

  return (
    <motion.div
      className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 md:px-6"
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      <motion.header variants={slideUp} className="flex flex-col gap-2">
        <span className="type-eyebrow text-foreground-muted">Creative Studio</span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="type-display text-foreground">{brief.executiveGoal}</h1>
          <ConfidenceBadge level={brief.confidence} />
        </div>
        <p className="type-body text-foreground-muted">
          Planning layer — grounded creative direction from your performance
          diagnosis. No images or videos are generated.
        </p>
      </motion.header>

      {/* Creative Diagnosis */}
      <Section label="Creative Diagnosis">
        <div className="card flex flex-col gap-2 p-4">
          <p className="type-body font-semibold text-foreground">{brief.problem}</p>
          {signals.messagingProblems.length > 0 && (
            <BulletListCard items={signals.messagingProblems} />
          )}
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="chip chip-slate">Fatigue {signals.fatigueScore}/100</span>
            <span className="chip chip-slate">Hook: {signals.hookQuality}</span>
            <span className="chip chip-slate">CTA: {signals.ctaQuality}</span>
            <span className="chip chip-slate">Offer: {signals.offerMatch}</span>
            <span className="chip chip-slate">Audience: {signals.audienceMatch}</span>
          </div>
        </div>
      </Section>

      {/* Creative Brief + Strategy */}
      <Section label="Creative Brief" copyText={briefText}>
        <div className="card p-4">
          <CreativeBriefCard brief={brief} />
        </div>
      </Section>
      <Section label="Strategy">
        <div className="card p-4">
          <CreativeStrategyCard strategy={strategy} />
        </div>
      </Section>

      {/* Hook Ideas */}
      <Section label="Hook Ideas" copyText={hooksText}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {hooks.map((g) => (
            <div key={g.category} className="card card-hover flex flex-col gap-2 p-4">
              <span className="type-caption font-semibold text-brand">
                {g.category}
              </span>
              <BulletListCard items={g.hooks} />
            </div>
          ))}
        </div>
      </Section>

      {/* Headlines / Primary Text / CTA */}
      <Section label="Headlines" copyText={headlinesText}>
        <div className="card p-4">
          <BulletListCard items={copy.headlines} />
        </div>
      </Section>
      <Section label="Primary Text">
        <div className="card p-4">
          <BulletListCard items={copy.primaryText} />
        </div>
      </Section>
      <Section label="CTA Suggestions">
        <div className="card p-4">
          <div className="flex flex-wrap gap-1.5">
            {copy.ctas.map((c) => (
              <span key={c} className="chip chip-emerald">
                {c}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* A/B/C variants */}
      <Section label="Ad Variants (A/B/C)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {copy.variants.map((v) => (
            <div key={v.label} className="card card-hover flex flex-col gap-1.5 p-4">
              <span className="type-caption font-semibold text-brand">
                Variant {v.label} · {v.angle}
              </span>
              <p className="type-body font-semibold text-foreground">{v.headline}</p>
              <p className="type-caption text-foreground/90">{v.primaryText}</p>
              <span className="chip chip-slate mt-1 w-fit">{v.cta}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Story Angles / Storyboard */}
      <Section label="Storyboard (Story Angles)" copyText={storyboardText}>
        <div className="card flex flex-col gap-3 p-4">
          {storyboard.scenes.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="type-caption font-semibold text-foreground">
                {s.label}
              </span>
              <span className="type-caption text-foreground/90">{s.direction}</span>
            </div>
          ))}
          <div className="flex flex-col gap-0.5">
            <span className="type-caption font-semibold text-foreground">Ending</span>
            <span className="type-caption text-foreground/90">{storyboard.ending}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="type-caption font-semibold text-foreground">CTA</span>
            <span className="type-caption text-foreground/90">{storyboard.cta}</span>
          </div>
        </div>
      </Section>

      {/* Captions */}
      <Section label="Captions" copyText={captionsText}>
        <div className="card p-4">
          <BulletListCard items={copy.captions} />
        </div>
      </Section>

      {/* Success Metrics */}
      <Section label="Success Metrics">
        <div className="card p-4">
          <p className="type-body text-foreground/90">{brief.successMetric}</p>
        </div>
      </Section>

      {/* Creative Pack */}
      <motion.div
        variants={slideUp}
        className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-6"
      >
        <Sparkles className="h-4 w-4 text-brand" />
        <span className="type-caption text-foreground-muted">Creative Pack —</span>
        <CopyButton text={briefText} label="Brief" />
        <CopyButton text={hooksText} label="Hooks" />
        <CopyButton text={headlinesText} label="Headlines" />
        <CopyButton text={storyboardText} label="Storyboard" />
        <CopyButton text={captionsText} label="Captions" />
      </motion.div>
    </motion.div>
  );
}
