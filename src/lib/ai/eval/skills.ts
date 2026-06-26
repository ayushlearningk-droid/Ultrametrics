/**
 * AI Evaluation Suite — Skills Framework checks (Sprint 48).
 *
 * Deterministic property checks over the skills framework: registry integrity,
 * descriptor completeness, read-only enforcement, grounded run output,
 * confidence propagation, input immutability, and determinism. Uses the same
 * eval FIXTURE shape as the Brain/Command/Decision suites. Pure — no I/O.
 */

import type { CreativeInput } from "../creative/types";
import type { ReasoningInput } from "../reasoning/types";
import { reason } from "../reasoning/engine";
import {
  createDefaultRegistry,
  runSkill,
  type SkillInput,
  type SkillCategory,
} from "../skills";

export interface SkillCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface SkillsSummary {
  total: number;
  passed: number;
  failed: number;
  results: SkillCheck[];
}

function check(name: string, pass: boolean, detail: string): SkillCheck {
  return { name, pass, detail };
}

function fixtureInput(): SkillInput {
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
      { primaryCause: "creative_fatigue", severity: "high", confidence: "high" },
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
  return { creativeInput, reasoningInput };
}

const EXPECTED_CATEGORIES: SkillCategory[] = [
  "analytics",
  "creative",
  "media-buyer",
  "reporting",
  "workspace",
];

export function runSkillsEvaluation(): SkillsSummary {
  const results: SkillCheck[] = [];
  const registry = createDefaultRegistry();
  const skills = registry.list();
  const input = fixtureInput();

  // 1. Registry: all 5 built-ins registered with unique ids + categories.
  {
    const ids = skills.map((s) => s.id);
    const uniqueIds = new Set(ids).size === ids.length;
    const cats = new Set(skills.map((s) => s.category));
    const allCats = EXPECTED_CATEGORIES.every((c) => cats.has(c));
    results.push(
      check(
        "Registry: 5 unique skills covering all categories",
        skills.length === 5 && uniqueIds && allCats,
        `ids=${ids.join(",")}`
      )
    );
  }

  // 2. Descriptor completeness: every required field populated.
  {
    const complete = skills.every((s) => {
      const d = s.describe();
      return (
        d.id.length > 0 &&
        d.name.length > 0 &&
        d.description.length > 0 &&
        d.capabilities.length > 0 &&
        d.permissions.length > 0 &&
        d.supportedTools.length > 0 &&
        d.inputSchema.length > 0 &&
        d.outputSchema.length > 0 &&
        (d.confidence === "high" || d.confidence === "medium" || d.confidence === "low")
      );
    });
    results.push(check("Descriptor: all fields populated + valid confidence", complete, `n=${skills.length}`));
  }

  // 3. Read-only enforcement: every skill declares read-only.
  {
    const readOnly = skills.every((s) => s.executionMode === "read-only");
    const permsReadOnly = skills.every((s) =>
      s.permissions.every((p) => p.startsWith("read:"))
    );
    results.push(
      check(
        "Execution: every skill + permission is read-only",
        readOnly && permsReadOnly,
        `modes=${[...new Set(skills.map((s) => s.executionMode))].join(",")}`
      )
    );
  }

  // 4. Grounded run: each skill yields ok output for complete input.
  {
    const ran = skills.every((s) => runSkill(s, input).ok);
    results.push(check("Run: every skill produces grounded output", ran, "all ok"));
  }

  // 5. Confidence propagation: analytics result == reasoning engine confidence.
  {
    const analytics = registry.get("analytics")!;
    const res = runSkill(analytics, input);
    const expected = reason(input.reasoningInput!).confidence;
    results.push(
      check(
        "Confidence: propagated from underlying engine",
        res.confidence === expected,
        `result=${res.confidence} engine=${expected}`
      )
    );
  }

  // 6. Missing input: skill refuses gracefully (ok:false, no throw).
  {
    const mb = registry.get("media-buyer")!;
    const res = runSkill(mb, { reasoningInput: input.reasoningInput });
    results.push(
      check(
        "Run: missing required input → ok:false, output null",
        res.ok === false && res.output === null,
        `notes=${res.notes ?? ""}`
      )
    );
  }

  // 7. Input immutability: running must not mutate the input.
  {
    const before = JSON.stringify(input);
    skills.forEach((s) => runSkill(s, input));
    results.push(
      check("Purity: run never mutates input", JSON.stringify(input) === before, "input unchanged")
    );
  }

  // 8. Determinism: same skill + input → identical result.
  {
    const a = runSkill(registry.get("workspace")!, input);
    const b = runSkill(createDefaultRegistry().get("workspace")!, input);
    results.push(
      check(
        "Determinism: identical result on rebuild",
        JSON.stringify(a) === JSON.stringify(b),
        "stable"
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatSkillsReport(summary: SkillsSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  SKILLS FRAMEWORK EVALUATION (read-only capability layer)");
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
