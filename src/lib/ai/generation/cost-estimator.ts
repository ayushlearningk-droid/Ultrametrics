/**
 * AI Generation Engine — cost & duration estimator (Sprint 53).
 *
 * Pure, deterministic RELATIVE estimates only — no pricing, no currency, no I/O.
 * "Credits" are unitless relative effort indicators used to compare requests and
 * providers; "seconds" are relative expected-processing estimates, not SLAs.
 */

import type { AssetType, GenerationRequest } from "./types";

export interface CostEstimate {
  assetType: AssetType;
  /** Relative effort indicator (unitless). Not a price. */
  credits: number;
  unit: "relative";
}

export interface DurationEstimate {
  /** Relative expected processing time. Not a guarantee. */
  seconds: number;
  unit: "relative";
}

/** Relative image credits: scales with batch and a per-provider weight. */
export function estimateImageCredits(
  request: GenerationRequest,
  weight: number
): number {
  const batch = Math.max(request.batch ?? 1, 1);
  return Math.round(weight * batch * 10);
}

/** Relative video credits: scales with duration, batch, and weight. */
export function estimateVideoCredits(
  request: GenerationRequest,
  weight: number
): number {
  const batch = Math.max(request.batch ?? 1, 1);
  const seconds = Math.max(request.durationSec ?? 5, 1);
  return Math.round(weight * seconds * batch * 10);
}

/** Relative expected processing time, deterministic from the request shape. */
export function estimateExpectedDuration(
  request: GenerationRequest,
  weight: number
): number {
  const batch = Math.max(request.batch ?? 1, 1);
  if (request.assetType === "video") {
    const seconds = Math.max(request.durationSec ?? 5, 1);
    return Math.round(weight * seconds * batch * 6);
  }
  return Math.round(weight * batch * 2);
}
