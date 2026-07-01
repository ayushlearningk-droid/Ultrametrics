/**
 * Generation execution state (Sprint 64.1 — P0.2).
 *
 * The execution-state model the Generation Store carries so it can support REAL
 * async provider execution later. This sprint adds the SHAPE and pure derivation
 * only — no executor, no providers, no timers, no fake progress. Every value is
 * either an honest initial state ("queued", progress 0) or derived purely from
 * per-asset state. The store remains the single source of truth.
 */

export type ExecutionStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

/** Human label per execution status (shared by every consuming surface). */
export const EXECUTION_LABEL: Record<ExecutionStatus, string> = {
  queued: "Queued",
  running: "Generating",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Execution state for a single generated asset. Optional URLs until produced. */
export interface AssetExecution {
  status: ExecutionStatus;
  /** 0–100. 0 while queued; only a real executor advances this. */
  progress: number;
  /** Provider id that (will) produce this asset — set by the executor. */
  provider?: string;
  startedAt?: number;
  completedAt?: number;
  /** Real produced media — undefined until a provider returns it (no placeholders). */
  mediaUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  /** Why routing fell back off the preferred provider, if it did (Sprint 64D). */
  fallbackReason?: string;
  /** Routing confidence 0–1 (Sprint 64D). */
  routingConfidence?: number;
  /* ── Real provider execution metadata (Sprint 64L) — from the store only ── */
  /** Structured error code when execution failed. */
  errorCode?: string;
  /** Relative latency (ms). */
  latencyMs?: number;
  /** Relative cost (credits). */
  cost?: number;
  seed?: number;
  /** e.g. "1024x1024". */
  resolution?: string;
  /** e.g. "image/png" / "video/mp4". */
  mimeType?: string;
  /** Relative generation time (ms). */
  generationTimeMs?: number;
}

/** Execution summary for the whole generation. Derived from the asset states. */
export interface GenerationExecution {
  status: ExecutionStatus;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  /** Asset id currently executing, or null. */
  currentJobId: string | null;
  /** 0–100 overall (mean of per-asset progress). */
  progress: number;
}

/** Honest initial per-asset execution: queued, nothing produced. */
export function initialAssetExecution(): AssetExecution {
  return { status: "queued", progress: 0 };
}

/** Honest initial generation execution: all jobs queued, no progress. */
export function initialGenerationExecution(totalJobs: number): GenerationExecution {
  return {
    status: totalJobs === 0 ? "completed" : "queued",
    totalJobs,
    completedJobs: 0,
    failedJobs: 0,
    currentJobId: null,
    progress: 0,
  };
}

/**
 * Derive the generation-level execution summary from per-asset execution states.
 * Pure and deterministic — no timers, no fabricated progress.
 */
export function deriveGenerationExecution(
  assets: { execution?: AssetExecution }[],
  currentJobId: string | null
): GenerationExecution {
  const totalJobs = assets.length;
  let completedJobs = 0;
  let failedJobs = 0;
  let cancelledJobs = 0;
  let running = 0;
  let progressSum = 0;

  for (const a of assets) {
    const ex = a.execution ?? { status: "queued" as ExecutionStatus, progress: 0 };
    if (ex.status === "completed") completedJobs += 1;
    else if (ex.status === "failed") failedJobs += 1;
    else if (ex.status === "cancelled") cancelledJobs += 1;
    else if (ex.status === "running") running += 1;
    progressSum += ex.progress;
  }

  const finished = completedJobs + failedJobs + cancelledJobs;
  let status: ExecutionStatus;
  if (totalJobs === 0) status = "completed";
  else if (running > 0) status = "running";
  else if (finished === totalJobs) status = completedJobs > 0 ? "completed" : failedJobs > 0 ? "failed" : "cancelled";
  else if (finished > 0) status = "running";
  else status = "queued";

  const progress = totalJobs === 0 ? 0 : Math.round(progressSum / totalJobs);

  return { status, totalJobs, completedJobs, failedJobs, currentJobId, progress };
}
