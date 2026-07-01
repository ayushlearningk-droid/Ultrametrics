/**
 * Generation Payload — Provider Marketplace input layer (Sprint 64B).
 *
 * The studio-side input bundle a provider call would consume: the prompt, the
 * real uploaded reference images, the active brand assets, and the target
 * placements. Pure and deterministic — it does NOT touch the Provider Registry
 * or Provider Execution; it is only the *input* the marketplace receives. The
 * executor still builds provider GenerationRequests separately.
 */

import type { GenerationInput } from "./schemas";

export interface PayloadReferenceImage {
  name: string;
  kind: "image" | "video";
  dataUrl: string;
}

export interface PayloadBrandAsset {
  id: string;
  label: string;
  kind: string;
}

export interface GenerationPayload {
  prompt: string;
  referenceImages: PayloadReferenceImage[];
  brandAssets: PayloadBrandAsset[];
  platforms: GenerationInput["platforms"];
  /** Preferred provider id (Sprint 64C) — undefined = auto-route. */
  providerPreference?: string;
}

/** Bundle the prompt + reference images + brand assets + provider preference. Pure. */
export function buildGenerationPayload(input: GenerationInput): GenerationPayload {
  return {
    prompt: input.brief.trim(),
    referenceImages: input.referenceImages ?? [],
    brandAssets: input.brandAssets ?? [],
    platforms: input.platforms,
    providerPreference: input.providerPreference,
  };
}
