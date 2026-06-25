/**
 * AI Evaluation Suite — Marketing Brain checks (Sprint 39).
 *
 * Deterministic property checks over the composed brain using representative
 * eval FIXTURES. Validates health scoring, opportunity/risk ranking, executive
 * summary, daily pulse, knowledge-graph consistency, and hallucination
 * protection.
 */

import type { CreativeInput } from "../creative/types";
import type { ReasoningInput } from "../reasoning/types";
import { buildMarketingBrain } from "../brain";
import type { MarketingBrain } from "../brain/types";

export interface BrainCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface BrainSummary {
  total: number;
  passed: number;
  failed: number;
  results: BrainCheck[];
}

function check(name: string, pass: boolean, detail: string): BrainCheck {
  return { name, pass, detail };
}

function fixtureBrain(): MarketingBrain {
  const creativeInput: CreativeInput = {
    roas: 2.1,
    ctr: 0.012,
    spend: 48200,
    frequency: 4.2,
    ctrTrend: "declining",
    causes: ["creative_fatigue", "higher_cpc"],
    recommendations: ["Pause Campaign A"],
    memories: ["Our target ROAS is 3.0"],
  };
  const reasoningInput: ReasoningInput = {
    headline: { spend: 48200, roas: 2.1, revenue: 101220, ctr: 0.012 },
    currency: "USD",
    trends: [{ metric: "ctr", changeLabel: "-12%", status: "declining" }],
    causes: [
      { primaryCause: "creative_fatigue", severity: "high" },
      { primaryCause: "higher_cpc", severity: "medium" },
    ],
    recommendations: [
      {
        action: "Pause Campaign A",
        impact: "",
        opportunityScore: 82,
        evidenceLevel: "strong",
        impactRanges: [{ metric: "ROAS", direction: "increase", lowPct: 8, highPct: 15 }],
        impactAssumption: "closing the CPC gap to benchmark",
      },
    ],
    watchOuts: [],
  };
  return buildMarketingBrain(creativeInput, reasoningInput);
}

export function runBrainEvaluation(): BrainSummary {
  const results: BrainCheck[] = [];
  const brain = fixtureBrain();

  // 1. Health: 9 dimensions, scores 0–100, overall in range.
  {
    const h = brain.health;
    const ok =
      h.dimensions.length === 9 &&
      h.dimensions.every((d) => d.score >= 0 && d.score <= 100) &&
      h.overall >= 0 &&
      h.overall <= 100;
    results.push(check("Health: 9 dimensions, scores 0–100", ok, `overall=${h.overall}`));
  }

  // 2. Health grounding: ROAS graded vs memory target, fatigue reflects signal.
  {
    const roas = brain.health.dimensions.find((d) => d.key === "ROAS");
    const fatigue = brain.health.dimensions.find((d) => d.key === "Creative Fatigue");
    results.push(
      check(
        "Health: ROAS uses memory target; fatigue reflects signal",
        roas?.confidence === "high" &&
          /target 3\.00/.test(roas.explanation) &&
          (fatigue?.score ?? 100) < 50,
        `roas=${roas?.explanation} fatigue=${fatigue?.score}`
      )
    );
  }

  // 3. Opportunity ranking: non-increasing priority order.
  {
    const rank = { High: 3, Medium: 2, Low: 1 } as const;
    const ok = brain.opportunities.every(
      (o, i) => i === 0 || rank[brain.opportunities[i - 1].priority] >= rank[o.priority]
    );
    results.push(
      check("Opportunity ranking: priority non-increasing", ok && brain.opportunities.length > 0, `n=${brain.opportunities.length}`)
    );
  }

  // 4. Risk ranking: non-increasing severity; fatigue + CPC detected.
  {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 } as const;
    const ordered = brain.risks.every(
      (r, i) => i === 0 || sev[brain.risks[i - 1].severity] >= sev[r.severity]
    );
    const hasFatigue = brain.risks.some((r) => r.type === "Creative Fatigue");
    const hasCpc = brain.risks.some((r) => r.type === "High CPC");
    results.push(
      check(
        "Risk ranking: ordered + fatigue/CPC detected",
        ordered && hasFatigue && hasCpc,
        `risks=${brain.risks.map((r) => r.type).join(",")}`
      )
    );
  }

  // 5. Executive: summary present, healthScore matches, top opp + biggest risk set.
  {
    const e = brain.executive;
    results.push(
      check(
        "Executive: summary + healthScore + top opp/risk",
        e.executiveSummary.length > 0 &&
          e.healthScore === brain.health.overall &&
          e.topOpportunity != null &&
          e.biggestRisk != null,
        `health=${e.healthScore}`
      )
    );
  }

  // 6. Daily pulse: all five sections present.
  {
    const p = brain.pulse;
    results.push(
      check(
        "Daily pulse: five sections populated/typed",
        Array.isArray(p.wins) &&
          Array.isArray(p.problems) &&
          Array.isArray(p.opportunities) &&
          Array.isArray(p.risks) &&
          Array.isArray(p.recommendations) &&
          p.recommendations.length > 0,
        `recs=${p.recommendations.length}`
      )
    );
  }

  // 7. Knowledge graph consistency: every edge references an existing node.
  {
    const ids = new Set(brain.graph.nodes.map((n) => n.id));
    const consistent = brain.graph.edges.every(
      (e) => ids.has(e.from) && ids.has(e.to)
    );
    const hasChain =
      ids.has("performance") &&
      ids.has("recommendation") &&
      ids.has("action") &&
      ids.has("outcome");
    results.push(
      check(
        "Knowledge graph: no dangling edges + full chain",
        consistent && hasChain,
        `nodes=${brain.graph.nodes.length} edges=${brain.graph.edges.length}`
      )
    );
  }

  // 8. Hallucination protection: no fabricated % in health/risk/opportunity prose.
  {
    const prose = [
      ...brain.health.dimensions.map((d) => d.explanation),
      ...brain.risks.map((r) => r.mitigation),
      ...brain.opportunities.map((o) => o.title),
    ].join(" ");
    results.push(
      check(
        "Hallucination protection: no fabricated % in prose",
        !/\d+%/.test(prose),
        "no \\d+% patterns present"
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatBrainReport(summary: BrainSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  MARKETING BRAIN EVALUATION (deterministic intelligence core)");
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
