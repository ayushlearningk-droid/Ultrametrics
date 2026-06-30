/**
 * Inspiration Engine — data (Sprint 63.2).
 *
 * A deterministic library of inspiration cards for the AI Studio Home. Each card
 * maps to an existing Outcome (Outcome Engine) and a recommended AI team (reused
 * Employees registry). Selecting a card populates the Home's outcome prompt — it
 * never generates on its own. Pure data: no backend, no fabricated analytics
 * (quality is a qualitative band, not an invented metric).
 */

import type { MediaSource } from "@/components/studio/media";
import type { EmployeeId } from "@/components/studio/employees/types";

export type InspirationCategory =
  | "Trending Campaigns"
  | "Winning Hooks"
  | "High Performing UGC"
  | "Seasonal Campaigns"
  | "Product Launches"
  | "Competitor Winning Ads"
  | "Brand Stories";

export const INSPIRATION_CATEGORIES: InspirationCategory[] = [
  "Trending Campaigns",
  "Winning Hooks",
  "High Performing UGC",
  "Seasonal Campaigns",
  "Product Launches",
  "Competitor Winning Ads",
  "Brand Stories",
];

export type QualityBand = "Solid" | "High" | "Very High";

export interface InspirationCard {
  id: string;
  title: string;
  /** Context that populates the outcome prompt (the brief offer). */
  prompt: string;
  thumbnail: MediaSource;
  /** Linked Outcome Engine id. */
  outcomeId: string;
  category: InspirationCategory;
  industry: string;
  quality: QualityBand;
  /** Recommended AI team for this inspiration. */
  team: EmployeeId[];
}

const V: MediaSource = { kind: "video" };
const I: MediaSource = { kind: "image" };

export const INSPIRATION: InspirationCard[] = [
  // Trending Campaigns
  { id: "in-tc1", title: "Problem-first win-back", prompt: "Win back lapsed buyers with a problem-first hook and a clear offer.", thumbnail: V, outcomeId: "increase-roas", category: "Trending Campaigns", industry: "Skincare", quality: "Very High", team: ["creative-director", "media-buyer", "copywriter"] },
  { id: "in-tc2", title: "Founder-led trust spot", prompt: "Build trust with a founder-led story that drives conversions.", thumbnail: V, outcomeId: "increase-ctr", category: "Trending Campaigns", industry: "Supplements", quality: "High", team: ["copywriter", "creative-director"] },
  { id: "in-tc3", title: "Bundle value push", prompt: "Push a value bundle with a risk-reversal guarantee.", thumbnail: I, outcomeId: "launch-product", category: "Trending Campaigns", industry: "Home", quality: "High", team: ["media-buyer", "finance", "creative-director"] },

  // Winning Hooks
  { id: "in-wh1", title: "3-second pattern interrupt", prompt: "Open with a 3-second pattern interrupt to lift click-through.", thumbnail: V, outcomeId: "increase-ctr", category: "Winning Hooks", industry: "Fitness", quality: "Very High", team: ["creative-director", "copywriter"] },
  { id: "in-wh2", title: "POV scroll-stopper", prompt: "Use a first-person POV scroll-stopper for cold audiences.", thumbnail: V, outcomeId: "increase-ctr", category: "Winning Hooks", industry: "Beauty", quality: "High", team: ["creative-director", "copywriter", "media-buyer"] },
  { id: "in-wh3", title: "Question-led hook", prompt: "Lead with a sharp question that names the audience's problem.", thumbnail: I, outcomeId: "get-leads", category: "Winning Hooks", industry: "SaaS", quality: "Solid", team: ["copywriter", "media-buyer"] },

  // High Performing UGC
  { id: "in-ugc1", title: "Creator routine reveal", prompt: "Authentic creator routine reveal in natural daylight.", thumbnail: V, outcomeId: "ugc-campaign", category: "High Performing UGC", industry: "Skincare", quality: "Very High", team: ["creative-director", "copywriter", "automation"] },
  { id: "in-ugc2", title: "Skeptic-to-believer", prompt: "Skeptic-to-believer testimonial in a first-person to-camera style.", thumbnail: V, outcomeId: "ugc-campaign", category: "High Performing UGC", industry: "Wellness", quality: "High", team: ["creative-director", "copywriter"] },
  { id: "in-ugc3", title: "Unboxing curiosity", prompt: "Curiosity-driven unboxing with a fast first three seconds.", thumbnail: V, outcomeId: "ugc-campaign", category: "High Performing UGC", industry: "DTC", quality: "High", team: ["automation", "creative-director"] },

  // Seasonal Campaigns
  { id: "in-sc1", title: "Festive gifting set", prompt: "Seasonal gifting campaign with on-brand festive creative.", thumbnail: I, outcomeId: "festival-campaign", category: "Seasonal Campaigns", industry: "Gifting", quality: "High", team: ["creative-director", "brand-guardian", "automation"] },
  { id: "in-sc2", title: "Holiday countdown", prompt: "Holiday countdown promo with urgency and a clear offer.", thumbnail: V, outcomeId: "festival-campaign", category: "Seasonal Campaigns", industry: "Retail", quality: "Solid", team: ["media-buyer", "creative-director"] },
  { id: "in-sc3", title: "New-year reset", prompt: "New-year reset angle that re-engages lapsed customers.", thumbnail: V, outcomeId: "increase-roas", category: "Seasonal Campaigns", industry: "Fitness", quality: "High", team: ["creative-director", "media-buyer"] },

  // Product Launches
  { id: "in-pl1", title: "Hero launch film", prompt: "Hero launch film introducing the product to new buyers.", thumbnail: V, outcomeId: "launch-product", category: "Product Launches", industry: "Tech", quality: "Very High", team: ["ceo", "creative-director", "copywriter", "media-buyer"] },
  { id: "in-pl2", title: "Phased teaser drop", prompt: "Phased teaser-to-launch drop building anticipation.", thumbnail: I, outcomeId: "launch-product", category: "Product Launches", industry: "Fashion", quality: "High", team: ["creative-director", "media-buyer"] },
  { id: "in-pl3", title: "Benefit-stack explainer", prompt: "Benefit-stack explainer that converts considerers.", thumbnail: V, outcomeId: "get-leads", category: "Product Launches", industry: "SaaS", quality: "Solid", team: ["copywriter", "automation"] },

  // Competitor Winning Ads
  { id: "in-cw1", title: "Open-angle differentiator", prompt: "Differentiated angle competitors miss, without naming rivals.", thumbnail: V, outcomeId: "beat-competitor", category: "Competitor Winning Ads", industry: "Beauty", quality: "Very High", team: ["creative-director", "media-buyer", "brand-guardian"] },
  { id: "in-cw2", title: "Side-by-side proof", prompt: "Proof-led comparison creative grounded in benefits.", thumbnail: I, outcomeId: "beat-competitor", category: "Competitor Winning Ads", industry: "Home", quality: "High", team: ["media-buyer", "creative-director"] },
  { id: "in-cw3", title: "Category reframe", prompt: "Reframe the category to own a unique position.", thumbnail: V, outcomeId: "beat-competitor", category: "Competitor Winning Ads", industry: "Food & Bev", quality: "High", team: ["creative-director", "copywriter"] },

  // Brand Stories
  { id: "in-bs1", title: "Origin story film", prompt: "Brand origin story that builds long-term affinity.", thumbnail: V, outcomeId: "increase-roas", category: "Brand Stories", industry: "Heritage", quality: "High", team: ["ceo", "creative-director", "copywriter"] },
  { id: "in-bs2", title: "Values manifesto", prompt: "Values manifesto that connects with the core audience.", thumbnail: I, outcomeId: "get-leads", category: "Brand Stories", industry: "Sustainability", quality: "Solid", team: ["copywriter", "brand-guardian"] },
  { id: "in-bs3", title: "Community spotlight", prompt: "Community spotlight celebrating real customers.", thumbnail: V, outcomeId: "ugc-campaign", category: "Brand Stories", industry: "Lifestyle", quality: "High", team: ["creative-director", "automation"] },
];

/** Inspiration cards in a category (declaration order). Pure. */
export function inspirationByCategory(category: InspirationCategory): InspirationCard[] {
  return INSPIRATION.filter((c) => c.category === category);
}
