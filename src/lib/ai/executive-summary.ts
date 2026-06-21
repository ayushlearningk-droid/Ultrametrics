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
import type { PixelDiagnosis } from "@/lib/ai/pixel-diagnostics";
import {
  contributions,
  type FactorContribution,
} from "@/lib/ai/intelligence/opportunity-breakdown";
import {
  evidenceStrength,
  type EvidenceStrength,
} from "@/lib/ai/intelligence/evidence-strength";
import { buildWhy, type Why } from "@/lib/ai/intelligence/rationale";

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
  /** AI-010A (#3): evidence strength behind this opportunity. */
  evidence_strength?: EvidenceStrength;
  /** AI-010A (#2): structured rationale (present when a breakdown exists). */
  why?: Why;
  /** AI-010A (#1): per-factor contributions (present when a breakdown exists). */
  opportunity_breakdown?: FactorContribution[];
}

export type FunnelState = "healthy" | "issue" | "insufficient_data";

export interface ExecutiveSummary {
  provider: string;
  status: string;
  window_used: string;
  currency?: string;
  /** Upstream provider error message when status === "error" (else omitted). */
  message?: string;
  headline: SummaryHeadline | null;
  top_opportunity: SummaryOpportunity | null;
  /** AI-010A (#5/#6): top-N ranked opportunities (V2). Empty when none. */
  top_opportunities: SummaryOpportunity[];
  /** AI-010A: marks the V2 (enriched) summary shape. */
  summary_version: 2;
  funnel_status: { state: FunnelState; detail?: string };
  watch_outs: string[];
}

export interface ExecutiveSummaryInput {
  provider: string;
  status: string;
  windowUsed: string;
  currency?: string;
  /** Upstream provider error message when status === "error"; surfaced structurally. */
  message?: string;
  /** Derived totals when status is ok; null otherwise. */
  totals: SummaryHeadline | null;
  /** Provider recommendations, already including any funnel diagnosis. */
  recommendations: Recommendation[];
  /** Funnel diagnosis for the funnel-status section; null = insufficient data. */
  funnelDiagnosis: FunnelDiagnosis | null;
  /** Pixel diagnosis when it fires (never pixel_healthy); supersedes tracking. */
  pixelDiagnosis?: PixelDiagnosis | null;
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
  const { provider, status, windowUsed, currency, message, totals } = input;

  // Top opportunity = highest opportunityScore (defensive re-sort).
  const ranked = [...input.recommendations].sort(
    (a, b) => b.opportunityScore - a.opportunityScore
  );

  // AI-010A: enrich each opportunity additively (evidence #3, why #2,
  // breakdown #1). Reads only — opportunityScore is never recomputed.
  const toOpportunity = (r: Recommendation): SummaryOpportunity => {
    const evidence = evidenceStrength(r);
    const base: SummaryOpportunity = {
      kind: r.kind,
      action: r.action,
      impact: r.impact,
      confidence: r.confidence,
      opportunity_score: r.opportunityScore,
      evidence_strength: evidence,
    };
    if (r.scoreBreakdown) {
      const contribs = contributions(r.scoreBreakdown);
      base.opportunity_breakdown = contribs;
      base.why = buildWhy(r, contribs, evidence);
    }
    return base;
  };

  // AI-010A (#5/#6): top-3 ranked opportunities, plus v1 single top for compat.
  const top_opportunities = ranked.slice(0, 3).map(toOpportunity);
  const top_opportunity: SummaryOpportunity | null =
    top_opportunities[0] ?? null;

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

  // Watch-outs: degraded source + pixel/tracking gap (gate trust in the numbers).
  const watch_outs: string[] = [];
  if (status !== "ok") {
    watch_outs.push(`Source ${provider} returned "${status}".`);
  }
  if (input.pixelDiagnosis) {
    // Pixel issue supersedes the coarse tracking_issue watch-out.
    watch_outs.push(`Pixel: ${input.pixelDiagnosis.impact}`);
  } else {
    const tracking = input.recommendations.find(
      (r) => r.kind === "tracking_issue"
    );
    if (tracking) {
      watch_outs.push(
        `Conversion tracking gap — ${tracking.impact} Metrics may be unreliable until fixed.`
      );
    }
  }

  return {
    provider,
    status,
    window_used: windowUsed,
    ...(currency ? { currency } : {}),
    ...(message ? { message } : {}),
    headline: totals,
    top_opportunity,
    top_opportunities,
    summary_version: 2,
    funnel_status,
    watch_outs,
  };
}
