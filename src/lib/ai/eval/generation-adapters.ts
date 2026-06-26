/**
 * AI Evaluation Suite — Generation Adapter layer checks (Sprint 53).
 *
 * Deterministic property checks over the adapter layer: registry/lookup,
 * request normalization, validation, capability detection, relative cost/
 * duration estimation, and determinism. Pure — no I/O, no API calls, no media.
 */

import {
  createDefaultAdapterRegistry,
  type GenerationRequest,
} from "../generation";

export interface AdapterCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface AdapterSummary {
  total: number;
  passed: number;
  failed: number;
  results: AdapterCheck[];
}

function check(name: string, pass: boolean, detail: string): AdapterCheck {
  return { name, pass, detail };
}

function req(
  providerId: string,
  assetType: "image" | "video",
  over: Partial<GenerationRequest> = {}
): GenerationRequest {
  return {
    providerId,
    assetType,
    prompt: "A grounded product hero shot",
    aspectRatio: assetType === "video" ? "16:9" : "1:1",
    ...(assetType === "video" ? { durationSec: 5 } : {}),
    ...over,
  };
}

export function runGenerationAdapterEvaluation(): AdapterSummary {
  const results: AdapterCheck[] = [];
  const registry = createDefaultAdapterRegistry();
  const adapters = registry.list();

  // 1. Registry: 10 adapters, unique ids, lookup works.
  {
    const ids = adapters.map((a) => a.metadata.id);
    const unique = new Set(ids).size === ids.length;
    const lookup = registry.get("flux")?.metadata.id === "flux" && registry.get("x") === undefined;
    results.push(
      check("Registry: 10 unique adapters + lookup", adapters.length === 10 && unique && lookup, `n=${adapters.length}`)
    );
  }

  // 2. Normalization: clamps batch, fixes aspect ratio, strips unsupported fields.
  {
    const luma = registry.get("luma")!; // video, no negativePrompt support
    const n = luma.normalizeRequest(
      req("luma", "video", {
        aspectRatio: "21:9", // unsupported → first supported
        batch: 9, // > maxBatch(1) → clamped
        durationSec: 99, // > maxDuration(5) → clamped
        negativePrompt: "blurry", // unsupported → dropped
        seed: 7,
        prompt: "  spaced  ",
      })
    );
    const ok =
      n.aspectRatio === luma.metadata.capability.aspectRatios[0] &&
      n.batch === 1 &&
      n.durationSec === 5 &&
      n.negativePrompt === undefined &&
      n.prompt === "spaced";
    results.push(check("Normalize: clamps + strips per capability", ok, `ar=${n.aspectRatio} batch=${n.batch} dur=${n.durationSec}`));
  }

  // 3. Validation: empty prompt + unsupported aspect ratio fail; valid passes.
  {
    const flux = registry.get("flux")!;
    const good = flux.validate(req("flux", "image"));
    const bad = flux.validate(req("flux", "image", { prompt: "", aspectRatio: "21:9" }));
    results.push(
      check("Validation: aggregates prompt + aspect + capability errors", good.ok && !bad.ok && bad.errors.length >= 2, `errors=${bad.errors.length}`)
    );
  }

  // 4. Capability detection: flags match metadata.
  {
    const runway = registry.get("runway")!;
    const openai = registry.get("openai")!;
    const ok =
      runway.supportsCapability("video") &&
      runway.supportsCapability("imageToVideo") &&
      openai.supportsCapability("image") &&
      !openai.supportsCapability("video");
    results.push(check("Capabilities: flags match metadata", ok, "ok"));
  }

  // 5. Cost: video credits exceed image credits; deterministic + relative.
  {
    const flux = registry.get("flux")!;
    const veo = registry.get("veo")!;
    const imgCost = flux.estimateCost(req("flux", "image"));
    const vidCost = veo.estimateCost(req("veo", "video"));
    results.push(
      check(
        "Cost: relative, video > image, unitless",
        imgCost.unit === "relative" && vidCost.unit === "relative" && vidCost.credits > imgCost.credits && imgCost.credits > 0,
        `img=${imgCost.credits} vid=${vidCost.credits}`
      )
    );
  }

  // 6. Duration: positive relative estimate; video longer than image.
  {
    const flux = registry.get("flux")!;
    const runway = registry.get("runway")!;
    const i = flux.estimateDuration(req("flux", "image")).seconds;
    const v = runway.estimateDuration(req("runway", "video")).seconds;
    results.push(check("Duration: positive + video > image", i > 0 && v > i, `img=${i} vid=${v}`));
  }

  // 7. Provider compatibility via registry: wrong provider id flagged.
  {
    const r = registry.validateProviderCompatibility("flux", req("openai", "image"));
    const unknown = registry.validateProviderCompatibility("nope", req("nope", "image"));
    results.push(
      check("Compatibility: mismatched/unknown provider flagged", !r.ok && !unknown.ok, `mismatch=${r.errors.length} unknown=${unknown.errors.length}`)
    );
  }

  // 8. Determinism: estimates + normalization stable on rebuild and repeat.
  {
    const a = createDefaultAdapterRegistry().get("kling")!;
    const b = createDefaultAdapterRegistry().get("kling")!;
    const r = req("kling", "video", { durationSec: 8, batch: 1 });
    const sameCost = JSON.stringify(a.estimateCost(r)) === JSON.stringify(b.estimateCost(r));
    const idempotent =
      JSON.stringify(a.normalizeRequest(r)) === JSON.stringify(a.normalizeRequest(a.normalizeRequest(r)));
    results.push(check("Determinism: stable estimates + idempotent normalize", sameCost && idempotent, "stable"));
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatGenerationAdapterReport(summary: AdapterSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  GENERATION ADAPTER EVALUATION (provider adapter layer)");
  L.push("══════════════════════════════════════════════════════════════");
  L.push(`  Checks: ${summary.passed}/${summary.total} passed`);
  L.push("");
  for (const c of summary.results) {
    L.push(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
    if (!c.pass) L.push(`        ${c.detail}`);
  }
  L.push("");
  L.push(`  RESULT: ${summary.failed === 0 ? "PASS" : "FAIL"}`);
  L.push("──────────────────────────────────────────────────────────────");
  return L.join("\n");
}
