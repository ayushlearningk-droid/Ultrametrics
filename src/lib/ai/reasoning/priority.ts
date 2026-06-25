/**
 * Priority Engine (Sprint 34).
 *
 * Ranks recommendations by a composite of grounded factors: opportunity score,
 * estimated-impact magnitude, evidence strength (confidence), and a coarse
 * execution-effort heuristic inferred from the action kind. Pure + deterministic.
 * The composite is an internal ranking signal only — never shown as a metric.
 */

import type { RecInput, PrioritizedAction, Priority } from "./types";
import { recommendationConfidence } from "./confidence";

const EVIDENCE_WEIGHT: Record<string, number> = {
  strong: 1,
  moderate: 0.75,
  limited: 0.5,
};

/** Coarse effort multiplier — lower-effort, reversible actions rank slightly
 *  higher (faster to realize). Heuristic over the action text/kind, not data. */
function effortFactor(r: RecInput): number {
  const t = `${r.kind ?? ""} ${r.action}`.toLowerCase();
  if (/\b(pause|stop|disable|turn off)\b/.test(t)) return 1; // trivial, reversible
  if (/\b(budget|spend|reallocat|shift|bid|scale|increase|raise)\b/.test(t)) return 0.85;
  if (/\b(creative|test|launch|build|new)\b/.test(t)) return 0.7; // more effort
  return 0.8;
}

/** Largest projected impact magnitude (whole-number %), 0 when none provided. */
function impactMagnitude(r: RecInput): number {
  return (r.impactRanges ?? []).reduce((m, rg) => Math.max(m, rg.highPct ?? 0), 0);
}

/**
 * Composite ranking score. opportunity_score dominates; estimated impact adds
 * upside; evidence scales the whole thing down when weak; effort nudges
 * quick wins up. Deterministic and monotonic.
 */
export function scoreRecommendation(r: RecInput): number {
  const opp = typeof r.opportunityScore === "number" ? r.opportunityScore : 0;
  const base = opp + impactMagnitude(r);
  const ev = EVIDENCE_WEIGHT[r.evidenceLevel ?? "limited"] ?? 0.5;
  return Math.round(base * ev * effortFactor(r) * 100) / 100;
}

/** Rank → priority label (aligns with the Opportunity card's rank semantics). */
function priorityForRank(rank: number): Priority {
  if (rank === 0) return "High";
  if (rank === 1) return "Medium";
  return "Low";
}

/** Recommendation indices ordered best-first by composite score (stable). */
export function rankRecommendations(recs: RecInput[]): number[] {
  return recs
    .map((r, i) => ({ i, s: scoreRecommendation(r) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.i);
}

/** Final ordered, labelled action list. */
export function prioritize(recs: RecInput[]): PrioritizedAction[] {
  const order = rankRecommendations(recs);
  return order.map((idx, rank) => {
    const r = recs[idx];
    return {
      action: r.action,
      priority: priorityForRank(rank),
      score: scoreRecommendation(r),
      confidence: recommendationConfidence(r),
    };
  });
}
