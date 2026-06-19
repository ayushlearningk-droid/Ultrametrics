/**
 * Ask Ultrametrics — funnel intelligence engine (AI-008, Step 1).
 *
 * Pure rules over the account-level, ad-attributed FunnelEvents (AI-007). Turns
 * the four counts (ViewContent → AddToCart → InitiateCheckout → Purchase) into a
 * single account-level diagnosis by locating the FIRST weak stage:
 *
 *   ATC/VC low        → offer / product-page problem
 *   IC/ATC low        → cart friction
 *   Purchase/IC low   → checkout / payment problem
 *   all stages fine   → healthy
 *
 * No I/O, no model calls, no randomness — every number is computed here so a
 * caller relays rather than invents. NOT yet wired into any tool/prompt (that is
 * a later step); self-contained types so Step 1 touches only this file.
 *
 * Contract / caveats:
 *  - Account-level only; Meta-only in practice (only Meta populates funnel).
 *  - Counts are AD-ATTRIBUTED and windowed — diagnosis is directional, NOT raw
 *    site analytics. Impact strings say "ad-attributed".
 *  - Returns null when volume is below the floor (e.g. empty funnel) so it never
 *    contradicts the AI-005A tracking_issue path, which owns the all-zero case.
 *  - Attribution can make a stage rate exceed 1; rates are clamped to [0,1].
 */

import type { FunnelEvents } from "@/lib/metrics/types";
import {
  FUNNEL_MIN_EVENTS,
  FUNNEL_ATC_RATE_THRESHOLD,
  FUNNEL_CHECKOUT_RATE_THRESHOLD,
  FUNNEL_PURCHASE_RATE_THRESHOLD,
} from "@/lib/ai/thresholds";

/* ── Public types ─────────────────────────────────────────────────────────── */

export type FunnelDiagnosisKind =
  | "funnel_offer_problem"
  | "funnel_cart_friction"
  | "funnel_checkout_problem"
  | "funnel_healthy";

export type FunnelConfidence = "high" | "medium" | "low";

/** Account-level funnel diagnosis. Shape mirrors Recommendation for easy reuse. */
export interface FunnelDiagnosis {
  kind: FunnelDiagnosisKind;
  level: "account";
  action: string;
  impact: string;
  cta: string;
  confidence: FunnelConfidence;
  /** Business-impact priority, 0-100 (same scale as AI-007). */
  opportunityScore: number;
  /** Stage conversion rates (clamped 0..1), for transparency. */
  rates: {
    addToCartRate: number; // ATC / VC
    checkoutRate: number; // IC / ATC
    purchaseRate: number; // Purchase / IC
  };
}

/* ── Scoring (mirrors AI-007 opportunity scoring) ─────────────────────────── */

const OPP_W_REVENUE = 0.45;
const OPP_W_SPEND = 0.3;
const OPP_W_SEVERITY = 0.25;

const CONFIDENCE_WEIGHT: Record<FunnelConfidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

const SEVERITY_BY_KIND: Record<FunnelDiagnosisKind, number> = {
  funnel_checkout_problem: 0.9,
  funnel_cart_friction: 0.7,
  funnel_offer_problem: 0.6,
  funnel_healthy: 0.1,
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Stage rate, clamped to [0,1]; 0 when the denominator is 0. */
function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return clamp01(numerator / denominator);
}

/** Confidence from ViewContent volume (above the floor by construction). */
function confidenceFromVolume(viewContent: number): FunnelConfidence {
  if (viewContent >= 1000) return "high";
  if (viewContent >= 300) return "medium";
  return "low";
}

/**
 * Account-level opportunity score, 0-100. spendShare is 1 (account-wide); the
 * revenue-impact proxy is the leak size (1 − weak-stage rate); severity is
 * per-kind; dampened by confidence.
 */
function score(
  kind: FunnelDiagnosisKind,
  confidence: FunnelConfidence,
  leak: number
): number {
  const composite =
    OPP_W_REVENUE * clamp01(leak) +
    OPP_W_SPEND * 1 +
    OPP_W_SEVERITY * SEVERITY_BY_KIND[kind];
  return Math.round(100 * CONFIDENCE_WEIGHT[confidence] * composite);
}

function n(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/**
 * Diagnose the account funnel. Returns the single account-level diagnosis, or
 * null when ViewContent volume is below the floor (insufficient/empty funnel —
 * left to the tracking_issue path).
 */
export function deriveFunnelDiagnosis(
  funnel: FunnelEvents
): FunnelDiagnosis | null {
  const { viewContent, addToCart, initiateCheckout, purchase } = funnel;

  // Volume guard: too few events to trust the rates (also catches empty funnels).
  if (viewContent < FUNNEL_MIN_EVENTS) return null;

  const addToCartRate = rate(addToCart, viewContent);
  const checkoutRate = rate(initiateCheckout, addToCart);
  const purchaseRate = rate(purchase, initiateCheckout);

  const rates = { addToCartRate, checkoutRate, purchaseRate };

  // First weak stage wins (earliest leak).
  if (addToCartRate < FUNNEL_ATC_RATE_THRESHOLD) {
    const confidence = confidenceFromVolume(viewContent);
    return {
      kind: "funnel_offer_problem",
      level: "account",
      action: "Fix the product page or offer — strong interest but few add-to-carts.",
      impact: `ViewContent ${n(viewContent)} → AddToCart ${n(addToCart)} (${pct(
        addToCartRate
      )} add-to-cart rate, ad-attributed).`,
      cta: "Show top creatives by CTR",
      confidence,
      opportunityScore: score("funnel_offer_problem", confidence, 1 - addToCartRate),
      rates,
    };
  }

  if (checkoutRate < FUNNEL_CHECKOUT_RATE_THRESHOLD) {
    const confidence = confidenceFromVolume(viewContent);
    return {
      kind: "funnel_cart_friction",
      level: "account",
      action: "Reduce cart friction — carts aren't reaching checkout.",
      impact: `AddToCart ${n(addToCart)} → InitiateCheckout ${n(
        initiateCheckout
      )} (${pct(checkoutRate)} checkout-start rate, ad-attributed).`,
      cta: "Show top campaigns",
      confidence,
      opportunityScore: score("funnel_cart_friction", confidence, 1 - checkoutRate),
      rates,
    };
  }

  if (purchaseRate < FUNNEL_PURCHASE_RATE_THRESHOLD) {
    const confidence = confidenceFromVolume(viewContent);
    return {
      kind: "funnel_checkout_problem",
      level: "account",
      action: "Investigate checkout or payment — checkouts rarely complete.",
      impact: `InitiateCheckout ${n(initiateCheckout)} → Purchase ${n(
        purchase
      )} (${pct(purchaseRate)} purchase rate, ad-attributed).`,
      cta: "Show daily trend",
      confidence,
      opportunityScore: score(
        "funnel_checkout_problem",
        confidence,
        1 - purchaseRate
      ),
      rates,
    };
  }

  // All stages clear their thresholds → healthy.
  const confidence = confidenceFromVolume(viewContent);
  return {
    kind: "funnel_healthy",
    level: "account",
    action: "Funnel looks healthy.",
    impact: `ViewContent ${n(viewContent)} → AddToCart ${n(addToCart)} → InitiateCheckout ${n(
      initiateCheckout
    )} → Purchase ${n(purchase)}, all stages converting (ad-attributed).`,
    cta: "Show top campaigns",
    confidence,
    opportunityScore: score("funnel_healthy", confidence, 0),
    rates,
  };
}
