/**
 * AI Generation Engine — provider interface (Sprint 52, architecture only).
 *
 * The contract every future image/video provider adapter MUST implement. This
 * sprint declares the interface only — there is NO implementation, NO API call,
 * and NO media generation. Provider placeholder files expose metadata only.
 */

import type {
  GenerationProvider,
  GenerationRequest,
  GenerationResult,
  ProviderCapability,
  ProviderHealth,
  ValidationResult,
} from "./types";

export interface GenerationProviderAdapter {
  /** Static, serializable metadata for the registry. */
  readonly metadata: GenerationProvider;

  /** Declared capabilities (mirrors metadata.capability). */
  capabilities(): ProviderCapability;

  /** Pure validation of a request against this provider's capability. */
  validate(request: GenerationRequest): ValidationResult;

  /** Liveness/credentials probe (future — no network this sprint). */
  health(): Promise<ProviderHealth>;

  /** Execute a generation (future — no network this sprint). */
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

/**
 * Pure, reusable request validator usable by any adapter's `validate()`.
 * Checks the request against declared capability — no I/O.
 */
export function validateAgainstCapability(
  request: GenerationRequest,
  capability: ProviderCapability
): ValidationResult {
  const errors: string[] = [];

  if (!request.prompt.trim()) errors.push("Prompt is required.");
  if (!capability.assetTypes.includes(request.assetType)) {
    errors.push(`Asset type "${request.assetType}" is not supported.`);
  }
  if (!capability.aspectRatios.includes(request.aspectRatio)) {
    errors.push(`Aspect ratio "${request.aspectRatio}" is not supported.`);
  }
  if (request.assetType === "video" && typeof request.durationSec === "number") {
    if (
      typeof capability.maxDurationSec === "number" &&
      request.durationSec > capability.maxDurationSec
    ) {
      errors.push(`Duration exceeds max of ${capability.maxDurationSec}s.`);
    }
  }
  if (typeof request.batch === "number" && request.batch > capability.maxBatch) {
    errors.push(`Batch exceeds max of ${capability.maxBatch}.`);
  }
  if (request.negativePrompt && !capability.supportsNegativePrompt) {
    errors.push("Negative prompt is not supported.");
  }
  if (typeof request.seed === "number" && !capability.supportsSeed) {
    errors.push("Seed is not supported.");
  }

  return { ok: errors.length === 0, errors };
}
