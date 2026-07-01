/**
 * Studio generation execution route (Sprint 64M) — SERVER ONLY.
 *
 * The single place real provider execution happens. The client sends routed
 * requests (provider already selected via the orchestrator); this route reads the
 * API key from the environment and executes. OpenAI Images is the first live
 * provider; every other provider reuses executeProvider() (structured error until
 * wired). Keys never leave the server; the route always returns normalized
 * ExecutionResults and never crashes.
 *
 * FUTURE: Redis/BullMQ/Railway workers enqueue + process these jobs; Supabase
 * Storage persists produced media. They wrap the per-job execution below.
 */

import { NextResponse } from "next/server";
import { createDefaultAdapterRegistry } from "@/lib/ai/generation/adapter-registry";
import { executeProvider, type ExecutionResult } from "@/lib/ai/generation/execute-provider";
import { executeOpenAIImage, type OpenAIExecOptions } from "@/lib/ai/generation/execute-openai";
import { persistAsset } from "@/lib/ai/generation/persist-asset";
import type { GenerationRequest } from "@/lib/ai/generation/types";

export const runtime = "nodejs";

const registry = createDefaultAdapterRegistry();

interface RouteJob {
  id: string;
  providerId: string;
  request: GenerationRequest;
  options?: OpenAIExecOptions;
}

async function executeJob(job: RouteJob, apiKey: string | null): Promise<{ id: string; result: ExecutionResult }> {
  const adapter = registry.get(job.providerId);
  if (!adapter) {
    return {
      id: job.id,
      result: { ok: false, providerId: job.providerId, error: { code: "no_provider", message: `Unknown provider "${job.providerId}".` }, cost: 0, latencyMs: 0, generationTimeMs: 0 },
    };
  }
  const cost = adapter.estimateCost(job.request).credits;
  const latencyMs = adapter.estimateDuration(job.request).seconds * 1000;

  // OpenAI Images — the first live provider (Sprint 64M).
  if (job.providerId === "openai") {
    if (!apiKey) {
      return {
        id: job.id,
        result: { ok: false, providerId: "openai", error: { code: "missing_api_key", message: "OPENAI_API_KEY is not configured." }, cost, latencyMs, generationTimeMs: 0 },
      };
    }
    const result = await executeOpenAIImage(job.request, job.options ?? {}, apiKey, cost, latencyMs);
    // Persist the produced asset to Supabase Storage → permanent URL (Sprint 64N).
    // Falls back to the provider URL if persistence fails; metadata is preserved.
    if (result.ok && result.asset?.url) {
      const mimeType = result.asset.type === "video" ? "video/mp4" : "image/png";
      const persisted = await persistAsset(result.asset.url, job.id, mimeType);
      result.asset = { ...result.asset, url: persisted.url };
    }
    return { id: job.id, result };
  }

  // Every other provider reuses executeProvider() — structured error until wired.
  return { id: job.id, result: executeProvider(adapter, job.request) };
}

export async function POST(req: Request) {
  let body: { requests?: RouteJob[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  const jobs = Array.isArray(body.requests) ? body.requests : [];
  const apiKey = process.env.OPENAI_API_KEY ?? null;

  try {
    const results = await Promise.all(jobs.map((job) => executeJob(job, apiKey)));
    return NextResponse.json({ results });
  } catch {
    // Defensive: never crash — surface a structured error per job.
    const results = jobs.map((job) => ({
      id: job.id,
      result: { ok: false, providerId: job.providerId, error: { code: "provider_error", message: "Execution failed." }, cost: 0, latencyMs: 0, generationTimeMs: 0 } as ExecutionResult,
    }));
    return NextResponse.json({ results });
  }
}
