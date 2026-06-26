/**
 * AI Evaluation Suite — Decision Center checks (Sprint 45).
 *
 * Deterministic property checks over the decision/explanation layer: decision
 * graph structure + integrity, confidence breakdown propagation, explanation
 * completeness, timeline ordering, relationship integrity, and hallucination
 * protection. Uses the same eval FIXTURE shape as the Brain/Command suites. Pure.
 */

import type { CreativeInput } from "../creative/types";
import type { ReasoningInput } from "../reasoning/types";
import { buildMarketingBrain } from "../brain";
import { reason } from "../reasoning/engine";
import { mapBrainToCommands } from "../command-center";
import {
  buildDecision,
  validateGraph,
  hasFullChain,
  nodesOfType,
  confidenceRank,
  type DecisionModel,
} from "../decision";

export interface DecisionCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface DecisionSummary {
  total: number;
  passed: number;
  failed: number;
  results: DecisionCheck[];
}

function check(name: string, pass: boolean, detail: string): DecisionCheck {
  return { name, pass, detail };
}

function fixtureInputs(): { creativeInput: CreativeInput; reasoningInput: ReasoningInput } {
  return {
    creativeInput: {
      roas: 2.1,
      ctr: 0.012,
      spend: 48200,
      frequency: 4.2,
      ctrTrend: "declining",
      causes: ["creative_fatigue", "higher_cpc"],
      recommendations: ["Pause Campaign A"],
      memories: ["Our target ROAS is 3.0"],
    },
    reasoningInput: {
      headline: { spend: 48200, roas: 2.1, revenue: 101220, ctr: 0.012 },
      currency: "USD",
      trends: [{ metric: "ctr", changeLabel: "-12%", status: "declining" }],
      causes: [
        { primaryCause: "creative_fatigue", severity: "high", confidence: "high", evidence: "CTR down 12% over 14d" },
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
    },
  };
}

function fixtureModel(): DecisionModel {
  const { creativeInput, reasoningInput } = fixtureInputs();
  const brain = buildMarketingBrain(creativeInput, reasoningInput);
  const reasoning = reason(reasoningInput);
  const commands = mapBrainToCommands(brain);
  return buildDecision({ brain, reasoning, commands });
}

export function runDecisionEvaluation(): DecisionSummary {
  const results: DecisionCheck[] = [];
  const { creativeInput, reasoningInput } = fixtureInputs();
  const brain = buildMarketingBrain(creativeInput, reasoningInput);
  const reasoning = reason(reasoningInput);
  const commands = mapBrainToCommands(brain);
  const model = buildDecision({ brain, reasoning, commands });

  // 1. Decision graph: full Performance → ExpectedOutcome chain present.
  {
    const types = new Set(model.graph.nodes.map((n) => n.type));
    const hasStages =
      types.has("Performance") &&
      types.has("Reasoning") &&
      types.has("Recommendation") &&
      types.has("Command") &&
      types.has("ExpectedOutcome");
    results.push(
      check(
        "Graph: all decision stages present + reachable chain",
        hasStages && hasFullChain(model.graph),
        `types=${[...types].join(",")}`
      )
    );
  }

  // 2. Relationship integrity: no dangling edges, no orphan nodes.
  {
    const integrity = validateGraph(model.graph);
    results.push(
      check(
        "Relationships: no dangling edges or orphan nodes",
        integrity.ok && integrity.orphanNodes.length === 0,
        `dangling=${integrity.danglingEdges.length} orphans=${integrity.orphanNodes.length}`
      )
    );
  }

  // 3. Command coverage: one Command node per mapped command.
  {
    const cmdNodes = nodesOfType(model.graph, "Command");
    results.push(
      check(
        "Graph: one Command node per mapped command",
        cmdNodes.length === commands.length && commands.length > 0,
        `cmdNodes=${cmdNodes.length} commands=${commands.length}`
      )
    );
  }

  // 4. Confidence breakdown: four factors + grounded overall (no fabrication).
  {
    const c = model.confidence;
    const factorsValid =
      c.dataQuality.score >= 0 &&
      c.signalStrength.score >= 0 &&
      c.evidence.score >= 0 &&
      c.reasoning.score >= 0 &&
      c.overallScore >= 0 &&
      c.overallScore <= 100;
    // Reasoning factor must equal the reasoning engine's own confidence.
    const propagated = c.reasoning.level === reasoning.confidence;
    // Overall sits within the span of its factors (never exceeds the max).
    const maxFactor = Math.max(
      confidenceRank(c.dataQuality.level),
      confidenceRank(c.signalStrength.level),
      confidenceRank(c.evidence.level),
      confidenceRank(c.reasoning.level)
    );
    const bounded = confidenceRank(c.overall) <= maxFactor;
    results.push(
      check(
        "Confidence: 4 grounded factors, reasoning propagated, overall bounded",
        factorsValid && propagated && bounded,
        `overall=${c.overall}(${c.overallScore}) reasoning=${c.reasoning.level}`
      )
    );
  }

  // 5. Explanation completeness: every block answers all seven questions.
  {
    const complete = model.explanations.every(
      (e) =>
        e.whatHappened.length > 0 &&
        e.why.length > 0 &&
        Array.isArray(e.evidence) &&
        e.evidence.length > 0 &&
        e.risk.length > 0 &&
        e.confidence.overall.length > 0 &&
        e.ifIgnored.length > 0 &&
        e.ifExecuted.length > 0
    );
    results.push(
      check(
        "Explanation: every block answers all 7 questions",
        complete && model.explanations.length === commands.length,
        `blocks=${model.explanations.length}`
      )
    );
  }

  // 6. Timeline ordering: contiguous order, correct stage progression.
  {
    const t = model.timeline;
    const contiguous = t.every((s, i) => s.order === i);
    const STAGE_RANK: Record<string, number> = {
      Performance: 0,
      RootCause: 1,
      Reasoning: 2,
      Recommendation: 3,
      Command: 4,
    };
    const monotonic = t.every(
      (s, i) => i === 0 || STAGE_RANK[t[i - 1].stage] <= STAGE_RANK[s.stage]
    );
    results.push(
      check(
        "Timeline: contiguous order + non-decreasing stage",
        contiguous && monotonic && t.length >= 4,
        `steps=${t.map((s) => s.stage).join("→")}`
      )
    );
  }

  // 7. Hallucination protection: no % in any explanation that isn't grounded.
  {
    const sourcePct = new Set(
      [
        ...reasoning.evidence,
        reasoning.expectedOutcome ?? "",
        ...commands.map((c) => c.estimatedImpact),
      ]
        .join(" ")
        .match(/\d+/g) ?? []
    );
    const ok = model.explanations.every((e) => {
      const text = `${e.whatHappened} ${e.why} ${e.ifIgnored} ${e.ifExecuted}`;
      const nums = text.match(/(\d+)%/g) ?? [];
      // Any % cited must trace to a number present in the grounded source set.
      return nums.every((m) => sourcePct.has(m.replace("%", "")));
    });
    results.push(
      check(
        "Hallucination protection: explanation % trace to grounded source",
        ok,
        "no fabricated percentages"
      )
    );
  }

  // 8. Determinism: building twice yields identical models.
  {
    const again = fixtureModel();
    results.push(
      check(
        "Determinism: identical model on rebuild",
        JSON.stringify(again) === JSON.stringify(model),
        "stable output"
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatDecisionReport(summary: DecisionSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  DECISION CENTER EVALUATION (explanation layer)");
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
