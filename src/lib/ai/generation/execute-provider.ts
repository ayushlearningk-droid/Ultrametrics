/**
 * Generic provider execution (Sprint 64L).
 *
 * `executeProvider()` is the single execution path every provider goes through.
 * It normalizes the outcome into an `ExecutionResult` (a real `GeneratedAsset` on
 * success, or a structured error). Providers are disabled by default, so with no
 * live provider + no API key this returns a structured error — no fake output, no
 * placeholder asset, no crash. Deterministic and synchronous for now.
 *
 * FUTURE INTEGRATION POINT: the real HTTP request (server-side), response
 * normalization, and Supabase Storage upload plug in at the marked section.
 * Redis / BullMQ / Railway workers wrap this call when execution becomes async.
 */

import type { BaseGenerationAdapter } from "./adapters/base-adapter";
import type { GeneratedAsset, GenerationRequest } from "./types";
import { getProviderSecret } from "./secrets";

export interface ExecutionError {
  code: "provider_disabled" | "missing_api_key" | "execution_unavailable" | "no_provider" | "provider_error";
  message: string;
}

export interface ExecutionResult {
  ok: boolean;
  providerId: string;
  /** Present only on success — a REAL asset (no placeholders). */
  asset?: GeneratedAsset;
  /** Structured error on failure. */
  error?: ExecutionError;
  /** Relative latency estimate (ms) from the adapter — not a wall-clock time. */
  latencyMs: number;
  /** Relative cost (credits) from the adapter. */
  cost: number;
  seed?: number;
  /** Relative generation time (ms) — mirrors latency until real timing exists. */
  generationTimeMs: number;
}

/**
 * Execute one request against a provider adapter. Deterministic; no network yet.
 * Real execution is gated on a live provider AND a configured API key.
 */
export function executeProvider(adapter: BaseGenerationAdapter, request: GenerationRequest): ExecutionResult {
  const meta = adapter.metadata;
  const cost = adapter.estimateCost(request).credits;
  const latencyMs = adapter.estimateDuration(request).seconds * 1000;
  const base = { providerId: meta.id, cost, latencyMs, generationTimeMs: latencyMs, seed: request.seed };

  // Every provider is disabled by default — no live execution wired.
  if (meta.executionMode !== "live") {
    return { ...base, ok: false, error: { code: "provider_disabled", message: `Provider "${meta.id}" is not enabled for live execution.` } };
  }

  // Missing API key → structured error (never crash, never expose a key).
  const secret = getProviderSecret(meta.id);
  if (!secret.apiKey) {
    return { ...base, ok: false, error: { code: "missing_api_key", message: `Missing API key for provider "${meta.id}".` } };
  }

  // ── FUTURE INTEGRATION POINT ──────────────────────────────────────────────
  // Real HTTP request to the provider goes here (server-side). Normalize the
  // response to a GeneratedAsset { type, url, width, height }, upload media to
  // Supabase Storage, and return { ok: true, asset, ... }. Redis/BullMQ/Railway
  // workers wrap this call when execution becomes async. No fake output is
  // produced until this is implemented.
  return { ...base, ok: false, error: { code: "execution_unavailable", message: `Live execution for "${meta.id}" is not available in this build.` } };
}
