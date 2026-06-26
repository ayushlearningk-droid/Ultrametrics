/**
 * AI Evaluation Suite — Generation Orchestrator checks (Sprint 54).
 *
 * Deterministic property checks over the pure orchestration layer: provider
 * selection, capability + aspect-ratio matching, image/video routing, cost- and
 * quality-aware routing, batch planning, queue planning, and determinism. Pure
 * — no I/O, no API calls, no media.
 */

import {
  createDefaultAdapterRegistry,
  GenerationQueue,
  rankProviders,
  selectProvider,
  planBatch,
  planQueue,
  materializePlan,
  type GenerationRequest,
} from "../generation";

export interface OrchestratorCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface OrchestratorSummary {
  total: number;
  passed: number;
  failed: number;
  results: OrchestratorCheck[];
}

function check(name: string, pass: boolean, detail: string): OrchestratorCheck {
  return { name, pass, detail };
}

function req(
  assetType: "image" | "video",
  over: Partial<GenerationRequest> = {}
): GenerationRequest {
  return {
    providerId: "",
    assetType,
    prompt: "A grounded product hero shot",
    aspectRatio: assetType === "video" ? "16:9" : "1:1",
    ...(assetType === "video" ? { durationSec: 5 } : {}),
    ...over,
  };
}

export function runGenerationOrchestratorEvaluation(): OrchestratorSummary {
  const results: OrchestratorCheck[] = [];
  const registry = createDefaultAdapterRegistry();

  // 1. Image vs video routing: chosen provider serves the requested asset type.
  {
    const img = selectProvider(registry, req("image"));
    const vid = selectProvider(registry, req("video"));
    const imgOk = img.chosen != null && registry.get(img.chosen.providerId)!.supportsCapability("image");
    const vidOk = vid.chosen != null && registry.get(vid.chosen.providerId)!.supportsCapability("video");
    results.push(
      check("Routing: image→image provider, video→video provider", imgOk && vidOk, `img=${img.chosen?.providerId} vid=${vid.chosen?.providerId}`)
    );
  }

  // 2. Capability + aspect-ratio matching: candidates all support the AR.
  {
    const cands = rankProviders(registry, req("image", { aspectRatio: "4:5" }));
    const allSupport = cands.every((c) =>
      registry.get(c.providerId)!.capabilities().aspectRatios.includes("4:5")
    );
    // ideogram does NOT support 4:5 → must be excluded.
    const excludesIdeogram = !cands.some((c) => c.providerId === "ideogram");
    results.push(
      check("Matching: aspect-ratio filtered candidates", allSupport && excludesIdeogram && cands.length > 0, `n=${cands.length}`)
    );
  }

  // 3. Cost-aware routing: chosen has minimum credits among candidates.
  {
    const sel = selectProvider(registry, req("image"), { strategy: "cost" });
    const cands = rankProviders(registry, req("image"), "cost");
    const minCredits = Math.min(...cands.map((c) => c.cost.credits));
    results.push(
      check("Cost routing: chosen has minimum credits", sel.chosen?.cost.credits === minCredits, `chosen=${sel.chosen?.providerId}@${sel.chosen?.cost.credits} min=${minCredits}`)
    );
  }

  // 4. Quality-aware routing: chosen has maximum quality rank.
  {
    const sel = selectProvider(registry, req("video"), { strategy: "quality" });
    const cands = rankProviders(registry, req("video"), "quality");
    const maxQ = Math.max(...cands.map((c) => c.qualityRank));
    results.push(
      check("Quality routing: chosen has max quality rank", sel.chosen?.qualityRank === maxQ, `chosen=${sel.chosen?.providerId} q=${sel.chosen?.qualityRank} max=${maxQ}`)
    );
  }

  // 5. Preferred provider wins when compatible; ignored when not.
  {
    const ok = selectProvider(registry, req("image"), { preferredProviderId: "imagen" });
    const bad = selectProvider(registry, req("image"), { preferredProviderId: "runway" }); // video provider
    results.push(
      check(
        "Preference: honored when compatible, ignored otherwise",
        ok.chosen?.providerId === "imagen" && bad.chosen?.providerId !== "runway" && bad.chosen != null,
        `pref=${ok.chosen?.providerId} fallback=${bad.chosen?.providerId}`
      )
    );
  }

  // 6. Batch planning: splits into provider-sized chunks summing to total.
  {
    const openai = registry.get("openai")!; // image, maxBatch 4
    const chunks = planBatch(openai, req("image", { batch: 10 }));
    const sum = chunks.reduce((s, c) => s + (c.batch ?? 0), 0);
    const allWithinMax = chunks.every((c) => (c.batch ?? 0) <= openai.capabilities().maxBatch);
    results.push(
      check("Batch: splits to ≤maxBatch chunks summing to total", chunks.length === 3 && sum === 10 && allWithinMax, `chunks=${chunks.length} sum=${sum}`)
    );
  }

  // 7. Queue planning: plan jobs + materialize as queued; credits = sum.
  {
    const plan = planQueue(registry, [req("image", { batch: 6 }), req("video")]);
    const creditSum = plan.jobs.reduce((s, j) => s + j.cost.credits, 0);
    const q = new GenerationQueue();
    const jobs = materializePlan(plan, q);
    const allQueued = jobs.every((j) => j.status === "queued");
    results.push(
      check(
        "Queue plan: jobs planned + materialized as queued (no execution)",
        plan.jobs.length >= 3 && plan.totalCredits === creditSum && allQueued && jobs.length === plan.jobs.length,
        `jobs=${plan.jobs.length} credits=${plan.totalCredits}`
      )
    );
  }

  // 8. Determinism + unroutable handling.
  {
    const a = planQueue(registry, [req("image"), req("video", { aspectRatio: "4:5" })]);
    const b = planQueue(registry, [req("image"), req("video", { aspectRatio: "4:5" })]);
    // No video provider supports 4:5 → unroutable, not silently re-routed.
    const unroutable = a.unroutable.length === 1;
    results.push(
      check(
        "Determinism: identical plan + unroutable surfaced",
        JSON.stringify(a) === JSON.stringify(b) && unroutable,
        `unroutable=${a.unroutable.length}`
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatGenerationOrchestratorReport(
  summary: OrchestratorSummary
): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  GENERATION ORCHESTRATOR EVALUATION (routing + planning)");
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
