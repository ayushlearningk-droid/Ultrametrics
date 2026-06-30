"use client";

/**
 * Production Marketing DNA — composed panel + compact summary (Sprint 63R).
 *
 * MarketingDNA composes the seven profile cards into the full brand brain.
 * ActiveBrandDnaSummary is the compact "Active Brand DNA" chip the Command
 * Center shows so the operator always sees which brain the next campaign will
 * inherit. Reads the active DNA via context; presentation only.
 */

import { Dna } from "lucide-react";
import { useBrandDna } from "./brand-dna-context";
import { BrandProfile } from "./brand-profile";
import { ToneProfile } from "./tone-profile";
import { AudienceProfile } from "./audience-profile";
import { OfferProfile } from "./offer-profile";
import { VisualProfile } from "./visual-profile";
import { CompetitorProfile } from "./competitor-profile";
import { ComplianceProfile } from "./compliance-profile";

export function MarketingDNA() {
  const dna = useBrandDna();
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Dna className="h-3.5 w-3.5 text-brand" />
          Marketing DNA — inherited by every campaign
        </span>
        <span className="chip chip-emerald tabular-nums">{dna.version}</span>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BrandProfile />
        <ToneProfile />
        <AudienceProfile />
        <OfferProfile />
        <VisualProfile />
        <CompetitorProfile />
        <ComplianceProfile />
      </div>
    </div>
  );
}

/** Compact "Active Brand DNA" summary for the Command Center aside. */
export function ActiveBrandDnaSummary() {
  const dna = useBrandDna();
  return (
    <div className="studio-card flex flex-col gap-2.5 p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Dna className="h-3.5 w-3.5 text-brand" />
          Active Brand DNA
        </span>
        <span className="chip chip-emerald tabular-nums">{dna.version}</span>
      </header>
      <p className="type-body font-semibold text-foreground">{dna.brandName}</p>
      <p className="type-caption text-foreground-muted">{dna.businessCategory}</p>
      <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-2.5">
        <span className="chip chip-slate">{dna.brandVoice.split(",")[0]}</span>
        <span className="chip chip-slate">{dna.pricePositioning.split("—")[0].trim()}</span>
        <span className="chip chip-slate">{dna.primaryLanguages.join(" · ")}</span>
      </div>
      <p className="type-caption text-foreground-muted">Every Generate Campaign inherits this brain.</p>
    </div>
  );
}
