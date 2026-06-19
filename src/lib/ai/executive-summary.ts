/**
 * Ask Ultrametrics — executive summary composer (AI-009, V1).
 *
 * Pure selection/ordering over already-computed pieces (totals, recommendations,
 * funnel diagnosis). Produces ONE account-level summary per provider — never
 * blends across providers or currencies. No I/O, no new scoring: it reuses the
 * AI-007 opportunityScore to pick the single top opportunity.
 *
 * V1 sections: headline, top opportunity, funnel status, watch-outs.
 * (Creative highlight is intentionally deferred.)
 */

import type { Recommendation, RecommendationKind } from "@/lib/ai/recommendations";
import type { FunnelDiagnosis } from "@/lib/ai/funnel-intelligence";

/* ── Types ────────────────────────────────────────────────────────────────── */

/** Headline numbers (per provider, in that provider's own currency). */
export interface SummaryHeadline {
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
}

export interface SummaryOpportunity {
  kind: RecommendationKind;
  action: string;
  impact: string;
  confidence: "high" | "medium" | "low";
  opportunity_score: number;
}

export type FunnelState = "healthy" | "issue" | "insufficient_data";

export interface ExecutiveSummary {
  provider: string;
  status: string;
  window_used: string;
  currency?: string;
  headline: SummaryHeadline | null;
  top_opportunity: SummaryOpportunity | null;
  funnel_status: { state: FunnelState; detail?: string };
  watch_outs: string[];
}

export interface ExecutiveSummaryInput {
  provider: string;
  status: string;
  windowUsed: string;
  currency?: string;
  /** Derived totals when status is ok; null otherwise. */
  totals: SummaryHeadline | null;
  /** Provider recommendations, already including any funnel diagnosis. */
  recommendations: Recommendation[];
  /** Funnel diagnosis for the funnel-status section; null = insufficient data. */
  funnelDiagnosis: FunnelDiagnosis | null;
}

/* ── Composer ─────────────────────────────────────────────────────────────── */

/**
 * Compose one provider's executive summary. Pure: selects the highest-opportunity
 * recommendation, maps the funnel diagnosis to a status, and collects watch-outs
 * (source health + tracking gaps). Numbers are passed through verbatim.
 */
export function composeExecutiveSummary(
  input: ExecutiveSummaryInput
): ExecutiveSummary {
  const { provider, status, windowUsed, currency, totals } = input;

  // Top opportunity = highest opportunityScore (defensive re-sort).
  const ranked = [...input.recommendations].sort(
    (a, b) => b.opportunityScore - a.opportunityScore
  );
  const top = ranked[0];
  const top_opportunity: SummaryOpportunity | null = top
    ? {
        kind: top.kind,
        action: top.action,
        impact: top.impact,
        confidence: top.confidence,
        opportunity_score: top.opportunityScore,
      }
    : null;

  // Funnel status from the diagnosis (null = below volume floor).
  let funnel_status: ExecutiveSummary["funnel_status"];
  if (!input.funnelDiagnosis) {
    funnel_status = { state: "insufficient_data" };
  } else if (input.funnelDiagnosis.kind === "funnel_healthy") {
    funnel_status = { state: "healthy", detail: input.funnelDiagnosis.impact };
  } else {
    funnel_status = {
      state: "issue",
      detail: `${input.funnelDiagnosis.action} ${input.funnelDiagnosis.impact}`,
    };
  }

  // Watch-outs: degraded source + tracking gap (gates trust in the numbers).
  const watch_outs: string[] = [];
  if (status !== "ok") {
    watch_outs.push(`Source ${provider} returned "${status}".`);
  }
  const tracking = input.recommendations.find(
    (r) => r.kind === "tracking_issue"
  );
  if (tracking) {
    watch_outs.push(
      `Conversion tracking gap — ${tracking.impact} Metrics may be unreliable until fixed.`
    );
  }

  return {
    provider,
    status,
    window_used: windowUsed,
    ...(currency ? { currency } : {}),
    headline: totals,
    top_opportunity,
    funnel_status,
    watch_outs,
  };
}
