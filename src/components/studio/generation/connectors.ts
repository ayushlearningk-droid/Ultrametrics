/**
 * Campaign Generation Runtime — connector payloads (Sprint 63O).
 *
 * Pure, deterministic builders that PREPARE Meta / Google Ads campaign payloads
 * from the plans, mirroring those platforms' API shapes. Status is always PAUSED
 * — nothing is published. Zod-validated. No backend, no API calls.
 */

import {
  zMetaPayload,
  zGooglePayload,
  type CampaignPlan,
  type CreativePlan,
  type MetaPayload,
  type GooglePayload,
} from "./schemas";

const META_OBJECTIVE: Record<string, string> = {
  Conversions: "OUTCOME_SALES",
  Awareness: "OUTCOME_AWARENESS",
  Traffic: "OUTCOME_TRAFFIC",
  Leads: "OUTCOME_LEADS",
};

/** Prepare a Meta Ads campaign payload (PAUSED). */
export function buildMetaPayload(campaign: CampaignPlan, creative: CreativePlan): MetaPayload {
  const payload: MetaPayload = {
    campaign: {
      name: campaign.name,
      objective: META_OBJECTIVE[campaign.objective] ?? "OUTCOME_ENGAGEMENT",
      status: "PAUSED",
      special_ad_categories: [],
    },
    adSets: [
      {
        name: `${campaign.name} · Ad set`,
        daily_budget: Math.max(100, Math.round(campaign.budget / 30) * 100),
        optimization_goal: "OFFSITE_CONVERSIONS",
        targeting: { audience: campaign.audience },
      },
    ],
    ads: creative.headlines.slice(0, 3).map((title, i) => ({
      name: `${campaign.name} · Ad ${i + 1}`,
      creative: { title, body: creative.primaryText[i % creative.primaryText.length] ?? creative.descriptions[0] ?? "" },
    })),
  };
  return zMetaPayload.parse(payload);
}

/** Prepare a Google Ads campaign payload (PAUSED). */
export function buildGooglePayload(campaign: CampaignPlan, creative: CreativePlan): GooglePayload {
  const payload: GooglePayload = {
    campaign: {
      name: campaign.name,
      advertisingChannelType: "VIDEO",
      status: "PAUSED",
      campaignBudgetMicros: Math.round(campaign.budget) * 1_000_000,
    },
    adGroups: [{ name: `${campaign.name} · Ad group`, cpcBidMicros: 500_000 }],
    ads: [
      {
        type: "RESPONSIVE_DISPLAY_AD",
        headlines: creative.headlines.slice(0, 5),
        descriptions: creative.descriptions.slice(0, 4),
      },
    ],
  };
  return zGooglePayload.parse(payload);
}
