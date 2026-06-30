/**
 * Production Marketing DNA — data model (Sprint 63R).
 *
 * The AI Brain every generated campaign inherits. A single deterministic,
 * versioned profile (no backend, no settings persistence) describing the brand's
 * identity, voice, audience, offer, visuals, competitors and compliance. The
 * Generation Runtime consumes a compact projection of this profile through the
 * existing input builder; the version stamps every generated record so the
 * Inspector, Queue and Approval surfaces can show which DNA produced an asset.
 *
 * Pure data — no React, no side effects.
 */

export interface BrandAsset {
  id: string;
  label: string;
  kind: "logo" | "image" | "font" | "doc";
}

export interface MarketingDNAProfile {
  /** Immutable version tag stamped onto every generated record. */
  version: string;
  /* Brand */
  brandName: string;
  businessCategory: string;
  website: string;
  primaryGoal: string;
  /* Audience */
  targetAudience: string;
  primaryLanguages: string[];
  /* Tone */
  brandVoice: string;
  writingStyle: string;
  ctaStyle: string;
  /* Visual */
  visualStyle: string;
  preferredColors: string[];
  preferredFonts: string[];
  /* Offer */
  offerStyle: string;
  pricePositioning: string;
  usp: string;
  /* Competitors */
  competitors: string[];
  /* Compliance */
  restrictions: string[];
  complianceNotes: string;
  /* Assets */
  logo: string;
  brandAssets: BrandAsset[];
}

/**
 * The deterministic active Marketing DNA. This is the production default the
 * studio ships with — a fully-specified brand brain, not placeholder text.
 */
export const DEFAULT_BRAND_DNA: MarketingDNAProfile = {
  version: "DNA-2026.06.1",
  brandName: "Aurora",
  businessCategory: "Direct-to-consumer skincare",
  website: "aurora.co",
  primaryGoal: "Profitable customer acquisition at scale",
  targetAudience: "Skin-conscious women 25–40 who research before buying",
  primaryLanguages: ["English", "Spanish"],
  brandVoice: "Warm, confident, expert-but-approachable",
  writingStyle: "Short sentences, second person, benefit-first, no hype",
  ctaStyle: "Direct and low-friction (\"Start today\", \"See your match\")",
  visualStyle: "Bright editorial — clean skin, soft daylight, generous negative space",
  preferredColors: ["#0E7C66", "#F4EDE4", "#1B1B1F"],
  preferredFonts: ["Söhne", "GT Sectra"],
  offerStyle: "Value bundles with a risk-reversal guarantee",
  pricePositioning: "Premium-accessible — above mass, below luxury",
  usp: "Dermatologist-formulated results without the prescription",
  competitors: ["Glossier", "The Ordinary", "Curology"],
  restrictions: [
    "No absolute cure or medical claims",
    "No before/after implying clinical treatment",
    "No competitor names in ad copy",
  ],
  complianceNotes: "FTC: substantiate every claim; disclose paid partnerships (#ad).",
  logo: "Aurora wordmark (SVG)",
  brandAssets: [
    { id: "as-logo", label: "Aurora wordmark", kind: "logo" },
    { id: "as-pal", label: "Daylight palette", kind: "image" },
    { id: "as-font", label: "Söhne / GT Sectra", kind: "font" },
    { id: "as-guide", label: "Brand guidelines", kind: "doc" },
  ],
};

/** The compact DNA projection the Generation Runtime consumes. Pure. */
export interface DnaImprint {
  version: string;
  brandName: string;
  voice: string;
  writingStyle: string;
  ctaStyle: string;
  visualStyle: string;
  pricePositioning: string;
  usp: string;
  restrictions: string[];
}

/** Project a full profile into the runtime imprint injected via the input builder. */
export function toDnaImprint(dna: MarketingDNAProfile): DnaImprint {
  return {
    version: dna.version,
    brandName: dna.brandName,
    voice: dna.brandVoice,
    writingStyle: dna.writingStyle,
    ctaStyle: dna.ctaStyle,
    visualStyle: dna.visualStyle,
    pricePositioning: dna.pricePositioning,
    usp: dna.usp,
    restrictions: dna.restrictions,
  };
}
