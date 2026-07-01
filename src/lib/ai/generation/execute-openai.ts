/**
 * OpenAI Images execution adapter (Sprint 64M) — SERVER ONLY.
 *
 * Performs the real OpenAI Images API call and normalizes the response into an
 * ExecutionResult (a real GeneratedAsset on success, a structured error on
 * failure). The API key is passed in from the server route (read from env there);
 * it is never referenced on the client. Never throws — all failures become
 * structured execution errors.
 */

import type { GenerationRequest } from "./types";
import type { ExecutionResult } from "./execute-provider";

const OPENAI_URL = "https://api.openai.com/v1/images/generations";

export interface OpenAIExecOptions {
  /** "standard" | "hd" (dall-e-3). Defaults to "standard". */
  quality?: string;
  /** Brand asset labels folded into the prompt for on-brand generation. */
  brandAssets?: string[];
  /** Count of uploaded reference images (context only; generations endpoint is text-to-image). */
  referenceCount?: number;
}

/** Map the request aspect ratio to a supported gpt-image-1 size. */
function sizeFor(aspectRatio: string): { size: string; width: number; height: number } {
  switch (aspectRatio) {
    case "16:9":
      return { size: "1536x1024", width: 1536, height: 1024 };
    case "9:16":
      return { size: "1024x1536", width: 1024, height: 1536 };
    default:
      return { size: "1024x1024", width: 1024, height: 1024 };
  }
}

export async function executeOpenAIImage(
  request: GenerationRequest,
  options: OpenAIExecOptions,
  apiKey: string,
  cost: number,
  latencyMs: number
): Promise<ExecutionResult> {
  const started = Date.now();
  const { size, width, height } = sizeFor(request.aspectRatio);
  const brand = options.brandAssets && options.brandAssets.length > 0 ? ` (on-brand for ${options.brandAssets.join(", ")})` : "";
  const prompt = `${request.prompt}${brand}`.slice(0, 4000);
  // gpt-image-1 quality is low|medium|high|auto (not dall-e-3's standard|hd).
  const quality = options.quality === "hd" ? "high" : "medium";

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      // gpt-image-1 is the current officially supported image model. It ignores
      // `response_format` and always returns base64 (b64_json) — no hosted URL.
      body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size, quality }),
    });
    const generationTimeMs = Date.now() - started;

    if (!res.ok) {
      let message = `OpenAI error ${res.status}`;
      try {
        const err = await res.json();
        message = err?.error?.message ?? message;
      } catch {
        /* ignore parse error */
      }
      return { ok: false, providerId: "openai", error: { code: "provider_error", message }, cost, latencyMs, generationTimeMs };
    }

    const json = await res.json();
    // gpt-image-1 returns base64; wrap it as a data URL so the normalized output
    // (asset.url string) is identical downstream — persistAsset uploads it to
    // Supabase Storage and returns the permanent URL, exactly as before.
    const b64: string | undefined = json?.data?.[0]?.b64_json;
    const url = b64 ? `data:image/png;base64,${b64}` : (json?.data?.[0]?.url as string | undefined);
    if (!url) {
      return { ok: false, providerId: "openai", error: { code: "provider_error", message: "OpenAI returned no image data." }, cost, latencyMs, generationTimeMs };
    }

    return { ok: true, providerId: "openai", asset: { type: "image", url, width, height }, cost, latencyMs, generationTimeMs, seed: request.seed };
  } catch (e) {
    return {
      ok: false,
      providerId: "openai",
      error: { code: "provider_error", message: e instanceof Error ? e.message : "OpenAI request failed." },
      cost,
      latencyMs,
      generationTimeMs: Date.now() - started,
    };
  }
}
