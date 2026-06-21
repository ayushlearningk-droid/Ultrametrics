/**
 * Ask Ultrametrics — messaging objective diagnostics (AI-009 Phase 2C, Phase 1).
 *
 * Objective-aware opportunities for MESSAGES campaigns, where conversions/ROAS
 * are not the goal. Pure rules over the per-campaign breakdown using ONLY the
 * messaging signal: messaging conversations started (canonical), impressions,
 * spend. NEVER references revenue, ROAS, conversions, or pixel/funnel events.
 *
 * Canonical metric = messaging.conversations (Meta
 * onsite_conversion.messaging_conversation_started_7d). Conversation rate =
 * conversations / impressions.
 *
 * Phase 1 scope: only the best/worst ranking pair —
 *   best_messaging_campaign / worst_messaging_campaign.
 * The benchmark-outlier rules (low_conversation_rate / high_cost_per_conversation)
 * and messaging budget reallocation are intentionally NOT implemented yet.
 */

import type { CampaignBreakdown, MetricsProvider } from "@/lib/metrics/types";
import type { Recommendation, Confidence } from "@/lib/ai/recommendations";
import { classifyObjective } from "@/lib/ai/objective-classifier";
import { MIN_IMPRESSIONS } from "@/lib/ai/thresholds";

/* ── Thresholds ───────────────────────────────────────────────────────────── */

/** Need at least this many messaging campaigns to compare best vs worst. */
const MIN_MESSAGING_CAMPAIGNS = 2;

/* ── Scoring (capped < 100, mirrors the AI-007 contract) ──────────────────── */

const SCORE_CEILING = 85;
const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function score(
  severity: number,
  spendShare: number,
  confidence: Confidence
): number {
  const composite = 0.5 * clamp01(spendShare) + 0.5 * clamp01(severity);
  return Math.round(SCORE_CEILING * CONFIDENCE_WEIGHT[confidence] * composite);
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

/** Canonical messaging conversation count for a campaign (0 when absent). */
function conv(c: CampaignBreakdown): number {
  return c.messaging?.conversations ?? 0;
}

/** Conversation rate = conversations / impressions (0 when no impressions). */
function convRate(c: CampaignBreakdown): number {
  const i = c.totals.impressions;
  return i > 0 ? conv(c) / i : 0;
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/**
 * Derive messaging opportunities for one provider's campaign breakdown. Returns
 * [] when there are no messaging campaigns or too few to compare.
 */
export function deriveMessagingDiagnostics(
  campaigns: CampaignBreakdown[],
  currency: string,
  provider: MetricsProvider
): Recommendation[] {
  const messaging = campaigns.filter(
    (c) => classifyObjective(c.objective) === "messages"
  );
  if (messaging.length === 0) return [];

  const accountSpend = messaging.reduce((acc, c) => acc + c.totals.spend, 0);
  const totalConv = messaging.reduce((acc, c) => acc + conv(c), 0);
  const totalImpr = messaging.reduce(
    (acc, c) => acc + c.totals.impressions,
    0
  );
  const benchmarkRate = totalImpr > 0 ? totalConv / totalImpr : 0;

  const rateQualified = messaging.filter(
    (c) => c.totals.impressions >= MIN_IMPRESSIONS
  );

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

  // Best / Worst by conversation rate (needs ≥2 impression-qualified campaigns).
  if (rateQualified.length >= MIN_MESSAGING_CAMPAIGNS) {
    const byRate = [...rateQualified].sort(
      (a, b) => convRate(b) - convRate(a)
    );
    const best = byRate[0];
    const worst = byRate[byRate.length - 1];

    recs.push({
      ...base(best),
      kind: "best_messaging_campaign",
      action: `Scale "${best.campaignName}" — your most efficient messaging campaign.`,
      impact: `Conversation rate ${pct(convRate(best))} vs average ${pct(
        benchmarkRate
      )} on ${money(best.totals.spend, currency)} (${conv(
        best
      )} conversations).`,
      cta: `Show "${best.campaignName}" daily trend`,
      confidence: confOf(best),
      score: 0.6,
      opportunityScore: score(0.5, shareOf(best), confOf(best)),
    });

    recs.push({
      ...base(worst),
      kind: "worst_messaging_campaign",
      action: `Review "${worst.campaignName}" — your least efficient messaging campaign.`,
      impact: `Conversation rate ${pct(convRate(worst))} vs average ${pct(
        benchmarkRate
      )} on ${money(worst.totals.spend, currency)} (${conv(
        worst
      )} conversations).`,
      cta: `Compare "${worst.campaignName}" to top messaging campaigns`,
      confidence: confOf(worst),
      score: 0.5,
      opportunityScore: score(0.4, shareOf(worst), confOf(worst)),
    });
  }

  return recs;
}
