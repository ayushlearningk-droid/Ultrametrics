/**
 * Ask Ultrametrics — engagement objective diagnostics (AI-009 Phase 2B-Eng).
 *
 * Objective-aware opportunities for ENGAGEMENT campaigns, where conversions/ROAS
 * are not the goal. Pure rules over the per-campaign breakdown using ONLY
 * engagement signals: post_engagement (canonical), impressions, spend. NEVER
 * references revenue, ROAS, conversions, or pixel/funnel events.
 *
 * Canonical metric = postEngagement (Meta's aggregate). pageEngagement/linkClicks
 * overlap and are intentionally NOT used here (double counting).
 *
 * Engagement rate = postEngagement / impressions; CPE = spend / postEngagement.
 *
 * Emits up to four distinct recommendations:
 *   best_engagement_campaign / worst_engagement_campaign (rate ranking),
 *   low_engagement_rate / high_cost_per_engagement (benchmark outliers).
 */

import type { CampaignBreakdown, MetricsProvider } from "@/lib/metrics/types";
import type { Recommendation, Confidence } from "@/lib/ai/recommendations";
import { classifyObjective } from "@/lib/ai/objective-classifier";
import { MIN_IMPRESSIONS } from "@/lib/ai/thresholds";
import {
  computeOpportunityScore,
  OBJECTIVE_SCORING,
  type OpportunityBreakdown,
} from "@/lib/ai/scoring/opportunity-score";

/* ── Thresholds ───────────────────────────────────────────────────────────── */

/** Need at least this many engagement campaigns to compare best vs worst. */
const MIN_ENGAGEMENT_CAMPAIGNS = 2;

/** Minimum post engagements before a CPE outlier is trustworthy. */
const MIN_ENGAGEMENTS = 50;

/** Engagement rate at/below this fraction of the benchmark is "low". */
const LOW_RATE_RATIO = 0.5;

/** CPE at/above this multiple of the benchmark is "high". */
const HIGH_CPE_RATIO = 2.0;

/* ── Scoring (shared module, objective profile: ceiling 85, no revenue) ─────── */

/**
 * opportunityScore + breakdown via the shared scoring module (AI-010 Phase 1).
 * Identical to the prior local formula:
 * round(85 · confidenceWeight · (0.5·spend + 0.5·sev)).
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

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Canonical engagement count for a campaign (0 when absent). */
function eng(c: CampaignBreakdown): number {
  return c.engagement?.postEngagement ?? 0;
}

/** Engagement rate = postEngagement / impressions (0 when no impressions). */
function engRate(c: CampaignBreakdown): number {
  const i = c.totals.impressions;
  return i > 0 ? eng(c) / i : 0;
}

/** CPE = spend / postEngagement (0 when no engagements). */
function cpe(c: CampaignBreakdown): number {
  const e = eng(c);
  return e > 0 ? c.totals.spend / e : 0;
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/**
 * Derive engagement opportunities for one provider's campaign breakdown. Returns
 * [] when there are no engagement campaigns or too few to compare.
 */
export function deriveEngagementDiagnostics(
  campaigns: CampaignBreakdown[],
  currency: string,
  provider: MetricsProvider
): Recommendation[] {
  const engagement = campaigns.filter(
    (c) => classifyObjective(c.objective) === "engagement"
  );
  if (engagement.length === 0) return [];

  const accountSpend = engagement.reduce((acc, c) => acc + c.totals.spend, 0);
  const totalEng = engagement.reduce((acc, c) => acc + eng(c), 0);
  const totalImpr = engagement.reduce(
    (acc, c) => acc + c.totals.impressions,
    0
  );
  const benchmarkRate = totalImpr > 0 ? totalEng / totalImpr : 0;
  const benchmarkCPE = totalEng > 0 ? accountSpend / totalEng : 0;

  const rateQualified = engagement.filter(
    (c) => c.totals.impressions >= MIN_IMPRESSIONS
  );
  const cpeQualified = engagement.filter((c) => eng(c) >= MIN_ENGAGEMENTS);

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

  // Best / Worst by engagement rate (needs ≥2 impression-qualified campaigns).
  let best: CampaignBreakdown | undefined;
  let worst: CampaignBreakdown | undefined;
  if (rateQualified.length >= MIN_ENGAGEMENT_CAMPAIGNS) {
    const byRate = [...rateQualified].sort((a, b) => engRate(b) - engRate(a));
    best = byRate[0];
    worst = byRate[byRate.length - 1];

    recs.push({
      ...base(best),
      kind: "best_engagement_campaign",
      action: `Scale "${best.campaignName}" — your most engaging campaign.`,
      impact: `Engagement rate ${pct(engRate(best))} vs average ${pct(
        benchmarkRate
      )} on ${money(best.totals.spend, currency)} (${eng(
        best
      )} engagements).`,
      cta: `Show "${best.campaignName}" daily trend`,
      confidence: confOf(best),
      score: 0.6,
      ...opp(0.5, shareOf(best), confOf(best)),
    });

    recs.push({
      ...base(worst),
      kind: "worst_engagement_campaign",
      action: `Review "${worst.campaignName}" — your least engaging campaign.`,
      impact: `Engagement rate ${pct(engRate(worst))} vs average ${pct(
        benchmarkRate
      )} on ${money(worst.totals.spend, currency)} (${eng(
        worst
      )} engagements).`,
      cta: `Compare "${worst.campaignName}" to top engagement campaigns`,
      confidence: confOf(worst),
      score: 0.5,
      ...opp(0.4, shareOf(worst), confOf(worst)),
    });

    // low_engagement_rate — worst well below the engagement benchmark.
    if (benchmarkRate > 0 && engRate(worst) <= LOW_RATE_RATIO * benchmarkRate) {
      recs.push({
        ...base(worst),
        kind: "low_engagement_rate",
        action: `Refresh creative or targeting for "${worst.campaignName}" — low engagement rate.`,
        impact: `Engagement rate ${pct(
          engRate(worst)
        )} is well below the average ${pct(benchmarkRate)} over ${
          worst.totals.impressions
        } impressions.`,
        cta: `Show best-performing engagement ads`,
        confidence: confOf(worst),
        score: 0.6,
        ...opp(0.6, shareOf(worst), confOf(worst)),
      });
    }
  }

  // high_cost_per_engagement — most expensive engagements vs the benchmark.
  if (cpeQualified.length > 0 && benchmarkCPE > 0) {
    const topCpe = [...cpeQualified].sort((a, b) => cpe(b) - cpe(a))[0];
    if (cpe(topCpe) >= HIGH_CPE_RATIO * benchmarkCPE) {
      const conf: Confidence =
        eng(topCpe) >= 2 * MIN_ENGAGEMENTS ? "high" : "medium";
      recs.push({
        ...base(topCpe),
        kind: "high_cost_per_engagement",
        action: `Review bids or targeting for "${topCpe.campaignName}" — high cost per engagement.`,
        impact: `CPE ${money(cpe(topCpe), currency)} vs average ${money(
          benchmarkCPE,
          currency
        )} over ${eng(topCpe)} engagements.`,
        cta: `Show "${topCpe.campaignName}" breakdown`,
        confidence: conf,
        score: 0.6,
        ...opp(0.6, shareOf(topCpe), conf),
      });
    }
  }

  return recs;
}
