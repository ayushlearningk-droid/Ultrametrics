/**
 * Generation Executor — execution spine (Sprint 64.2 · live OpenAI since 64M).
 *
 * Selects a provider per creative via the existing orchestrator (preference +
 * fallback), marks each asset "running", then executes them on the SERVER route
 * (/api/studio/generate) — the client never calls a provider or sees a key. As
 * server results arrive, each asset is updated to "completed" (real asset URL +
 * metadata) or "failed" (structured error). The Generation Store is the single
 * source of truth and advances in real time (no timers, no placeholders).
 *
 * FUTURE: Redis/BullMQ/Railway workers back the route; Supabase Storage persists
 * media. This client loop is unchanged when that lands.
 */

import { createDefaultAdapterRegistry } from "@/lib/ai/generation/adapter-registry";
import { selectLiveProvider } from "@/lib/ai/generation/live-routing";
import type { ExecutionResult } from "@/lib/ai/generation/execute-provider";
import type { AspectRatio, AssetType, GenerationRequest } from "@/lib/ai/generation/types";
import type { PlatformId } from "@/components/studio/media";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import type { GenerationResult } from "./generation-runtime";
import { setAssetExecution, setCurrentJob } from "./generation-store";

const registry = createDefaultAdapterRegistry();

const ASPECT_BY_PLATFORM: Record<PlatformId, AspectRatio> = {
  reels: "9:16",
  tiktok: "9:16",
  shorts: "9:16",
  meta: "1:1",
  youtube: "16:9",
};

function buildRequest(creative: CreativeItem): GenerationRequest {
  const assetType: AssetType = creative.media.kind === "video" ? "video" : "image";
  return {
    providerId: "",
    assetType,
    prompt: creative.title,
    aspectRatio: ASPECT_BY_PLATFORM[creative.platform] ?? "1:1",
    durationSec: assetType === "video" ? 15 : undefined,
    batch: 1,
  };
}

interface Job {
  id: string;
  providerId: string;
  request: GenerationRequest;
  fallbackReason?: string;
  routingConfidence: number;
  startedAt: number;
}

/**
 * Execute a generation against the server route and record it in the store.
 * Async: assets go queued → running → (completed | failed) in real time.
 */
export async function executeGeneration(result: GenerationResult): Promise<void> {
  const creatives = result.creatives;
  if (creatives.length === 0) return;

  const preferred = result.input.providerPreference ?? undefined;
  const options = {
    brandAssets: (result.input.brandAssets ?? []).map((a) => a.label),
    referenceCount: result.input.referenceImages?.length ?? 0,
  };

  const jobs: Job[] = [];
  creatives.forEach((creative) => {
    const request = buildRequest(creative);
    // Live Provider Routing (Sprint 64P): filter to executable/live providers,
    // then rank. No live provider → honest structured error (no disabled fallback).
    const selection = selectLiveProvider(registry, request, { preferredProviderId: preferred });
    if (!selection.ok || !selection.providerId) {
      setAssetExecution(creative.id, { status: "failed", progress: 0, error: selection.reason, errorCode: selection.errorCode ?? "no_live_provider_available" });
      return;
    }
    const providerId = selection.providerId;

    let fallbackReason: string | undefined;
    let routingConfidence: number;
    if (preferred && providerId !== preferred) {
      fallbackReason = `Preferred provider "${preferred}" is not live for ${request.assetType} · ${request.aspectRatio}; routed to live provider "${providerId}".`;
      routingConfidence = 0.6;
    } else if (preferred) {
      routingConfidence = 1;
    } else {
      routingConfidence = 0.85;
    }

    const startedAt = Date.now();
    setCurrentJob(creative.id);
    setAssetExecution(creative.id, { status: "running", progress: 0, provider: providerId, startedAt, fallbackReason, routingConfidence });
    jobs.push({ id: creative.id, providerId, request: selection.request, fallbackReason, routingConfidence, startedAt });
  });

  if (jobs.length === 0) {
    setCurrentJob(null);
    return;
  }

  const markFailed = (job: Job, message: string, code: string, out?: ExecutionResult) =>
    setAssetExecution(job.id, {
      status: "failed",
      progress: 0,
      provider: job.providerId,
      startedAt: job.startedAt,
      completedAt: Date.now(),
      fallbackReason: job.fallbackReason,
      routingConfidence: job.routingConfidence,
      error: message,
      errorCode: code,
      latencyMs: out?.latencyMs,
      cost: out?.cost,
    });

  try {
    const res = await fetch("/api/studio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: jobs.map((j) => ({ id: j.id, providerId: j.providerId, request: j.request, options })),
      }),
    });
    const data: { results: { id: string; result: ExecutionResult }[] } = await res.json();
    const byId = new Map(data.results.map((r) => [r.id, r.result]));

    for (const job of jobs) {
      const out = byId.get(job.id);
      if (out?.ok && out.asset?.url) {
        const asset = out.asset;
        const resolution = asset.width != null && asset.height != null ? `${asset.width}x${asset.height}` : undefined;
        const mimeType = asset.type === "video" ? "video/mp4" : "image/png";
        setAssetExecution(job.id, {
          status: "completed",
          progress: 100,
          provider: job.providerId,
          startedAt: job.startedAt,
          completedAt: Date.now(),
          fallbackReason: job.fallbackReason,
          routingConfidence: job.routingConfidence,
          mediaUrl: asset.url ?? undefined,
          thumbnailUrl: asset.url ?? undefined,
          latencyMs: out.latencyMs,
          cost: out.cost,
          seed: out.seed,
          resolution,
          mimeType,
          generationTimeMs: out.generationTimeMs,
        });
      } else {
        markFailed(job, out?.error?.message ?? "Execution failed.", out?.error?.code ?? "provider_error", out);
      }
    }
  } catch (e) {
    for (const job of jobs) markFailed(job, e instanceof Error ? e.message : "Execution request failed.", "provider_error");
  } finally {
    setCurrentJob(null);
  }
}
