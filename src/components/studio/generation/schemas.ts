/**
 * Campaign Generation Runtime — schemas (Sprint 63O).
 *
 * Zod-validated, typed contracts for the deterministic generation pipeline:
 * input + the five plans (Campaign / Creative / Asset / Approval / Queue) and
 * the prepared Meta / Google ad payloads (NOT published). No fake JSON — every
 * field is typed and validated. No backend, no AI.
 */

import { z } from "zod";

export const zPlatform = z.enum(["tiktok", "reels", "shorts", "meta", "youtube"]);
export const zPriority = z.enum(["high", "normal", "low"]);

/* ── Input ───────────────────────────────────────────────────────────────── */
export const zGenerationInput = z.object({
  brief: z.string(),
  outcomeId: z.string(),
  brand: z.string(),
  objective: z.string(),
  audience: z.string(),
  budget: z.number().nonnegative(),
  platforms: z.array(zPlatform).min(1),
  product: z.array(z.string()),
  knowledge: z.array(z.string()),
  skills: z.array(z.string()),
  connectors: z.array(z.string()),
  model: z.string(),
  /* Marketing DNA imprint (Sprint 63R) — the brand brain every campaign inherits. */
  dna: z
    .object({
      version: z.string(),
      brandName: z.string(),
      voice: z.string(),
      writingStyle: z.string(),
      ctaStyle: z.string(),
      visualStyle: z.string(),
      pricePositioning: z.string(),
      usp: z.string(),
      restrictions: z.array(z.string()),
    })
    .optional(),
  /* Workspace Memory (Sprint 63S) — editable preferences inherited per campaign. */
  memory: z
    .object({
      brandPreferences: z.string(),
      tone: z.string(),
      language: z.string(),
      audience: z.string(),
      campaignStyle: z.string(),
      ugcPreferences: z.string(),
      ctaPreferences: z.string(),
      creativePreferences: z.string(),
    })
    .optional(),
});
export type GenerationInput = z.infer<typeof zGenerationInput>;

/* ── Plans ───────────────────────────────────────────────────────────────── */
export const zCampaignPlan = z.object({
  id: z.string(),
  name: z.string(),
  outcomeId: z.string(),
  objective: z.string(),
  audience: z.string(),
  budget: z.number(),
  platforms: z.array(zPlatform),
  summary: z.string(),
});
export type CampaignPlan = z.infer<typeof zCampaignPlan>;

export const zCreativePlan = z.object({
  campaignId: z.string(),
  hooks: z.array(z.string()),
  headlines: z.array(z.string()),
  descriptions: z.array(z.string()),
  primaryText: z.array(z.string()),
});
export type CreativePlan = z.infer<typeof zCreativePlan>;

export const zAssetSpec = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["image", "video"]),
  platform: zPlatform,
  ownerId: z.string(),
});
export const zAssetPlan = z.object({
  campaignId: z.string(),
  assets: z.array(zAssetSpec),
});
export type AssetPlan = z.infer<typeof zAssetPlan>;
export type AssetSpec = z.infer<typeof zAssetSpec>;

export const zApprovalPlan = z.object({
  campaignId: z.string(),
  items: z.array(
    z.object({ id: z.string(), assetId: z.string(), reviewerId: z.string(), status: z.literal("pending") })
  ),
});
export type ApprovalPlan = z.infer<typeof zApprovalPlan>;

export const zQueuePlan = z.object({
  campaignId: z.string(),
  items: z.array(
    z.object({ id: z.string(), assetId: z.string(), stage: z.string(), assignedId: z.string(), priority: zPriority, status: z.literal("queued") })
  ),
});
export type QueuePlan = z.infer<typeof zQueuePlan>;

/* ── Prepared connector payloads (NOT published) ─────────────────────────── */
export const zMetaPayload = z.object({
  campaign: z.object({
    name: z.string(),
    objective: z.string(),
    status: z.literal("PAUSED"),
    special_ad_categories: z.array(z.string()),
  }),
  adSets: z.array(
    z.object({ name: z.string(), daily_budget: z.number(), optimization_goal: z.string(), targeting: z.object({ audience: z.string() }) })
  ),
  ads: z.array(z.object({ name: z.string(), creative: z.object({ title: z.string(), body: z.string() }) })),
});
export type MetaPayload = z.infer<typeof zMetaPayload>;

export const zGooglePayload = z.object({
  campaign: z.object({
    name: z.string(),
    advertisingChannelType: z.string(),
    status: z.literal("PAUSED"),
    campaignBudgetMicros: z.number(),
  }),
  adGroups: z.array(z.object({ name: z.string(), cpcBidMicros: z.number() })),
  ads: z.array(z.object({ type: z.string(), headlines: z.array(z.string()), descriptions: z.array(z.string()) })),
});
export type GooglePayload = z.infer<typeof zGooglePayload>;

/* ── Execution stages ────────────────────────────────────────────────────── */
export const GENERATION_STAGES = [
  "Preparing Brief",
  "Building Campaign",
  "Assigning Employees",
  "Generating Assets",
  "Reviewing",
  "Queued",
  "Ready",
  "Approved",
] as const;
export type GenerationStageName = (typeof GENERATION_STAGES)[number];

export const zGenerationStage = z.object({
  name: z.enum(GENERATION_STAGES),
  status: z.enum(["complete", "active", "pending"]),
});
export type GenerationStage = z.infer<typeof zGenerationStage>;
