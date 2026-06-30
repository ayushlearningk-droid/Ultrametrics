"use client";

/**
 * Production Prompt Composer — selectors (Sprint 63).
 *
 * Independently reusable, outcome-first selectors. Each is a thin binding of a
 * shared primitive to one brief field — no duplicated control UI. Every selector
 * forwards loading / disabled / error and carries the AI-autofill + voice seams.
 */

import type { PlatformId } from "@/components/studio/media";
import { useComposer } from "./composer-context";
import { ChipSelect, ComposerNumberInput, ComposerTextInput } from "./composer-primitives";
import {
  OUTCOME_OPTIONS,
  AUDIENCE_OPTIONS,
  PLATFORM_OPTIONS,
  BRAND_OPTIONS,
  CAMPAIGN_OPTIONS,
  OBJECTIVE_OPTIONS,
  TONE_OPTIONS,
  LANGUAGE_OPTIONS,
  DURATION_OPTIONS,
  STYLE_OPTIONS,
  CTA_OPTIONS,
} from "./composer-data";

/** Common per-selector state props (future-ready). */
export interface SelectorProps {
  loading?: boolean;
  disabled?: boolean;
  error?: string;
}

const SEAMS = { ai: true, voice: true };

export function OutcomeSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Outcome" options={OUTCOME_OPTIONS} value={brief.outcome} onChange={(v) => setField("outcome", v)} seams={SEAMS} {...p} />;
}

export function AudienceSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Audience" options={AUDIENCE_OPTIONS} value={brief.audience} onChange={(v) => setField("audience", v)} seams={SEAMS} {...p} />;
}

export function PlatformSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect<PlatformId> label="Platform" options={PLATFORM_OPTIONS} value={brief.platform} onChange={(v) => setField("platform", v)} seams={SEAMS} {...p} />;
}

export function BrandSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Brand" options={BRAND_OPTIONS} value={brief.brand} onChange={(v) => setField("brand", v)} seams={SEAMS} {...p} />;
}

export function CampaignSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Campaign" options={CAMPAIGN_OPTIONS} value={brief.campaign} onChange={(v) => setField("campaign", v)} seams={SEAMS} {...p} />;
}

export function GoalSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Objective" options={OBJECTIVE_OPTIONS} value={brief.objective} onChange={(v) => setField("objective", v)} seams={SEAMS} {...p} />;
}

export function ToneSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Tone" options={TONE_OPTIONS} value={brief.tone} onChange={(v) => setField("tone", v)} seams={SEAMS} {...p} />;
}

export function LanguageSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Language" options={LANGUAGE_OPTIONS} value={brief.language} onChange={(v) => setField("language", v)} seams={SEAMS} {...p} />;
}

export function DurationSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Duration" options={DURATION_OPTIONS} value={brief.duration} onChange={(v) => setField("duration", v)} seams={SEAMS} {...p} />;
}

export function CreativeStyleSelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Creative style" options={STYLE_OPTIONS} value={brief.creativeStyle} onChange={(v) => setField("creativeStyle", v)} seams={SEAMS} {...p} />;
}

export function CTASelector(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ChipSelect label="Call to action" options={CTA_OPTIONS} value={brief.cta} onChange={(v) => setField("cta", v)} seams={SEAMS} {...p} />;
}

export function BudgetInput(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return <ComposerNumberInput label="Budget" prefix="$" value={brief.budget} onChange={(v) => setField("budget", v)} disabled={p.disabled} error={p.error} />;
}

export function OfferInput(p: SelectorProps) {
  const { brief, setField } = useComposer();
  return (
    <ComposerTextInput
      label="Offer"
      value={brief.offer}
      onChange={(v) => setField("offer", v)}
      placeholder="e.g. 20% off for returning customers"
      disabled={p.disabled}
      error={p.error}
      seams={SEAMS}
    />
  );
}
