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

/* ── Scoring (mirrors AI-007 opportunity scoring) ─────────────────────────── */

const OPP_W_REVENUE = 0.45;
const OPP_W_SPEND = 0.3;
const OPP_W_SEVERITY = 0.25;

const CONFIDENCE_WEIGHT: Record<PixelConfidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

const SEVERITY_BY_KIND: Record<PixelDiagnosisKind, number> = {
  pixel_not_detected: 1.0,
  purchase_not_tracked: 0.95,
  purchase_value_missing: 0.9,
  partial_event_coverage: 0.5,
  pixel_healthy: 0.1,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Account-level opportunity score, 0-100. spendShare is 1 (account-wide). */
function score(
  kind: PixelDiagnosisKind,
  confidence: PixelConfidence,
  revenueImpactNorm: number
): number {
  const composite =
    OPP_W_REVENUE * clamp01(revenueImpactNorm) +
    OPP_W_SPEND * 1 +
    OPP_W_SEVERITY * SEVERITY_BY_KIND[kind];
  return Math.round(100 * CONFIDENCE_WEIGHT[confidence] * composite);
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

  const { viewContent, addToCart, initiateCheckout, purchase } = funnel;
  const confidence = confidenceFromSpend(totals.spend);

  // 1. pixel_not_detected — no standard events at all despite active spend.
  if (
    viewContent === 0 &&
    addToCart === 0 &&
    initiateCheckout === 0 &&
    purchase === 0
  ) {
    return {
      kind: "pixel_not_detected",
      level: "account",
      action: "Verify the Meta pixel is installed and firing.",
      impact:
        "No ViewContent, AddToCart, InitiateCheckout, or Purchase events recorded despite active spend — the pixel may be missing or not firing.",
      cta: "Show daily trend",
      confidence,
      opportunityScore: score("pixel_not_detected", confidence, 1),
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
      opportunityScore: score("purchase_not_tracked", confidence, 1),
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
      opportunityScore: score("purchase_value_missing", confidence, 1),
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
      opportunityScore: score("partial_event_coverage", confidence, 0.5),
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
    opportunityScore: score("pixel_healthy", confidence, 0),
  };
}
