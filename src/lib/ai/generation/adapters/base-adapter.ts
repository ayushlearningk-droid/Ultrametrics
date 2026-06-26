/**
 * AI Generation Engine — base adapter (Sprint 53).
 *
 * Pure, deterministic adapter base every provider adapter extends. It provides
 * request normalization, response normalization, validation, capability checks,
 * and RELATIVE cost/duration estimation. It deliberately does NOT implement
 * generate()/health() — there is NO execution, NO API call, NO SDK, NO media.
 */

import type {
  AspectRatio,
  AssetType,
  GeneratedAsset,
  GenerationProvider,
  GenerationRequest,
  GenerationResult,
  GenerationStatus,
  ProviderCapability,
  ValidationResult,
} from "../types";
import {
  estimateImageCredits,
  estimateVideoCredits,
  estimateExpectedDuration,
  type CostEstimate,
  type DurationEstimate,
} from "../cost-estimator";
import {
  validatePromptText,
  validateAspectRatioFor,
  validateRequest,
} from "../validation";

export type CapabilityFlag =
  | "negativePrompt"
  | "seed"
  | "imageToVideo"
  | "image"
  | "video";

/** A normalized, provider-agnostic outcome shape (no media is fabricated). */
export interface RawProviderOutcome {
  jobId: string;
  status: GenerationStatus;
  assets?: GeneratedAsset[];
  error?: string;
}

export abstract class BaseGenerationAdapter {
  abstract readonly metadata: GenerationProvider;
  /** Per-provider relative effort weight (deterministic, not a price). */
  protected readonly costWeight: number = 1;

  capabilities(): ProviderCapability {
    return this.metadata.capability;
  }

  supportsCapability(flag: CapabilityFlag): boolean {
    const c = this.metadata.capability;
    switch (flag) {
      case "negativePrompt":
        return c.supportsNegativePrompt;
      case "seed":
        return c.supportsSeed;
      case "imageToVideo":
        return c.supportsImageToVideo;
      case "image":
        return c.assetTypes.includes("image");
      case "video":
        return c.assetTypes.includes("video");
    }
  }

  /** Clamp/clean a request to this provider's capability. Deterministic. */
  normalizeRequest(request: GenerationRequest): GenerationRequest {
    const c = this.metadata.capability;
    const aspectRatio: AspectRatio = c.aspectRatios.includes(request.aspectRatio)
      ? request.aspectRatio
      : c.aspectRatios[0];
    const batch = Math.min(Math.max(request.batch ?? 1, 1), c.maxBatch);

    let durationSec: number | undefined;
    if (request.assetType === "video") {
      const requested = request.durationSec ?? c.maxDurationSec ?? 5;
      durationSec = c.maxDurationSec
        ? Math.min(requested, c.maxDurationSec)
        : requested;
    }

    return {
      providerId: this.metadata.id,
      assetType: request.assetType,
      prompt: request.prompt.trim(),
      aspectRatio,
      batch,
      durationSec,
      negativePrompt: c.supportsNegativePrompt ? request.negativePrompt : undefined,
      seed: c.supportsSeed ? request.seed : undefined,
    };
  }

  /** Map a provider-agnostic outcome to a GenerationResult. No fabricated media. */
  normalizeResponse(outcome: RawProviderOutcome): GenerationResult {
    return {
      jobId: outcome.jobId,
      providerId: this.metadata.id,
      status: outcome.status,
      assets: outcome.assets ?? [],
      error: outcome.error,
    };
  }

  validatePrompt(prompt: string): ValidationResult {
    return validatePromptText(prompt);
  }

  validateAspectRatio(aspectRatio: AspectRatio): ValidationResult {
    return validateAspectRatioFor(aspectRatio, this.metadata);
  }

  /** Full request validation against this provider. */
  validate(request: GenerationRequest): ValidationResult {
    return validateRequest(this.metadata, request);
  }

  estimateCost(request: GenerationRequest): CostEstimate {
    const assetType: AssetType = request.assetType;
    const credits =
      assetType === "video"
        ? estimateVideoCredits(request, this.costWeight)
        : estimateImageCredits(request, this.costWeight);
    return { assetType, credits, unit: "relative" };
  }

  estimateDuration(request: GenerationRequest): DurationEstimate {
    return {
      seconds: estimateExpectedDuration(request, this.costWeight),
      unit: "relative",
    };
  }
}
