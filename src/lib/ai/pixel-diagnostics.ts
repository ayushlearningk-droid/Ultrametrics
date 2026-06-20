/**
 * Ask Ultrametrics — Meta Pixel diagnostics engine (Engine A, Step 1).
 *
 * Pure rules over the account-level ad-attributed FunnelEvents (AI-007) plus
 * account totals. Diagnoses pixel INSTRUMENTATION health (event presence /
 * coverage / value), distinct from AI-008 funnel intelligence (which diagnoses
 * conversion-rate drop-off assuming events fire). Instrumentation sits earlier:
 * if events aren't firing, funnel rates are meaningless.
 *
 * No I/O, no model calls, no new Meta API/scope — works entirely from data we
 * already retrieve. NOT yet wired into any tool/prompt (later step). Self-
 * contained types so Step 1 touches only this file.
 *
 * Caveats:
 *  - Account-level; Meta-only in practice (only Meta populates funnel).
 *  - Counts are AD-ATTRIBUTED and windowed — "no events" MAY be an attribution
 *    gap, not a missing pixel. All copy hedges ("may", "verify"); this is NOT a
 *    Pixel-API/Events-Manager health check (no last_fired_time / EMQ).
 *  - Returns null below the spend floor (no traffic to expect events).
 */

import type { FunnelEvents, MetricTotals } from "@/lib/metrics/types";

/* ── Public types ─────────────────────────────────────────────────────────── */

export type PixelDiagnosisKind =
  | "pixel_not_detected"
  | "conversion_events_missing"
  | "purchase_not_tracked"
  | "purchase_value_missing"
  | "partial_event_coverage"
  | "pixel_healthy";

export type PixelConfidence = "high" | "medium" | "low";

/** Account-level pixel diagnosis. Shape mirrors Recommendation for easy reuse. */
export interface PixelDiagnosis {
  kind: PixelDiagnosisKind;
  level: "account";
  action: string;
  impact: string;
  cta: string;
  confidence: PixelConfidence;
  /** Business-impact priority, 0-100 (same scale as AI-007). */
  opportunityScore: number;
  /** Standard events not firing (partial_event_coverage only). */
  missingEvents?: string[];
}

/* ── Thresholds ───────────────────────────────────────────────────────────── */

/**
 * Minimum spend before we expect pixel events (no traffic → no diagnosis).
 * Mirrors TRACKING_MIN_SPEND (100) from the recommendation engine; kept local
 * because recommendations.ts is out of scope for this step (dedup to a shared
 * threshold when that file can be touched).
 */
const PIXEL_MIN_SPEND = 100;

/* ── Scoring (AI-007 Phase 2: measured factors, capped below 100) ──────────── */

const CONFIDENCE_WEIGHT: Record<PixelConfidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

/** Composite factor weights (sum to 1): revenue impact, spend exposure, gap. */
const W_REVENUE_IMPACT = 0.2;
const W_SPEND_EXPOSURE = 0.25;
const W_EVENT_GAP = 0.55;

/** Saturation half-points: factor = x / (x + half) → 0.5 at x = half. */
const SPEND_HALF = 1000;
const REVENUE_HALF = 2000;

/**
 * Maximum attainable score. Below 100 by design so no pixel diagnosis can
 * auto-max and monopolize ranking — pixel issues compete fairly with scale /
 * budget / funnel opportunities.
 */
const SCORE_CEILING = 88;

/** Funnel-depth weights for the event coverage gap (deeper events weigh more). */
const EVENT_GAP_WEIGHT = {
  viewContent: 0.1,
  addToCart: 0.15,
  initiateCheckout: 0.25,
  purchase: 0.5,
} as const;

/** Value gap weight when purchases fire but carry no revenue (value_missing). */
const VALUE_GAP_WEIGHT = 0.4;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Spend exposure: spend / (spend + SPEND_HALF), saturating, asymptotic to 1. */
function spendExposure(spend: number): number {
  return spend > 0 ? spend / (spend + SPEND_HALF) : 0;
}

/**
 * Revenue impact: from measured revenue when present, else a damped spend proxy
 * (the spend is flying blind, so exposure stands in for revenue at risk).
 */
function revenueImpact(totals: MetricTotals): number {
  return totals.revenue > 0
    ? totals.revenue / (totals.revenue + REVENUE_HALF)
    : 0.5 * spendExposure(totals.spend);
}

/**
 * Event coverage gap (0..1): funnel-depth-weighted sum of NON-firing standard
 * events, plus a value gap when purchases fire without revenue. Replaces the old
 * static per-kind severity table with a measured signal.
 */
function eventCoverageGap(
  kind: PixelDiagnosisKind,
  funnel: FunnelEvents
): number {
  let gap = 0;
  if (funnel.viewContent === 0) gap += EVENT_GAP_WEIGHT.viewContent;
  if (funnel.addToCart === 0) gap += EVENT_GAP_WEIGHT.addToCart;
  if (funnel.initiateCheckout === 0) gap += EVENT_GAP_WEIGHT.initiateCheckout;
  if (funnel.purchase === 0) gap += EVENT_GAP_WEIGHT.purchase;
  if (kind === "purchase_value_missing") gap += VALUE_GAP_WEIGHT;
  return clamp01(gap);
}

/**
 * Account-level opportunity score, 0..SCORE_CEILING. Blends revenue impact,
 * spend exposure, and the measured event coverage gap, dampened by confidence.
 * No hard-coded inputs — nothing can reach 100.
 */
function score(
  kind: PixelDiagnosisKind,
  confidence: PixelConfidence,
  totals: MetricTotals,
  funnel: FunnelEvents
): number {
  const composite =
    W_REVENUE_IMPACT * revenueImpact(totals) +
    W_SPEND_EXPOSURE * spendExposure(totals.spend) +
    W_EVENT_GAP * eventCoverageGap(kind, funnel);
  return Math.round(SCORE_CEILING * CONFIDENCE_WEIGHT[confidence] * composite);
}

/** Confidence from spend volume (clear instrumentation breakage → not "low"). */
function confidenceFromSpend(spend: number): PixelConfidence {
  return spend >= 2 * PIXEL_MIN_SPEND ? "high" : "medium";
}

function n(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/**
 * Diagnose Meta pixel instrumentation from funnel events + totals. Returns the
 * single account-level diagnosis, or null when spend is below the floor.
 */
export function derivePixelDiagnostics(
  funnel: FunnelEvents,
  totals: MetricTotals
): PixelDiagnosis | null {
  if (totals.spend < PIXEL_MIN_SPEND) return null;

  const { viewContent, addToCart, initiateCheckout, purchase, pageView } =
    funnel;
  const confidence = confidenceFromSpend(totals.spend);

  const noEcommerceEvents =
    viewContent === 0 &&
    addToCart === 0 &&
    initiateCheckout === 0 &&
    purchase === 0;

  // 1. pixel_not_detected — NOTHING firing at all despite active spend.
  // AI-007 Phase 1: corroborate with account conversions/revenue (if Meta
  // reports either, conversions ARE tracked under an unrecognized action_type).
  // AI-007A: also require pageView === 0 — a firing PageView means the pixel IS
  // installed, so the missing events are a configuration gap, not a missing
  // pixel (see conversion_events_missing below).
  if (
    pageView === 0 &&
    noEcommerceEvents &&
    totals.conversions === 0 &&
    totals.revenue === 0
  ) {
    return {
      kind: "pixel_not_detected",
      level: "account",
      action: "Verify the Meta pixel is installed and firing.",
      impact:
        "No ViewContent, AddToCart, InitiateCheckout, or Purchase events recorded despite active spend — the pixel may be missing or not firing.",
      cta: "Show daily trend",
      confidence,
      opportunityScore: score("pixel_not_detected", confidence, totals, funnel),
    };
  }

  // 1b. conversion_events_missing (AI-007A) — pixel IS active (PageView firing)
  // but no conversion events are configured. Distinct from a missing pixel.
  if (pageView > 0 && noEcommerceEvents) {
    return {
      kind: "conversion_events_missing",
      level: "account",
      action:
        "Meta Pixel is active and recording landing page visits. No conversion events (ViewContent, AddToCart, InitiateCheckout, Purchase) were detected.",
      impact: `${n(
        pageView
      )} landing page views recorded, but 0 ViewContent, AddToCart, InitiateCheckout, or Purchase events — configure the standard conversion events.`,
      cta: "Show daily trend",
      confidence,
      opportunityScore: score(
        "conversion_events_missing",
        confidence,
        totals,
        funnel
      ),
    };
  }

  // 2. purchase_not_tracked — upper-funnel fires but no Purchase event.
  if (
    (viewContent > 0 || addToCart > 0 || initiateCheckout > 0) &&
    purchase === 0
  ) {
    return {
      kind: "purchase_not_tracked",
      level: "account",
      action: "Configure the Purchase event.",
      impact: `Upper-funnel events fire (ViewContent ${n(
        viewContent
      )}, AddToCart ${n(addToCart)}, InitiateCheckout ${n(
        initiateCheckout
      )}) but 0 Purchase events — the Purchase event may not be set up.`,
      cta: "Show daily trend",
      confidence,
      opportunityScore: score("purchase_not_tracked", confidence, totals, funnel),
    };
  }

  // 3. purchase_value_missing — Purchase fires but no revenue/value.
  if (purchase > 0 && totals.revenue === 0) {
    return {
      kind: "purchase_value_missing",
      level: "account",
      action: "Pass conversion value and currency on the Purchase event.",
      impact: `${n(
        purchase
      )} Purchase events fire but report 0 revenue — verify the value and currency parameters are sent.`,
      cta: "Show daily trend",
      confidence,
      opportunityScore: score("purchase_value_missing", confidence, totals, funnel),
    };
  }

  // 4. partial_event_coverage — some standard events not firing.
  const missing: string[] = [];
  if (viewContent === 0) missing.push("ViewContent");
  if (addToCart === 0) missing.push("AddToCart");
  if (initiateCheckout === 0) missing.push("InitiateCheckout");
  if (purchase === 0) missing.push("Purchase");
  if (missing.length > 0) {
    return {
      kind: "partial_event_coverage",
      level: "account",
      action: "Implement the missing standard events.",
      impact: `Some standard events are not firing: ${missing.join(
        ", "
      )}. Verify they are implemented on the relevant pages.`,
      cta: "Show daily trend",
      confidence,
      opportunityScore: score("partial_event_coverage", confidence, totals, funnel),
      missingEvents: missing,
    };
  }

  // 5. pixel_healthy — all standard events fire with revenue.
  return {
    kind: "pixel_healthy",
    level: "account",
    action: "Pixel tracking looks healthy.",
    impact:
      "All standard events (ViewContent, AddToCart, InitiateCheckout, Purchase) fire and carry revenue.",
    cta: "Show top campaigns",
    confidence,
    opportunityScore: score("pixel_healthy", confidence, totals, funnel),
  };
}
