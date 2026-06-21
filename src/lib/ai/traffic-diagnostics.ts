/**
 * Ask Ultrametrics — traffic objective diagnostics (AI-009 Phase 2A).
 *
 * Objective-aware opportunities for TRAFFIC campaigns, where conversions/ROAS are
 * not the goal. Pure rules over the per-campaign breakdown using ONLY engagement-
 * neutral signals already available: CTR, CPC, spend, clicks, impressions. NEVER
 * references revenue, ROAS, conversions, or pixel/funnel events.
 *
 * No I/O, no model calls, no new metrics. Operates on campaigns whose objective
 * classifies as "traffic"; other objectives are ignored here (Phase 2B).
 *
 * Emits up to five distinct recommendations:
 *   best_traffic_campaign / worst_traffic_campaign (CTR ranking),
 *   low_ctr / high_cpc (benchmark outliers), traffic_budget_reallocation.
 */

import type { CampaignBreakdown, MetricsProvider } from "@/lib/metrics/types";
import type {
  Recommendation,
  Confidence,
  RecEffect,
} from "@/lib/ai/recommendations";
import { classifyObjective } from "@/lib/ai/objective-classifier";
import { MIN_IMPRESSIONS, MIN_CLICKS } from "@/lib/ai/thresholds";
import {
  computeOpportunityScore,
  OBJECTIVE_SCORING,
  type OpportunityBreakdown,
} from "@/lib/ai/scoring/opportunity-score";

/* ── Thresholds ───────────────────────────────────────────────────────────── */

/** Need at least this many traffic campaigns to compare best vs worst. */
const MIN_TRAFFIC_CAMPAIGNS = 2;

/** CTR at/below this fraction of the traffic benchmark is "low". */
const LOW_CTR_RATIO = 0.5;

/** CPC at/above this multiple of the traffic benchmark is "high". */
const HIGH_CPC_RATIO = 2.0;

/** Share of the donor's spend to suggest reallocating. */
const REALLOCATION_FRACTION = 0.25;

/* ── Scoring (shared module, objective profile: ceiling 85, no revenue) ─────── */

/**
 * opportunityScore + breakdown via the shared scoring module (AI-010 Phase 1).
 * Blends spend exposure and per-kind severity, dampened by confidence. Identical
 * to the prior local formula: round(85 · confidenceWeight · (0.5·spend + 0.5·sev)).
 */
function opp(
  severity: number,
  spendShare: number,
  confidence: Confidence
): { opportunityScore: number; scoreBreakdown: OpportunityBreakdown } {
  const o = computeOpportunityScore({
    ceiling: OBJECTIVE_SCORING.ceiling,
    weights: OBJECTIVE_SCORING.weights,
    confidence,
    spendShare,
    severity,
  });
  return {
    opportunityScore: o.score,
    scoreBreakdown: { factors: o.factors, ceiling: o.ceiling },
  };
}

function money(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/**
 * Derive traffic opportunities for one provider's campaign breakdown. Returns []
 * when there are no traffic campaigns or too few to compare.
 */
export function deriveTrafficDiagnostics(
  campaigns: CampaignBreakdown[],
  currency: string,
  provider: MetricsProvider
): Recommendation[] {
  const traffic = campaigns.filter(
    (c) => classifyObjective(c.objective) === "traffic"
  );
  if (traffic.length === 0) return [];

  const accountSpend = traffic.reduce((acc, c) => acc + c.totals.spend, 0);
  const totalClicks = traffic.reduce((acc, c) => acc + c.totals.clicks, 0);
  const totalImpr = traffic.reduce((acc, c) => acc + c.totals.impressions, 0);
  const benchmarkCtr = totalImpr > 0 ? totalClicks / totalImpr : 0;
  const benchmarkCpc = totalClicks > 0 ? accountSpend / totalClicks : 0;

  const ctrQualified = traffic.filter(
    (c) => c.totals.impressions >= MIN_IMPRESSIONS
  );
  const cpcQualified = traffic.filter((c) => c.totals.clicks >= MIN_CLICKS);

  const recs: Recommendation[] = [];

  const base = (c: CampaignBreakdown) => ({
    provider,
    level: "campaign" as const,
    entityId: c.campaignId,
    entityName: c.campaignName,
  });
  const shareOf = (c: CampaignBreakdown) =>
    accountSpend > 0 ? c.totals.spend / accountSpend : 0;
  const confOf = (c: CampaignBreakdown): Confidence =>
    c.totals.impressions >= 2 * MIN_IMPRESSIONS ? "high" : "medium";

  // Best / Worst by CTR (needs ≥2 impression-qualified campaigns).
  let best: CampaignBreakdown | undefined;
  let worst: CampaignBreakdown | undefined;
  if (ctrQualified.length >= MIN_TRAFFIC_CAMPAIGNS) {
    const byCtr = [...ctrQualified].sort((a, b) => b.totals.ctr - a.totals.ctr);
    best = byCtr[0];
    worst = byCtr[byCtr.length - 1];

    recs.push({
      ...base(best),
      kind: "best_traffic_campaign",
      action: `Scale "${best.campaignName}" — your most efficient traffic campaign.`,
      impact: `CTR ${pct(best.totals.ctr)} vs traffic average ${pct(
        benchmarkCtr
      )} on ${money(best.totals.spend, currency)} (${best.totals.clicks} clicks).`,
      cta: `Show "${best.campaignName}" daily trend`,
      confidence: confOf(best),
      score: 0.6,
      ...opp(0.5, shareOf(best), confOf(best)),
    });

    recs.push({
      ...base(worst),
      kind: "worst_traffic_campaign",
      action: `Review "${worst.campaignName}" — your least efficient traffic campaign.`,
      impact: `CTR ${pct(worst.totals.ctr)} vs traffic average ${pct(
        benchmarkCtr
      )} on ${money(worst.totals.spend, currency)} (${worst.totals.clicks} clicks).`,
      cta: `Compare "${worst.campaignName}" to top traffic campaigns`,
      confidence: confOf(worst),
      score: 0.5,
      ...opp(0.4, shareOf(worst), confOf(worst)),
    });

    // low_ctr — worst campaign well below the traffic benchmark.
    if (benchmarkCtr > 0 && worst.totals.ctr <= LOW_CTR_RATIO * benchmarkCtr) {
      recs.push({
        ...base(worst),
        kind: "low_ctr",
        action: `Refresh creative or targeting for "${worst.campaignName}" — low click-through rate.`,
        impact: `CTR ${pct(worst.totals.ctr)} is well below the traffic average ${pct(
          benchmarkCtr
        )} over ${worst.totals.impressions} impressions.`,
        cta: `Show best-performing traffic ads`,
        confidence: confOf(worst),
        score: 0.6,
        ...opp(0.6, shareOf(worst), confOf(worst)),
      });
    }
  }

  // high_cpc — most expensive clicks vs the traffic benchmark.
  if (cpcQualified.length > 0 && benchmarkCpc > 0) {
    const topCpc = [...cpcQualified].sort(
      (a, b) => b.totals.cpc - a.totals.cpc
    )[0];
    if (topCpc.totals.cpc >= HIGH_CPC_RATIO * benchmarkCpc) {
      recs.push({
        ...base(topCpc),
        kind: "high_cpc",
        action: `Review bids or targeting for "${topCpc.campaignName}" — high cost per click.`,
        impact: `CPC ${money(topCpc.totals.cpc, currency)} vs traffic average ${money(
          benchmarkCpc,
          currency
        )} over ${topCpc.totals.clicks} clicks.`,
        cta: `Show "${topCpc.campaignName}" breakdown`,
        confidence: topCpc.totals.clicks >= 2 * MIN_CLICKS ? "high" : "medium",
        score: 0.6,
        ...opp(
          0.6,
          shareOf(topCpc),
          topCpc.totals.clicks >= 2 * MIN_CLICKS ? "high" : "medium"
        ),
      });
    }
  }

  // traffic_budget_reallocation — shift from worst to best (by CTR efficiency).
  if (best && worst && best.campaignId !== worst.campaignId) {
    const amount = worst.totals.spend * REALLOCATION_FRACTION;
    const conf: Confidence =
      worst.totals.spend >= 2 * MIN_CLICKS ? "high" : "medium";
    recs.push({
      provider,
      level: "account",
      entityId: "account",
      entityName: "your account",
      kind: "traffic_budget_reallocation",
      action: `Shift budget from "${worst.campaignName}" to "${best.campaignName}".`,
      impact: `"${worst.campaignName}" (CTR ${pct(
        worst.totals.ctr
      )}) underperforms "${best.campaignName}" (CTR ${pct(
        best.totals.ctr
      )}); consider moving ~${money(amount, currency)} (25% of its ${money(
        worst.totals.spend,
        currency
      )} spend).`,
      cta: `Compare "${worst.campaignName}" and "${best.campaignName}"`,
      confidence: conf,
      score: 0.7,
      ...opp(0.7, shareOf(worst), conf),
      // AI-014A.1: reallocatable donor spend (25% fraction) — internal.
      effect: {
        metric: "recoverable_spend",
        spend: worst.totals.spend,
        fraction: REALLOCATION_FRACTION,
      } satisfies RecEffect,
    });
  }

  return recs;
}
