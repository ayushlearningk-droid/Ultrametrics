/**
 * Ask Ultrametrics — Root Cause orchestrator (AI-015 Phase 2).
 *
 * Runs the pure Phase-1 engine (deriveRootCause) over a provider's per-campaign
 * breakdown: keeps only underperformers (the engine returns null when no cause
 * triggers) and caps the result to the Top 5 by campaign spend. Pure selection —
 * no I/O, no scoring, no ranking; the engine does all the diagnosis.
 */

import type { MetricSet } from "@/lib/metrics/types";
import {
  deriveRootCause,
  type RootCauseAnalysis,
  type CauseKind,
} from "@/lib/ai/root-cause/root-cause";

/** Max root causes returned per provider (highest-spend underperformers). */
const ROOT_CAUSE_CAP = 5;

/** Headline metric a change question is about (Sprint: metric-aware diagnosis). */
export type RootCauseMetric = "roas" | "ctr" | "cpc" | "conversions";

/**
 * The cause most relevant to each headline metric. When a metric-change question
 * supplies a metric, campaigns whose primary cause matches it are surfaced FIRST
 * (so a CTR question leads with creative weakness, a CPC question with bidding,
 * etc.) — spend remains the tie-break, and all per-campaign cause math is
 * unchanged. CTR is a creative signal; CPC a bidding signal; conversions/ROAS
 * rest on conversion tracking.
 */
const METRIC_PREFERRED_CAUSE: Record<RootCauseMetric, CauseKind> = {
  ctr: "creative_weakness",
  cpc: "bidding_inefficiency",
  conversions: "tracking_gap",
  roas: "tracking_gap",
};

/**
 * Derive root causes for a provider's MetricSet: one per underperforming
 * campaign, capped at {@link ROOT_CAUSE_CAP}. Ordering: when `metric` is given,
 * campaigns whose primary cause matches that metric come first (tie-break spend
 * desc); otherwise highest-spend first (unchanged). Returns [] when there is no
 * per-campaign breakdown or no campaign triggers a cause.
 */
export function deriveRootCauses(
  set: MetricSet,
  metric?: RootCauseMetric
): RootCauseAnalysis[] {
  const campaigns = set.campaigns ?? [];
  if (campaigns.length === 0) return [];

  const benchmark = set.totals;
  const accountSpend = set.totals.spend;
  const preferred = metric ? METRIC_PREFERRED_CAUSE[metric] : null;

  return campaigns
    .map((c) => ({
      spend: c.totals.spend,
      analysis: deriveRootCause(
        {
          campaignId: c.campaignId,
          campaignName: c.campaignName,
          totals: c.totals,
          ...(c.objective ? { objective: c.objective } : {}),
        },
        benchmark,
        accountSpend
      ),
    }))
    .filter(
      (x): x is { spend: number; analysis: RootCauseAnalysis } =>
        x.analysis !== null
    )
    .sort((a, b) => {
      // Metric-aware: matching primary cause first, then highest spend.
      if (preferred) {
        const am = a.analysis.primaryCause === preferred ? 0 : 1;
        const bm = b.analysis.primaryCause === preferred ? 0 : 1;
        if (am !== bm) return am - bm;
      }
      return b.spend - a.spend;
    })
    .slice(0, ROOT_CAUSE_CAP)
    .map((x) => x.analysis);
}
