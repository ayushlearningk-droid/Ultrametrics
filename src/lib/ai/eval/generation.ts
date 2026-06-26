/**
 * AI Evaluation Suite — Generation Engine checks (Sprint 52).
 *
 * Deterministic property checks over the generation foundation: registry
 * integrity, provider lookup, capability validity, asset-type filtering, queue
 * lifecycle/status transitions, request validation, and determinism. Pure — no
 * I/O, no API calls, no media.
 */

import {
  createDefaultGenerationRegistry,
  GenerationQueue,
  canTransition,
  validateAgainstCapability,
  type GenerationRequest,
} from "../generation";

export interface GenerationCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface GenerationSummary {
  total: number;
  passed: number;
  failed: number;
  results: GenerationCheck[];
}

function check(name: string, pass: boolean, detail: string): GenerationCheck {
  return { name, pass, detail };
}

export function runGenerationEvaluation(): GenerationSummary {
  const results: GenerationCheck[] = [];
  const registry = createDefaultGenerationRegistry();
  const providers = registry.list();

  // 1. Registry: 10 providers, unique ids, all disabled/planned this sprint.
  {
    const ids = providers.map((p) => p.id);
    const unique = new Set(ids).size === ids.length;
    const safe = providers.every(
      (p) => p.executionMode === "disabled" && p.status === "planned"
    );
    results.push(
      check(
        "Registry: 10 unique providers, all disabled/planned",
        providers.length === 10 && unique && safe,
        `n=${providers.length}`
      )
    );
  }

  // 2. Provider lookup: known resolves, unknown is undefined.
  {
    const ok = registry.get("runway")?.id === "runway" && registry.get("nope") === undefined;
    results.push(check("Lookup: known resolves, unknown undefined", ok, "lookup ok"));
  }

  // 3. Capabilities: non-empty + video providers declare maxDurationSec.
  {
    const valid = providers.every((p) => {
      const c = p.capability;
      const base = c.assetTypes.length > 0 && c.aspectRatios.length > 0 && c.maxBatch >= 1;
      const video = c.assetTypes.includes("video")
        ? typeof c.maxDurationSec === "number" && c.maxDurationSec > 0
        : true;
      return base && video;
    });
    results.push(check("Capabilities: valid + video durations present", valid, "ok"));
  }

  // 4. Asset-type filtering partitions providers (5 image, 5 video here).
  {
    const images = registry.listByAssetType("image").length;
    const videos = registry.listByAssetType("video").length;
    results.push(
      check(
        "Filter: asset-type filtering returns expected sets",
        images === 5 && videos === 5,
        `image=${images} video=${videos}`
      )
    );
  }

  // 5. Queue: enqueue → queued; deterministic ids gen-0, gen-1.
  {
    const q = new GenerationQueue();
    const req = sampleRequest("flux", "image");
    const a = q.enqueue(req);
    const b = q.enqueue(req);
    results.push(
      check(
        "Queue: enqueue → queued with deterministic ids",
        a.id === "gen-0" && b.id === "gen-1" && a.status === "queued",
        `${a.id},${b.id}`
      )
    );
  }

  // 6. Status transitions: full lifecycle + illegal moves blocked.
  {
    const legal =
      canTransition("queued", "running") &&
      canTransition("running", "completed") &&
      canTransition("queued", "cancelled") &&
      canTransition("running", "failed");
    const illegal =
      !canTransition("queued", "completed") &&
      !canTransition("completed", "running") &&
      !canTransition("cancelled", "running");
    const q = new GenerationQueue();
    const job = q.enqueue(sampleRequest("runway", "video"));
    const r1 = q.markRunning(job.id);
    const r2 = q.markCompleted(job.id);
    const r3 = q.markRunning(job.id); // illegal from completed
    results.push(
      check(
        "Transitions: lifecycle valid, illegal blocked",
        legal && illegal && r1.ok && r2.ok && !r3.ok && r2.job.status === "completed",
        `blocked=${r3.reason ?? ""}`
      )
    );
  }

  // 7. Validation: request checked against capability (no I/O).
  {
    const flux = registry.get("flux")!;
    const good = validateAgainstCapability(sampleRequest("flux", "image"), flux.capability);
    const bad = validateAgainstCapability(
      { providerId: "flux", assetType: "video", prompt: "", aspectRatio: "21:9" },
      flux.capability
    );
    results.push(
      check(
        "Validation: capability-checked, errors collected",
        good.ok && !bad.ok && bad.errors.length >= 2,
        `errors=${bad.errors.length}`
      )
    );
  }

  // 8. Determinism: rebuilding registry + queue yields identical shape.
  {
    const q1 = new GenerationQueue();
    const q2 = new GenerationQueue();
    q1.enqueue(sampleRequest("veo", "video"));
    q2.enqueue(sampleRequest("veo", "video"));
    const sameProviders =
      JSON.stringify(createDefaultGenerationRegistry().list()) ===
      JSON.stringify(registry.list());
    results.push(
      check(
        "Determinism: identical registry + queue output",
        sameProviders && JSON.stringify(q1.list()) === JSON.stringify(q2.list()),
        "stable"
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

function sampleRequest(
  providerId: string,
  assetType: "image" | "video"
): GenerationRequest {
  return {
    providerId,
    assetType,
    prompt: "A grounded product hero shot",
    aspectRatio: assetType === "video" ? "16:9" : "1:1",
    ...(assetType === "video" ? { durationSec: 5 } : {}),
  };
}

export function formatGenerationReport(summary: GenerationSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  GENERATION ENGINE EVALUATION (provider foundation)");
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
