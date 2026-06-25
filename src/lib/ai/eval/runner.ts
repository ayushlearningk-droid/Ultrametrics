/**
 * AI Evaluation Suite — runner, metrics + scorecard (Sprint 33.5, prod grade).
 *
 * Executes each scenario against the CURRENT deterministic pipeline (routeModel
 * + planRetrieval), scores routing/planning/tool-selection/reasoning/memory,
 * derives quality metrics (latency, unnecessary/duplicate calls, hallucination
 * risk, context usage), and renders a human-readable scorecard. Pure + reusable;
 * no network, no model call, no production impact. The permanent AI benchmark.
 */

import { routeModel } from "../router";
import { planRetrieval, type ToolName } from "../planner/retrieval-planner";
import type { RouterSignals } from "../types";
import {
  EVAL_SCENARIOS,
  WIRED_CONTEXT_SOURCES,
  type EvalScenario,
} from "./scenarios";

export interface EvalResult {
  id: string;
  name: string;
  category: string;
  prompt: string;
  model: string;
  expectedModel: string;
  modelMatch: boolean;
  routeReason: string;
  intent: string;
  expectedIntent: string;
  intentMatch: boolean;
  toolsPlanned: ToolName[];
  expectedTools: ToolName[];
  toolMatch: boolean;
  forbiddenTools: ToolName[];
  forbiddenSatisfied: boolean;
  hasDuplicates: boolean;
  contextSource: string;
  contextWired: boolean;
  latencyMs: number;
  pass: boolean;
}

export interface EvalMetrics {
  routingAccuracy: number; // %
  planningCorrectness: number; // %
  toolAccuracy: number; // %
  reasoningScore: number; // %
  memoryUsage: number; // %
  contextUsage: number; // %
  overallScore: number; // %
  unnecessaryToolCalls: number;
  duplicateToolCalls: number;
  hallucinationRiskPct: number; // %
  latencyAvgMs: number;
  latencyMedianMs: number;
  latencyWorstMs: number;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  metrics: EvalMetrics;
  results: EvalResult[];
}

function signalsFor(prompt: string): RouterSignals {
  return {
    userMessage: prompt,
    approxInputTokens: Math.ceil(prompt.length / 4),
    toolRoundsSoFar: 0,
    stickyEscalated: false,
    opusAllowed: true,
  };
}

function evaluateScenario(s: EvalScenario): EvalResult {
  const t0 = performance.now();
  const decision = routeModel(signalsFor(s.prompt));
  const plan = planRetrieval(s.prompt);
  const latencyMs = Math.round((performance.now() - t0) * 1000) / 1000;

  const forbidden = s.forbiddenTools ?? [];
  const intentMatch = plan.intent === s.expectedIntent;
  const modelMatch = decision.model === s.expectedModel;
  const toolMatch = s.expectedTools.every((t) => plan.required.includes(t));
  const forbiddenSatisfied = forbidden.every((t) => !plan.required.includes(t));
  const hasDuplicates = new Set(plan.required).size !== plan.required.length;
  const contextWired = WIRED_CONTEXT_SOURCES.has(s.contextSource);

  return {
    id: s.id,
    name: s.name,
    category: s.category,
    prompt: s.prompt,
    model: decision.model,
    expectedModel: s.expectedModel,
    modelMatch,
    routeReason: decision.reason,
    intent: plan.intent,
    expectedIntent: s.expectedIntent,
    intentMatch,
    toolsPlanned: plan.required,
    expectedTools: s.expectedTools,
    toolMatch,
    forbiddenTools: forbidden,
    forbiddenSatisfied,
    hasDuplicates,
    contextSource: s.contextSource,
    contextWired,
    latencyMs,
    pass:
      intentMatch &&
      modelMatch &&
      toolMatch &&
      forbiddenSatisfied &&
      !hasDuplicates,
  };
}

const pct = (n: number, d: number): number =>
  d === 0 ? 100 : Math.round((n / d) * 100);

function computeMetrics(results: EvalResult[]): EvalMetrics {
  const n = results.length;
  const routingAccuracy = pct(results.filter((r) => r.modelMatch).length, n);
  const planningCorrectness = pct(results.filter((r) => r.intentMatch).length, n);
  const toolAccuracy = pct(results.filter((r) => r.toolMatch).length, n);

  // Reasoning = mean of the four per-scenario correctness signals.
  const reasoningScore =
    n === 0
      ? 100
      : Math.round(
          (results.reduce(
            (acc, r) =>
              acc +
              ([r.intentMatch, r.modelMatch, r.toolMatch, r.forbiddenSatisfied].filter(
                Boolean
              ).length /
                4),
            0
          ) /
            n) *
            100
        );

  // Context / memory usage = wired mechanisms backing the scenarios.
  const contextUsage = pct(results.filter((r) => r.contextWired).length, n);
  const memoryScenarios = results.filter((r) => r.contextSource === "memory");
  const memoryUsage = pct(
    memoryScenarios.filter((r) => r.contextWired).length,
    memoryScenarios.length
  );

  const unnecessaryToolCalls = results.filter((r) => !r.forbiddenSatisfied).length;
  const duplicateToolCalls = results.filter((r) => r.hasDuplicates).length;

  // Hallucination risk = metric-grounded scenarios that planned NO tool (model
  // would have to answer ungrounded). Lower is better.
  const metricScenarios = results.filter((r) => r.expectedTools.length > 0);
  const hallucinationRiskPct = pct(
    metricScenarios.filter((r) => r.toolsPlanned.length === 0).length,
    metricScenarios.length
  );

  const lat = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const latencyAvgMs =
    n === 0 ? 0 : Math.round((lat.reduce((s, x) => s + x, 0) / n) * 1000) / 1000;
  const latencyMedianMs = n === 0 ? 0 : lat[Math.floor(n / 2)];
  const latencyWorstMs = n === 0 ? 0 : lat[n - 1];

  const overallScore = Math.round(
    (routingAccuracy + planningCorrectness + toolAccuracy + reasoningScore + memoryUsage) /
      5
  );

  return {
    routingAccuracy,
    planningCorrectness,
    toolAccuracy,
    reasoningScore,
    memoryUsage,
    contextUsage,
    overallScore,
    unnecessaryToolCalls,
    duplicateToolCalls,
    hallucinationRiskPct,
    latencyAvgMs,
    latencyMedianMs,
    latencyWorstMs,
  };
}

export function runEvaluation(
  scenarios: EvalScenario[] = EVAL_SCENARIOS
): EvalSummary {
  const results = scenarios.map(evaluateScenario);
  const passed = results.filter((r) => r.pass).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    metrics: computeMetrics(results),
    results,
  };
}

function bar(p: number): string {
  const filled = Math.round((p / 100) * 20);
  return `${"█".repeat(filled)}${"░".repeat(20 - filled)} ${p}%`;
}

/** Human-readable scorecard report. */
export function formatReport(summary: EvalSummary): string {
  const m = summary.metrics;
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  AI EVALUATION REPORT — Ultrametrics Analyst (deterministic)");
  L.push("══════════════════════════════════════════════════════════════");
  L.push(`  Overall Score:  ${bar(m.overallScore)}`);
  L.push("");
  L.push(`  Routing         ${bar(m.routingAccuracy)}`);
  L.push(`  Planning        ${bar(m.planningCorrectness)}`);
  L.push(`  Tool Selection  ${bar(m.toolAccuracy)}`);
  L.push(`  Reasoning       ${bar(m.reasoningScore)}`);
  L.push(`  Memory          ${bar(m.memoryUsage)}`);
  L.push(`  Context Usage   ${bar(m.contextUsage)}`);
  L.push("");
  L.push("  Latency (deterministic layer):");
  L.push(
    `    avg ${m.latencyAvgMs} ms · median ${m.latencyMedianMs} ms · worst ${m.latencyWorstMs} ms`
  );
  L.push("");
  L.push("  Quality flags:");
  L.push(`    Unnecessary tool calls : ${m.unnecessaryToolCalls}`);
  L.push(`    Duplicate tool calls   : ${m.duplicateToolCalls}`);
  L.push(
    `    Hallucination risk     : ${m.hallucinationRiskPct}%  ${
      m.hallucinationRiskPct === 0 ? "PASS" : "FAIL"
    }`
  );
  L.push("");
  L.push("──────────────────────────────────────────────────────────────");
  L.push(`  Scenarios: ${summary.passed}/${summary.total} passed`);
  L.push("");

  for (const r of summary.results) {
    L.push(`  ${r.pass ? "PASS" : "FAIL"}  [${r.category}] ${r.name}`);
    if (!r.pass) {
      if (!r.intentMatch)
        L.push(`        intent ${r.intent} (expected ${r.expectedIntent})`);
      if (!r.modelMatch)
        L.push(`        model ${r.model} (expected ${r.expectedModel})`);
      if (!r.toolMatch)
        L.push(
          `        missing tools: ${r.expectedTools
            .filter((t) => !r.toolsPlanned.includes(t))
            .join(", ")}`
        );
      if (!r.forbiddenSatisfied)
        L.push(
          `        forced forbidden: ${r.forbiddenTools
            .filter((t) => r.toolsPlanned.includes(t))
            .join(", ")}`
        );
      if (r.hasDuplicates) L.push(`        duplicate tools planned`);
    }
  }

  L.push("");
  L.push("  Regression summary:");
  if (summary.failed === 0) {
    L.push("    No regressions — all scenarios within expected behaviour.");
  } else {
    for (const r of summary.results.filter((x) => !x.pass)) {
      L.push(`    - ${r.name}: review routing/plan for "${r.prompt}".`);
    }
  }

  L.push("");
  L.push("  Recommendations:");
  const recs: string[] = [];
  if (m.routingAccuracy < 100) recs.push("Tighten router escalation patterns.");
  if (m.planningCorrectness < 100) recs.push("Refine intent classifier patterns.");
  if (m.toolAccuracy < 100) recs.push("Adjust per-intent tool selection.");
  if (m.unnecessaryToolCalls > 0) recs.push("Remove forbidden-tool misroutes.");
  if (m.hallucinationRiskPct > 0)
    recs.push("Ensure metric questions always plan a grounding tool.");
  if (recs.length === 0) recs.push("None — baseline is healthy.");
  for (const r of recs) L.push(`    - ${r}`);

  L.push("");
  L.push(`  RESULT: ${summary.failed === 0 ? "PASS" : "FAIL"}`);
  L.push("  Scope: routing + tool-selection quality (deterministic). Prose");
  L.push("  grading requires a live model + grader and is out of scope.");
  L.push("──────────────────────────────────────────────────────────────");
  return L.join("\n");
}
