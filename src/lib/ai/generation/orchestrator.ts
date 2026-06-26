/**
 * AI Generation Orchestrator (Sprint 54).
 *
 * A pure orchestration layer over the Sprint 52/53 foundation. It selects the
 * best provider for a request (capability + aspect-ratio + image/video matching,
 * with cost-/quality-/balanced-aware routing), plans batched requests, and
 * builds a queue plan. It NEVER executes, calls a provider/SDK, or generates
 * media — planning only. Deterministic: same input → same plan. No I/O.
 */

import type { AdapterRegistry } from "./adapter-registry";
import type { BaseGenerationAdapter } from "./adapters/base-adapter";
import type {
  AssetType,
  GenerationJob,
  GenerationRequest,
  ValidationResult,
} from "./types";
import type { CostEstimate, DurationEstimate } from "./cost-estimator";
import type { GenerationQueue } from "./queue";

export type RoutingStrategy = "cost" | "quality" | "balanced";

export interface OrchestratorOptions {
  strategy?: RoutingStrategy;
  /** Force a provider when it is compatible; otherwise normal routing applies. */
  preferredProviderId?: string;
}

/** Orchestrator-owned quality policy (relative, not a benchmark). */
const IMAGE_QUALITY: Record<string, number> = {
  imagen: 9,
  openai: 8,
  flux: 7,
  recraft: 7,
  ideogram: 6,
};
const VIDEO_QUALITY: Record<string, number> = {
  veo: 9,
  runway: 8,
  kling: 8,
  luma: 6,
  pika: 6,
};

function qualityOf(providerId: string, assetType: AssetType): number {
  const map = assetType === "video" ? VIDEO_QUALITY : IMAGE_QUALITY;
  return map[providerId] ?? 5;
}

export interface ProviderCandidate {
  providerId: string;
  assetType: AssetType;
  cost: CostEstimate;
  duration: DurationEstimate;
  qualityRank: number;
  /** Higher = preferred under the active strategy. */
  score: number;
  /** Registry order, used as a stable tiebreak. */
  order: number;
}

export interface SelectionResult {
  ok: boolean;
  /** The request normalized to the chosen provider (or input when none). */
  request: GenerationRequest;
  chosen: ProviderCandidate | null;
  candidates: ProviderCandidate[];
  validation: ValidationResult;
  reason: string;
}

/** True when an adapter can serve the request's asset type AND aspect ratio. */
function isCompatible(
  adapter: BaseGenerationAdapter,
  request: GenerationRequest
): boolean {
  const cap = adapter.capabilities();
  return (
    cap.assetTypes.includes(request.assetType) &&
    cap.aspectRatios.includes(request.aspectRatio)
  );
}

function scoreFor(
  strategy: RoutingStrategy,
  credits: number,
  qualityRank: number
): number {
  switch (strategy) {
    case "cost":
      // Cheaper is better → invert credits.
      return 100000 - credits;
    case "quality":
      return qualityRank;
    case "balanced":
      // Quality per unit cost (credits always ≥ 1 here).
      return Math.round((qualityRank * 1000) / Math.max(credits, 1));
  }
}

/** Rank every compatible provider for a request under a strategy. */
export function rankProviders(
  registry: AdapterRegistry,
  request: GenerationRequest,
  strategy: RoutingStrategy = "balanced"
): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];
  registry.list().forEach((adapter, order) => {
    if (!isCompatible(adapter, request)) return;
    const normalized = adapter.normalizeRequest(request);
    const cost = adapter.estimateCost(normalized);
    const duration = adapter.estimateDuration(normalized);
    const qualityRank = qualityOf(adapter.metadata.id, request.assetType);
    candidates.push({
      providerId: adapter.metadata.id,
      assetType: request.assetType,
      cost,
      duration,
      qualityRank,
      score: scoreFor(strategy, cost.credits, qualityRank),
      order,
    });
  });

  return candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Deterministic tiebreaks: higher quality, then lower cost, then order.
    if (b.qualityRank !== a.qualityRank) return b.qualityRank - a.qualityRank;
    if (a.cost.credits !== b.cost.credits) return a.cost.credits - b.cost.credits;
    return a.order - b.order;
  });
}

/** Select the best provider for a request (capability + strategy aware). */
export function selectProvider(
  registry: AdapterRegistry,
  request: GenerationRequest,
  options: OrchestratorOptions = {}
): SelectionResult {
  const strategy = options.strategy ?? "balanced";
  const candidates = rankProviders(registry, request, strategy);

  // Preferred provider wins when it is among the compatible candidates.
  let chosen: ProviderCandidate | null = null;
  if (options.preferredProviderId) {
    chosen = candidates.find((c) => c.providerId === options.preferredProviderId) ?? null;
  }
  if (!chosen) chosen = candidates[0] ?? null;

  if (!chosen) {
    return {
      ok: false,
      request,
      chosen: null,
      candidates,
      validation: {
        ok: false,
        errors: ["No provider supports the requested asset type and aspect ratio."],
      },
      reason: `No ${request.assetType} provider supports aspect ratio ${request.aspectRatio}.`,
    };
  }

  const adapter = registry.get(chosen.providerId)!;
  const normalized = adapter.normalizeRequest(request);
  const validation = adapter.validate(normalized);

  return {
    ok: validation.ok,
    request: normalized,
    chosen,
    candidates,
    validation,
    reason: `Selected ${chosen.providerId} via ${strategy} routing (${chosen.cost.credits} credits, quality ${chosen.qualityRank}).`,
  };
}

/** Split a request into provider-sized batches (≤ provider maxBatch each). */
export function planBatch(
  adapter: BaseGenerationAdapter,
  request: GenerationRequest
): GenerationRequest[] {
  const maxBatch = Math.max(adapter.capabilities().maxBatch, 1);
  const total = Math.max(request.batch ?? 1, 1);
  const chunks: GenerationRequest[] = [];
  let remaining = total;
  while (remaining > 0) {
    const n = Math.min(remaining, maxBatch);
    chunks.push(adapter.normalizeRequest({ ...request, batch: n }));
    remaining -= n;
  }
  return chunks;
}

export interface PlannedJob {
  id: string;
  providerId: string;
  request: GenerationRequest;
  cost: CostEstimate;
  duration: DurationEstimate;
}

export interface OrchestrationPlan {
  jobs: PlannedJob[];
  /** Requests that could not be routed (with the reason). */
  unroutable: { request: GenerationRequest; reason: string }[];
  totalCredits: number;
  estimatedSeconds: number;
}

/**
 * Build a deterministic queue PLAN for a set of requests. Selects a provider per
 * request, splits batches, and produces planned jobs with relative cost/time —
 * it does NOT enqueue or execute anything.
 */
export function planQueue(
  registry: AdapterRegistry,
  requests: GenerationRequest[],
  options: OrchestratorOptions = {}
): OrchestrationPlan {
  const jobs: PlannedJob[] = [];
  const unroutable: OrchestrationPlan["unroutable"] = [];
  let counter = 0;
  let totalCredits = 0;
  let estimatedSeconds = 0;

  for (const request of requests) {
    const selection = selectProvider(registry, request, options);
    if (!selection.chosen) {
      unroutable.push({ request, reason: selection.reason });
      continue;
    }
    const adapter = registry.get(selection.chosen.providerId)!;
    // Split on the ORIGINAL requested batch (selection.request is clamped to the
    // provider's maxBatch); planBatch normalizes each chunk itself.
    const routed: GenerationRequest = { ...request, providerId: adapter.metadata.id };
    for (const chunk of planBatch(adapter, routed)) {
      const cost = adapter.estimateCost(chunk);
      const duration = adapter.estimateDuration(chunk);
      jobs.push({
        id: `plan-${counter++}`,
        providerId: adapter.metadata.id,
        request: chunk,
        cost,
        duration,
      });
      totalCredits += cost.credits;
      estimatedSeconds += duration.seconds;
    }
  }

  return { jobs, unroutable, totalCredits, estimatedSeconds };
}

/**
 * Materialize a plan into a queue as `queued` jobs (queue planning only — no
 * transitions, no execution). Returns the enqueued jobs in plan order.
 */
export function materializePlan(
  plan: OrchestrationPlan,
  queue: GenerationQueue
): GenerationJob[] {
  return plan.jobs.map((j) => queue.enqueue(j.request));
}
