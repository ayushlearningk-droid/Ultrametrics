/**
 * Ask Ultrametrics — Root Cause engine (AI-015 Phase 1).
 *
 * Pure synthesis over a single campaign's metric profile vs the account
 * benchmark. Turns symptom-level deviations into ONE confidence-tagged primary
 * cause (a hypothesis, never a proven claim) with grounded evidence, an ordinal
 * severity, and an ordered fix plan. Read-only: no I/O, no model calls, no
 * mutation; never touches scoring or ranking.
 *
 * Phase 1 supports three causes: tracking_gap, creative_weakness,
 * bidding_inefficiency. Thresholds mirror the deterministic rule engine
 * (recommendations.ts) so root cause never contradicts the existing
 * creative_refresh / bid_review / tracking_issue diagnoses. tracking_gap takes
 * precedence (zero-conversion/zero-revenue data is untrustworthy, so CTR/CPC
 * deviations computed on it can't be the primary story — mirrors AI-005A
 * Tracking Mode).
 */

import type { MetricTotals } from "@/lib/metrics/types";
import { MIN_IMPRESSIONS, MIN_CLICKS } from "@/lib/ai/thresholds";
import { classifyObjective } from "@/lib/ai/objective-classifier";

/* ── Public types ─────────────────────────────────────────────────────────── */

export type CauseKind =
  | "tracking_gap"
  | "creative_weakness"
  | "bidding_inefficiency";

export type CauseConfidence = "high" | "medium" | "low";

export type CauseSeverity = "critical" | "high" | "medium" | "low";

export interface RootCauseAnalysis {
  campaignId: string;
  campaignName: string;
  /** The single most likely cause (a hypothesis, not a proven claim). */
  primaryCause: CauseKind;
  confidence: CauseConfidence;
  severity: CauseSeverity;
  /** Grounded numbers vs benchmark + volume; relayed verbatim, never invented. */
  evidence: string;
  /** Ordered remediation steps for the primary cause. */
  fixOrder: string[];
  /** Other triggered causes, demoted below the primary one (omitted if none). */
  contributors?: CauseKind[];
}

export interface RootCauseInput {
  campaignId: string;
  campaignName: string;
  totals: MetricTotals;
  /** Provider campaign objective (AI-008), e.g. "OUTCOME_SALES". */
  objective?: string;
}

/* ── Thresholds (mirror recommendations.ts for cross-engine consistency) ────── */

/** CTR at/below this fraction of the benchmark is a creative-weakness signal. */
const CREATIVE_CTR_RATIO = 0.5;
/** CPC at/above this multiple of the benchmark is a bidding-inefficiency signal. */
const BID_CPC_RATIO = 2.0;
/** Minimum spend before a tracking gap is worth flagging. */
const TRACKING_MIN_SPEND = 100;
/** Spend at/above this makes a tracking gap high-confidence / critical. */
const TRACKING_HIGH_SPEND = 500;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Volume → confidence tier against a shared floor (≥2× high, ≥1× medium). */
function confidenceFromVolume(volume: number, floor: number): CauseConfidence {
  if (volume >= 2 * floor) return "high";
  if (volume >= floor) return "medium";
  return "low";
}

/**
 * Ordinal severity from a composite of budget exposure and deviation magnitude.
 * Pure ordinal — NOT the 0-100 opportunity score and never used for ranking.
 */
function severityFromScore(s: number): CauseSeverity {
  if (s >= 0.7) return "critical";
  if (s >= 0.45) return "high";
  if (s >= 0.25) return "medium";
  return "low";
}

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

function money(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

/* ── Per-cause fix plans (static, ordered) ────────────────────────────────── */

const FIX_ORDER: Record<CauseKind, string[]> = {
  tracking_gap: [
    "Verify the conversion pixel/event is firing.",
    "Confirm conversion events are mapped in the platform.",
    "Re-check attribution settings before trusting these metrics.",
  ],
  creative_weakness: [
    "Refresh the creative (new hook or visual).",
    "Tighten audience targeting.",
    "Test a new angle or format.",
  ],
  bidding_inefficiency: [
    "Lower bids or switch to automated (target-CPA) bidding.",
    "Add negative keywords / audience exclusions.",
    "Improve ad relevance and quality.",
  ],
};

/* ── Engine ───────────────────────────────────────────────────────────────── */

/**
 * Derive the root cause for one underperforming campaign, or null when none of
 * the three Phase-1 causes triggers. `accountSpend` is the provider's total
 * spend, used only for the (ordinal) severity's budget-exposure term.
 */
export function deriveRootCause(
  input: RootCauseInput,
  benchmark: MetricTotals,
  accountSpend: number
): RootCauseAnalysis | null {
  const t = input.totals;
  const currency = ""; // caller has currency; evidence keeps it neutral here.
  const isConversion = classifyObjective(input.objective) === "conversion";
  const exposure = accountSpend > 0 ? clamp01(t.spend / accountSpend) : 0;

  const base = {
    campaignId: input.campaignId,
    campaignName: input.campaignName,
  };

  // Which causes are present (in precedence order).
  const triggered: CauseKind[] = [];

  // 1. tracking_gap — conversion objective, real spend, no conversions/revenue.
  const trackingGap =
    isConversion &&
    t.spend >= TRACKING_MIN_SPEND &&
    t.conversions === 0 &&
    t.revenue === 0;
  if (trackingGap) triggered.push("tracking_gap");

  // 2. creative_weakness — CTR well below benchmark, enough impressions.
  const creativeWeak =
    benchmark.ctr > 0 &&
    t.impressions >= MIN_IMPRESSIONS &&
    t.ctr <= CREATIVE_CTR_RATIO * benchmark.ctr;
  if (creativeWeak) triggered.push("creative_weakness");

  // 3. bidding_inefficiency — CPC well above benchmark, enough clicks.
  const biddingBad =
    benchmark.cpc > 0 &&
    t.clicks >= MIN_CLICKS &&
    t.cpc >= BID_CPC_RATIO * benchmark.cpc;
  if (biddingBad) triggered.push("bidding_inefficiency");

  if (triggered.length === 0) return null;

  // tracking_gap dominates when present (untrustworthy data); otherwise pick the
  // higher-severity of the metric causes, tie-break bidding > creative.
  let primaryCause: CauseKind;
  if (trackingGap) {
    primaryCause = "tracking_gap";
  } else {
    const ctrDev =
      benchmark.ctr > 0 ? (benchmark.ctr - t.ctr) / benchmark.ctr : 0;
    const cpcDev =
      benchmark.cpc > 0 ? (t.cpc - benchmark.cpc) / benchmark.cpc : 0;
    const creativeScore = 0.5 * exposure + 0.5 * clamp01(ctrDev);
    const biddingScore = 0.5 * exposure + 0.5 * clamp01(cpcDev);
    if (creativeWeak && biddingBad) {
      primaryCause =
        biddingScore >= creativeScore
          ? "bidding_inefficiency"
          : "creative_weakness";
    } else {
      primaryCause = creativeWeak ? "creative_weakness" : "bidding_inefficiency";
    }
  }

  const contributors = triggered.filter((c) => c !== primaryCause);

  // Confidence + severity + evidence for the primary cause.
  let confidence: CauseConfidence;
  let severity: CauseSeverity;
  let evidence: string;

  if (primaryCause === "tracking_gap") {
    confidence = t.spend >= TRACKING_HIGH_SPEND ? "high" : "medium";
    severity = t.spend >= TRACKING_HIGH_SPEND ? "critical" : "high";
    evidence = `${money(
      t.spend,
      currency
    ).trim()} spent with 0 conversions and 0 revenue over ${t.clicks} clicks.`;
  } else if (primaryCause === "creative_weakness") {
    const dev = clamp01((benchmark.ctr - t.ctr) / benchmark.ctr);
    confidence = confidenceFromVolume(t.impressions, MIN_IMPRESSIONS);
    severity = severityFromScore(0.5 * exposure + 0.5 * dev);
    evidence = `CTR ${pct(t.ctr)} vs ${pct(benchmark.ctr)} benchmark over ${
      t.impressions
    } impressions.`;
  } else {
    const dev = clamp01((t.cpc - benchmark.cpc) / benchmark.cpc);
    confidence = confidenceFromVolume(t.clicks, MIN_CLICKS);
    severity = severityFromScore(0.5 * exposure + 0.5 * dev);
    evidence = `CPC ${money(t.cpc, currency).trim()} vs ${money(
      benchmark.cpc,
      currency
    ).trim()} benchmark over ${t.clicks} clicks.`;
  }

  return {
    ...base,
    primaryCause,
    confidence,
    severity,
    evidence,
    fixOrder: FIX_ORDER[primaryCause],
    ...(contributors.length > 0 ? { contributors } : {}),
  };
}
