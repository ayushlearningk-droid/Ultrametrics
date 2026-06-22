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
} from "@/lib/ai/root-cause/root-cause";

/** Max root causes returned per provider (highest-spend underperformers). */
const ROOT_CAUSE_CAP = 5;

/**
 * Derive root causes for a provider's MetricSet: one per underperforming
 * campaign, highest-spend first, capped at {@link ROOT_CAUSE_CAP}. Returns [] when
 * there is no per-campaign breakdown or no campaign triggers a cause.
 */
export function deriveRootCauses(set: MetricSet): RootCauseAnalysis[] {
  const campaigns = set.campaigns ?? [];
  if (campaigns.length === 0) return [];

  const benchmark = set.totals;
  const accountSpend = set.totals.spend;

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
    .sort((a, b) => b.spend - a.spend)
    .slice(0, ROOT_CAUSE_CAP)
    .map((x) => x.analysis);
}
