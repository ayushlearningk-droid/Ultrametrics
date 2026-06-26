/**
 * AI Generation Engine — validation engine (Sprint 53).
 *
 * Pure validation helpers: prompt, aspect ratio, capability, and full
 * provider-compatibility checks. Reuses the Sprint-52 capability validator. No
 * I/O, no execution.
 */

import type {
  AspectRatio,
  GenerationProvider,
  GenerationRequest,
  ValidationResult,
} from "./types";
import { validateAgainstCapability } from "./provider";

const MAX_PROMPT_LEN = 2000;

export function validatePromptText(prompt: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = prompt.trim();
  if (!trimmed) errors.push("Prompt is required.");
  if (trimmed.length > MAX_PROMPT_LEN) {
    errors.push(`Prompt exceeds ${MAX_PROMPT_LEN} characters.`);
  }
  return { ok: errors.length === 0, errors };
}

export function validateAspectRatioFor(
  aspectRatio: AspectRatio,
  provider: GenerationProvider
): ValidationResult {
  const ok = provider.capability.aspectRatios.includes(aspectRatio);
  return {
    ok,
    errors: ok ? [] : [`Aspect ratio "${aspectRatio}" is not supported.`],
  };
}

/** Provider compatibility: asset type + capability checks for this provider. */
export function validateProviderCompatibility(
  provider: GenerationProvider,
  request: GenerationRequest
): ValidationResult {
  const errors: string[] = [];
  if (request.providerId !== provider.id) {
    errors.push(
      `Request targets "${request.providerId}" but provider is "${provider.id}".`
    );
  }
  const cap = validateAgainstCapability(request, provider.capability);
  errors.push(...cap.errors);
  return { ok: errors.length === 0, errors };
}

/** Aggregate validation: prompt + aspect ratio + provider compatibility. */
export function validateRequest(
  provider: GenerationProvider,
  request: GenerationRequest
): ValidationResult {
  const errors: string[] = [
    ...validatePromptText(request.prompt).errors,
    ...validateAspectRatioFor(request.aspectRatio, provider).errors,
    ...validateProviderCompatibility(provider, request).errors,
  ];
  // De-duplicate so the same issue isn't reported twice.
  const unique = [...new Set(errors)];
  return { ok: unique.length === 0, errors: unique };
}
