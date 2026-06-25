/**
 * AI Evaluation Suite — Media Buyer checks (Sprint 38).
 *
 * Deterministic property checks over the optimization engine + plan using
 * representative eval FIXTURES. Validates budget/scaling/creative/audience
 * reasoning, confidence, and the no-hallucination contract (no fabricated %).
 */

import type { CreativeInput } from "../creative/types";
import { computeCreativeSignals } from "../creative/intelligence";
import { generateOptimizations } from "../media-buyer/engine";
import { buildOptimizationPlan } from "../media-buyer/plan";
import type { OptimizationRec, OptCategory } from "../media-buyer/types";
import type { ReasoningInput } from "../reasoning/types";

export interface MBCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface MBSummary {
  total: number;
  passed: number;
  failed: number;
  results: MBCheck[];
}

function check(name: string, pass: boolean, detail: string): MBCheck {
  return { name, pass, detail };
}

function recsFor(input: CreativeInput): OptimizationRec[] {
  return generateOptimizations(input, computeCreativeSignals(input));
}
function find(recs: OptimizationRec[], cat: OptCategory): OptimizationRec | undefined {
  return recs.find((r) => r.category === cat);
}

export function runMediaBuyerEvaluation(): MBSummary {
  const results: MBCheck[] = [];

  // 1. Budget reasoning: waste signals → reallocate, High.
  {
    const recs = recsFor({ spend: 3000, conversions: 0, causes: ["offer_mismatch"] });
    const b = find(recs, "Budget");
    results.push(
      check(
        "Budget reasoning: reallocate when wasteful",
        b?.priority === "High" && /reallocate/i.test(b.action),
        `${b?.priority} · ${b?.action}`
      )
    );
  }

  // 2. Scaling reasoning: healthy → scale winners, High.
  {
    const recs = recsFor({ roas: 4, ctr: 0.02, ctrTrend: "improving" });
    const s = find(recs, "Scaling");
    results.push(
      check(
        "Scaling reasoning: scale when healthy",
        s?.priority === "High" && /scale/i.test(s.action),
        `${s?.priority} · ${s?.action}`
      )
    );
  }

  // 3. Creative reasoning: weak hook / fatigue → launch variants, High.
  {
    const recs = recsFor({
      ctrTrend: "declining",
      frequency: 4,
      causes: ["creative_fatigue"],
    });
    const c = find(recs, "Creative");
    results.push(
      check(
        "Creative reasoning: refresh on fatigue",
        c?.priority === "High" && /launch|variant/i.test(c.action),
        `${c?.priority} · ${c?.action}`
      )
    );
  }

  // 4. Audience reasoning: high frequency → expand, High.
  {
    const recs = recsFor({ frequency: 5.5 });
    const a = find(recs, "Audience");
    results.push(
      check(
        "Audience reasoning: expand on saturation",
        a?.priority === "High" && /expand|refresh/i.test(a.action),
        `${a?.priority} · ${a?.action}`
      )
    );
  }

  // 5. Confidence present on every rec + 6 categories.
  {
    const recs = recsFor({ roas: 2.5, ctrTrend: "stable" });
    const cats = new Set(recs.map((r) => r.category));
    results.push(
      check(
        "Every rec has confidence; all 6 categories present",
        recs.length === 6 &&
          cats.size === 6 &&
          recs.every((r) => ["high", "medium", "low"].includes(r.confidence)),
        `categories=${[...cats].join(",")}`
      )
    );
  }

  // 6. Hallucination protection: no fabricated % in rec prose.
  {
    const recs = recsFor({ frequency: 4, ctrTrend: "declining", causes: ["higher_cpc"] });
    const prose = recs
      .flatMap((r) => [r.action, r.why, r.expectedOutcome, r.risk, r.estimatedImpact])
      .join(" ");
    results.push(
      check(
        "Hallucination protection: no fabricated % in plan prose",
        !/\d+%/.test(prose),
        "no \\d+% patterns present"
      )
    );
  }

  // 7. Plan assembles: summary + 6 recs + confidence (grounded inputs).
  {
    const creativeInput: CreativeInput = {
      roas: 2.1,
      ctr: 0.012,
      spend: 48200,
      ctrTrend: "declining",
      causes: ["creative_fatigue"],
      recommendations: ["Pause Campaign A"],
    };
    const reasoningInput: ReasoningInput = {
      headline: { spend: 48200, roas: 2.1, revenue: 101220, ctr: 0.012 },
      currency: "USD",
      trends: [{ metric: "ctr", changeLabel: "-12%", status: "declining" }],
      causes: [{ primaryCause: "creative_fatigue", severity: "high" }],
      recommendations: [
        {
          action: "Pause Campaign A",
          impact: "",
          opportunityScore: 80,
          evidenceLevel: "strong",
        },
      ],
    };
    const plan = buildOptimizationPlan(creativeInput, reasoningInput);
    results.push(
      check(
        "Plan: summary + 6 recs + confidence",
        plan.executiveSummary.length > 0 &&
          plan.recommendations.length === 6 &&
          ["high", "medium", "low"].includes(plan.confidence),
        `recs=${plan.recommendations.length} conf=${plan.confidence}`
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatMediaBuyerReport(summary: MBSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  MEDIA BUYER EVALUATION — Optimization Planning (deterministic)");
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
