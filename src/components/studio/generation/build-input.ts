/**
 * Campaign Generation Runtime — input assembly (Sprint 63O).
 *
 * Collects the fully-specified brief from the reused Prompt Composer state and
 * the Command Center tool selections into a single typed GenerationInput. Pure;
 * deterministic. The runtime validates it again with Zod.
 */

import type { PlatformId } from "@/components/studio/media";
import type { Brief } from "@/components/studio/composer/composer-context";
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

/** Assemble a typed GenerationInput from the composer brief + command selections. */
export function buildGenerationInput(brief: Brief, command: CommandSelection): GenerationInput {
  return {
    brief: brief.offer.trim(),
    outcomeId: brief.outcome ?? "",
    brand: prettify(brief.brand, "Your Brand"),
    objective: brief.objective ?? "Conversions",
    audience: brief.audience ?? "Core audience",
    budget: brief.budget,
    platforms: brief.platform ? [brief.platform] : DEFAULT_PLATFORMS,
    product: command.attachments.map((a) => a.name),
    knowledge: command.knowledge,
    skills: command.skills,
    connectors: command.connectors,
    model: command.model,
  };
}
