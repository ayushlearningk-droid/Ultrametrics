/**
 * AI Evaluation Suite — Command Center checks (Sprint 44).
 *
 * Deterministic property checks over the Command Center orchestration layer:
 * brain→command mapping, confidence propagation, queue ordering/grouping,
 * approval state machine, and grounded simulation output. Uses the same eval
 * FIXTURE shape as the Marketing Brain suite. Pure — no I/O.
 */

import type { CreativeInput } from "../creative/types";
import type { ReasoningInput } from "../reasoning/types";
import { buildMarketingBrain } from "../brain";
import {
  mapBrainToCommands,
  simulateCommand,
  groupByPriority,
  groupByCategory,
  groupByApproval,
  getNextRecommended,
  orderByRecommendation,
  transition,
  applyDecision,
  canTransition,
  type Command,
} from "../command-center";

export interface CommandCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface CommandSummary {
  total: number;
  passed: number;
  failed: number;
  results: CommandCheck[];
}

function check(name: string, pass: boolean, detail: string): CommandCheck {
  return { name, pass, detail };
}

function fixtureCommands(): Command[] {
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
        impactRanges: [
          { metric: "ROAS", direction: "increase", lowPct: 8, highPct: 15 },
        ],
        impactAssumption: "closing the CPC gap to benchmark",
      },
    ],
    watchOuts: [],
  };
  return mapBrainToCommands(buildMarketingBrain(creativeInput, reasoningInput));
}

export function runCommandCenterEvaluation(): CommandSummary {
  const results: CommandCheck[] = [];
  const commands = fixtureCommands();
  const brain = buildMarketingBrain(
    {
      roas: 2.1,
      ctr: 0.012,
      spend: 48200,
      frequency: 4.2,
      ctrTrend: "declining",
      causes: ["creative_fatigue", "higher_cpc"],
      recommendations: ["Pause Campaign A"],
      memories: ["Our target ROAS is 3.0"],
    },
    {
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
          impactRanges: [
            { metric: "ROAS", direction: "increase", lowPct: 8, highPct: 15 },
          ],
          impactAssumption: "closing the CPC gap to benchmark",
        },
      ],
      watchOuts: [],
    }
  );

  // 1. Command mapping: one command per opportunity + risk + executive action.
  {
    const expected =
      brain.opportunities.length +
      brain.risks.length +
      brain.executive.immediateActions.length;
    const allFields = commands.every(
      (c) =>
        c.id &&
        c.title.length > 0 &&
        c.category &&
        c.source &&
        c.executionType &&
        c.status === "pending"
    );
    results.push(
      check(
        "Mapping: one command per brain item, fully populated",
        commands.length === expected && expected > 0 && allFields,
        `commands=${commands.length} expected=${expected}`
      )
    );
  }

  // 2. Confidence propagation: each command's confidence matches its source.
  {
    const opps = commands.filter((c) => c.source === "opportunity");
    const propagated = opps.every(
      (c, i) => c.confidence === brain.opportunities[i].confidence
    );
    results.push(
      check(
        "Confidence: propagated verbatim from source intelligence",
        propagated && opps.length > 0,
        `opps=${opps.length}`
      )
    );
  }

  // 3. Queue ordering: priority desc then confidence desc, stable.
  {
    const ordered = orderByRecommendation(commands);
    const rank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const conf: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const monotonic = ordered.every((c, i) => {
      if (i === 0) return true;
      const prev = ordered[i - 1];
      const a = rank[prev.priority] * 10 + conf[prev.confidence];
      const b = rank[c.priority] * 10 + conf[c.confidence];
      return a >= b;
    });
    results.push(
      check(
        "Queue: orderByRecommendation is priority/confidence non-increasing",
        monotonic && ordered.length === commands.length,
        `n=${ordered.length}`
      )
    );
  }

  // 4. Grouping: priority/category/approval partition the set with no loss.
  {
    const byP = groupByPriority(commands);
    const byC = groupByCategory(commands);
    const byA = groupByApproval(commands);
    const pCount = byP.High.length + byP.Medium.length + byP.Low.length;
    const cCount = Object.values(byC).reduce((s, a) => s + (a?.length ?? 0), 0);
    const aCount = Object.values(byA).reduce((s, a) => s + (a?.length ?? 0), 0);
    results.push(
      check(
        "Queue: grouping helpers partition the set losslessly",
        pCount === commands.length &&
          cCount === commands.length &&
          aCount === commands.length &&
          (byA.pending?.length ?? 0) === commands.length,
        `p=${pCount} c=${cCount} a=${aCount}`
      )
    );
  }

  // 5. getNextRecommended returns the top-ranked actionable command.
  {
    const next = getNextRecommended(commands);
    const top = orderByRecommendation(commands)[0];
    results.push(
      check(
        "Queue: getNextRecommended == top of recommended order",
        next != null && top != null && next.id === top.id,
        `next=${next?.id}`
      )
    );
  }

  // 6. Approval state machine: legal + illegal transitions enforced.
  {
    const legal =
      canTransition("pending", "simulated") &&
      canTransition("simulated", "approved") &&
      canTransition("pending", "rejected") &&
      canTransition("approved", "executed");
    const illegal =
      !canTransition("pending", "executed") &&
      !canTransition("rejected", "approved") &&
      !canTransition("rolled_back", "approved");
    const t = transition("pending", "executed");
    results.push(
      check(
        "Approval: legal transitions allowed, illegal blocked",
        legal && illegal && !t.ok && t.state === "pending",
        `blockedReason=${t.reason ?? ""}`
      )
    );
  }

  // 7. applyDecision is pure + only mutates on legal transitions.
  {
    const c0 = commands[0];
    const good = applyDecision(c0, "approved");
    const bad = applyDecision(c0, "executed");
    results.push(
      check(
        "Approval: applyDecision pure; mutates only when legal",
        good.command.status === "approved" &&
          good.command !== c0 &&
          c0.status === "pending" &&
          bad.command.status === "pending" &&
          !bad.transition.ok,
        `good=${good.command.status} bad=${bad.command.status}`
      )
    );
  }

  // 8. Simulation: grounded, quantified flag honest, deterministic.
  {
    // The Campaign opportunity carries the quantified reasoning impact.
    const quantifiedCmd = commands.find((c) => /%/.test(c.estimatedImpact));
    const reviewCmd = commands.find((c) => c.executionType === "review");
    const simA = quantifiedCmd ? simulateCommand(quantifiedCmd) : null;
    const simB = quantifiedCmd ? simulateCommand(quantifiedCmd) : null;
    const simReview = reviewCmd ? simulateCommand(reviewCmd) : null;
    const deterministic =
      simA != null && simB != null && JSON.stringify(simA) === JSON.stringify(simB);
    results.push(
      check(
        "Simulation: deterministic, grounded, honest quantified flag",
        deterministic &&
          (simA?.quantified ?? false) === true &&
          (simA?.confidence ?? "low") === quantifiedCmd?.confidence &&
          (simReview?.estimatedExecutionTime ?? "") === "Manual review",
        `quantified=${simA?.quantified} time=${simReview?.estimatedExecutionTime}`
      )
    );
  }

  // 9. No fabricated numbers: simulation never invents a % not in the source.
  {
    const ok = commands.every((c) => {
      const sim = simulateCommand(c);
      const srcHasPct = /%/.test(c.estimatedImpact);
      const simHasPct = /%/.test(sim.expectedImprovement);
      // Sim may only contain a % if the grounded source did.
      return simHasPct ? srcHasPct : true;
    });
    results.push(
      check(
        "Simulation: no fabricated % beyond grounded source",
        ok,
        "every sim % traces to source impact"
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatCommandCenterReport(summary: CommandSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  COMMAND CENTER EVALUATION (orchestration foundation)");
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
