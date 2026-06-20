/**
 * Ask Ultrametrics — campaign objective classifier (AI-008, Phase 1).
 *
 * Pure mapping from a provider campaign objective string to a coarse category.
 * Used to route diagnostics: ecommerce funnel / pixel diagnostics are only valid
 * for conversion-class objectives. No I/O, no model calls.
 *
 * Phase 1 only needs the conversion vs non-conversion distinction; the finer
 * categories (traffic/engagement/video/messages/awareness) are returned for the
 * later objective-aware diagnostic engines, not yet consumed.
 */

export type ObjectiveCategory =
  | "conversion"
  | "leads"
  | "traffic"
  | "engagement"
  | "video"
  | "messages"
  | "awareness"
  | "unknown";

/* Meta objective values (ODAX OUTCOME_* and legacy), upper-cased. */
const CONVERSION = new Set([
  "OUTCOME_SALES",
  "CONVERSIONS",
  "PRODUCT_CATALOG_SALES",
  "WEBSITE_CONVERSIONS",
  "STORE_VISITS",
]);
const LEADS = new Set(["OUTCOME_LEADS", "LEAD_GENERATION"]);
const TRAFFIC = new Set(["OUTCOME_TRAFFIC", "LINK_CLICKS", "TRAFFIC"]);
const ENGAGEMENT = new Set([
  "OUTCOME_ENGAGEMENT",
  "POST_ENGAGEMENT",
  "PAGE_LIKES",
  "EVENT_RESPONSES",
]);
const VIDEO = new Set(["VIDEO_VIEWS"]);
const MESSAGES = new Set(["MESSAGES", "OUTCOME_MESSAGES"]);
const AWARENESS = new Set([
  "OUTCOME_AWARENESS",
  "BRAND_AWARENESS",
  "REACH",
  "AD_RECALL_LIFT",
]);

/** Map a provider campaign objective to a coarse category ("unknown" if absent). */
export function classifyObjective(objective?: string | null): ObjectiveCategory {
  if (!objective) return "unknown";
  const o = objective.toUpperCase();
  if (CONVERSION.has(o)) return "conversion";
  if (LEADS.has(o)) return "leads";
  if (TRAFFIC.has(o)) return "traffic";
  if (ENGAGEMENT.has(o)) return "engagement";
  if (VIDEO.has(o)) return "video";
  if (MESSAGES.has(o)) return "messages";
  if (AWARENESS.has(o)) return "awareness";
  return "unknown";
}

/**
 * Whether ecommerce funnel / pixel diagnostics should run for this account.
 *
 * Conservative: returns true (run diagnostics, preserving existing behavior)
 * UNLESS we have affirmative objective data AND none of the known objectives are
 * conversion-class. So accounts whose objective field is absent/unknown are never
 * newly suppressed — only accounts proven to be non-conversion are.
 */
export function hasConversionObjective(
  campaigns?: { objective?: string }[]
): boolean {
  if (!campaigns || campaigns.length === 0) return true;
  const known = campaigns
    .map((c) => classifyObjective(c.objective))
    .filter((cat) => cat !== "unknown");
  if (known.length === 0) return true;
  return known.some((cat) => cat === "conversion");
}
