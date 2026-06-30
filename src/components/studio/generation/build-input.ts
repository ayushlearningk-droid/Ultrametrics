/**
 * Campaign Generation Runtime — input assembly (Sprint 63O).
 *
 * Collects the fully-specified brief from the reused Prompt Composer state and
 * the Command Center tool selections into a single typed GenerationInput. Pure;
 * deterministic. The runtime validates it again with Zod.
 */

import type { PlatformId } from "@/components/studio/media";
import type { Brief } from "@/components/studio/composer/composer-context";
import { DEFAULT_BRAND_DNA, toDnaImprint, type MarketingDNAProfile } from "@/components/studio/dna/brand-dna";
import type { GenerationInput } from "./schemas";

export interface CommandSelection {
  model: string;
  knowledge: string[];
  skills: string[];
  connectors: string[];
  attachments: { name: string }[];
}

function prettify(value: string | undefined, fallback: string): string {
  if (!value || value === "default") return fallback;
  return value
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const DEFAULT_PLATFORMS: PlatformId[] = ["reels", "meta", "tiktok"];

/**
 * Assemble a typed GenerationInput from the composer brief + command selections,
 * with the active Marketing DNA injected (Sprint 63R). The DNA is the brand
 * brain every generated campaign inherits: it fills brand/audience when the brief
 * leaves them blank and stamps its version + imprint onto the input so the
 * runtime can carry it through to every record.
 */
export function buildGenerationInput(
  brief: Brief,
  command: CommandSelection,
  dna: MarketingDNAProfile = DEFAULT_BRAND_DNA
): GenerationInput {
  return {
    brief: brief.offer.trim(),
    outcomeId: brief.outcome ?? "",
    brand: prettify(brief.brand, dna.brandName),
    objective: brief.objective ?? "Conversions",
    audience: brief.audience ?? dna.targetAudience,
    budget: brief.budget,
    platforms: brief.platform ? [brief.platform] : DEFAULT_PLATFORMS,
    product: command.attachments.map((a) => a.name),
    knowledge: command.knowledge,
    skills: command.skills,
    connectors: command.connectors,
    model: command.model,
    dna: toDnaImprint(dna),
  };
}
