/**
 * AI Evaluation Suite — Reasoning Engine checks (Sprint 34).
 *
 * Deterministic property checks over the Marketing Reasoning engines (priority,
 * impact, confidence, narrative). Inputs are representative eval FIXTURES for
 * pure functions (not production data); assertions verify ordering/confidence/
 * impact/diagnosis correctness and the no-hallucination contract. Dev-only.
 */

import type { RecInput, CauseInput } from "../reasoning/types";
import { prioritize, scoreRecommendation } from "../reasoning/priority";
import { estimateBusinessImpact } from "../reasoning/impact";
import {
  overallConfidence,
  recommendationConfidence,
} from "../reasoning/confidence";
import { reason } from "../reasoning/engine";

export interface EngineCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface EngineSummary {
  total: number;
  passed: number;
  failed: number;
  results: EngineCheck[];
}

// ── Fixtures (representative grounded shapes, not production data) ──
const recStrong: RecInput = {
  action: "Pause Campaign A",
  impact: "High CPC, no conversions",
  kind: "pause",
  opportunityScore: 85,
  evidenceLevel: "strong",
  impactRanges: [{ metric: "ROAS", direction: "increase", lowPct: 10, highPct: 18 }],
  impactAssumption: "closing the CPC gap to your benchmark",
};
const recMid: RecInput = {
  action: "Scale Campaign B",
  impact: "Efficient at scale",
  kind: "scale",
  opportunityScore: 60,
  evidenceLevel: "moderate",
  impactRanges: [{ metric: "Revenue", direction: "increase", lowPct: 5, highPct: 9 }],
};
const recWeak: RecInput = {
  action: "Test Creative C",
  impact: "Fatigue suspected",
  kind: "creative",
  opportunityScore: 40,
  evidenceLevel: "limited",
};

function check(name: string, pass: boolean, detail: string): EngineCheck {
  return { name, pass, detail };
}

export function runEngineEvaluation(): EngineSummary {
  const results: EngineCheck[] = [];

  // 1. Prioritization — strongest opportunity ranks first; labels descend.
  const ordered = prioritize([recWeak, recStrong, recMid]);
  results.push(
    check(
      "Prioritization: highest-value action first",
      ordered[0]?.action === "Pause Campaign A" &&
        ordered[0]?.priority === "High" &&
        ordered[ordered.length - 1]?.action === "Test Creative C",
      `order = ${ordered.map((o) => `${o.action} [${o.priority}]`).join(" → ")}`
    )
  );
  results.push(
    check(
      "Prioritization: composite score is monotonic with strength",
      scoreRecommendation(recStrong) > scoreRecommendation(recMid) &&
        scoreRecommendation(recMid) > scoreRecommendation(recWeak),
      `${scoreRecommendation(recStrong)} > ${scoreRecommendation(recMid)} > ${scoreRecommendation(recWeak)}`
    )
  );

  // 2. Confidence — derived from evidence strength.
  results.push(
    check(
      "Confidence: strong→high, limited→low",
      recommendationConfidence(recStrong) === "high" &&
        recommendationConfidence(recWeak) === "low" &&
        overallConfidence([recStrong], []) === "high" &&
        overallConfidence([recWeak], []) === "low",
      `strong=${recommendationConfidence(recStrong)} weak=${recommendationConfidence(recWeak)}`
    )
  );
  results.push(
    check(
      "Confidence: no signals → low",
      overallConfidence([], []) === "low",
      "empty recs + causes ⇒ low"
    )
  );

  // 3. Business impact — quantified only from provided ranges + assumptions.
  const impactQuant = estimateBusinessImpact([recStrong, recMid]);
  const impactNone = estimateBusinessImpact([recWeak]);
  results.push(
    check(
      "Business impact: quantified from ranges with assumptions",
      impactQuant.quantified === true &&
        impactQuant.assumptions.includes("closing the CPC gap to your benchmark") &&
        /\+10–\+18% ROAS/.test(impactQuant.summary),
      impactQuant.summary
    )
  );
  results.push(
    check(
      "Business impact: not invented when no ranges",
      impactNone.quantified === false && !/%/.test(impactNone.summary),
      impactNone.summary
    )
  );

  // 4. Diagnosis — highest-severity cause; grounded; no fabrication.
  const causes: CauseInput[] = [
    { primaryCause: "low_ctr", severity: "medium", evidence: "CTR below benchmark" },
    { primaryCause: "higher_cpc", severity: "high", evidence: "CPC up 18% WoW" },
  ];
  const r = reason({
    headline: { spend: 48200, roas: 2.14, revenue: 103148 },
    currency: "USD",
    trends: [{ metric: "ctr", changeLabel: "+18%", status: "improving" }],
    causes,
    recommendations: [recStrong, recMid, recWeak],
  });
  results.push(
    check(
      "Diagnosis: picks highest-severity cause",
      r.diagnosis?.startsWith("Higher cpc") === true &&
        r.diagnosis?.includes("(high)") === true,
      `diagnosis = ${r.diagnosis}`
    )
  );
  results.push(
    check(
      "Narrative: grounded in input numbers only",
      r.executiveSummary.includes("USD 48,200") &&
        r.executiveSummary.includes("ROAS 2.14") &&
        r.prioritizedActions[0]?.action === "Pause Campaign A",
      r.executiveSummary
    )
  );
  results.push(
    check(
      "Risks: every cause surfaced",
      r.risks.length >= causes.length,
      `${r.risks.length} risks for ${causes.length} causes`
    )
  );

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatEngineReport(summary: EngineSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  REASONING ENGINE EVALUATION — Marketing Analyst (deterministic)");
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
