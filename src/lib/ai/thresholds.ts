/**
 * Ask Ultrametrics — shared analytics thresholds.
 *
 * The qualification floors used to decide whether a single campaign/ad carries
 * enough volume for a ratio (CTR/ROAS/CPC) to be meaningful. Centralized here so
 * the ranking serializers (AI-004A) and the recommendation engine (AI-005) agree
 * on the same numbers instead of duplicating constants that can drift.
 *
 * Pure data — no imports, no logic.
 */

/** Minimum impressions for a CTR comparison to be trustworthy. */
export const MIN_IMPRESSIONS = 500;

/** Minimum spend (in the provider's own currency) for ROAS to be meaningful. */
export const MIN_SPEND = 50;

/** Minimum clicks for CPC to be stable. */
export const MIN_CLICKS = 20;

/* ── Funnel intelligence (AI-008) ─────────────────────────────────────────── */

/** Minimum ViewContent volume before a funnel diagnosis is trustworthy. */
export const FUNNEL_MIN_EVENTS = 100;

/** AddToCart / ViewContent floor below which the offer/product page is weak. */
export const FUNNEL_ATC_RATE_THRESHOLD = 0.2;

/** InitiateCheckout / AddToCart floor below which the cart has friction. */
export const FUNNEL_CHECKOUT_RATE_THRESHOLD = 0.45;

/** Purchase / InitiateCheckout floor below which checkout/payment is failing. */
export const FUNNEL_PURCHASE_RATE_THRESHOLD = 0.45;
