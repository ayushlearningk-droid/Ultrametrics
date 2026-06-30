/**
 * Campaign Generation Runtime — orchestration (Sprint 63O).
 *
 * Deterministic, client-only. Given a fully-collected brief it executes the
 * production pipeline (Campaign Plan → Creative Brief → Ad Copy → Headlines →
 * Descriptions → Audience → Campaign Structure → Creative Tasks → Approval →
 * Queue) and emits Zod-validated typed plans plus prepared Meta / Google Ads
 * payloads (PAUSED — never published). It also derives the region-ready views
 * (creatives · queue · approvals · timeline · activity) so a generated campaign
 * automatically appears across the Unified Workspace.
 *
 * Reuses the Outcome Engine (outcomes/plan), Employees registry, Movie pipeline
 * vocabulary, Forecast Foundation budgets, Creative/Queue/Approval types. No
 * backend, no AI calls, no fake JSON — same input always yields the same output.
 */

import type { EmployeeId } from "@/components/studio/employees/types";
import type { PlatformId } from "@/components/studio/media";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import type { QueueItem } from "@/components/studio/queue/queue-data";
import type { ApprovalItem } from "@/components/studio/approval/approval-data";
import { buildMetaPayload, buildGooglePayload } from "./connectors";
import {
  zGenerationInput,
  zCampaignPlan,
  zCreativePlan,
  zAssetPlan,
  zApprovalPlan,
  zQueuePlan,
  GENERATION_STAGES,
  type GenerationInput,
  type CampaignPlan,
  type CreativePlan,
  type AssetPlan,
  type AssetSpec,
  type ApprovalPlan,
  type QueuePlan,
  type GenerationStage,
  type MetaPayload,
  type GooglePayload,
} from "./schemas";

export interface GenerationResult {
  id: string;
  createdAt: number;
  input: GenerationInput;
  campaignPlan: CampaignPlan;
  creativePlan: CreativePlan;
  assetPlan: AssetPlan;
  approvalPlan: ApprovalPlan;
  queuePlan: QueuePlan;
  metaPayload: MetaPayload;
  googlePayload: GooglePayload;
  stages: GenerationStage[];
  /* Region-ready derived views (mirror the existing runtimes' shapes). */
  creatives: CreativeItem[];
  queueItems: QueueItem[];
  approvalItems: ApprovalItem[];
  timeline: { id: string; at: number; text: string }[];
  activity: { id: string; authorId: EmployeeId; text: string }[];
}

const BASE = Date.parse("2026-06-01T09:00:00Z");
/** Owners assigned round-robin to creative tasks (reused Employees registry). */
const TASK_OWNERS: EmployeeId[] = ["creative-director", "copywriter", "automation", "media-buyer"];
const REVIEWER: EmployeeId = "brand-guardian";

function low(s: string): string {
  return s.trim().toLowerCase();
}

/** Build the deterministic ad copy from the outcome, brand, brief, audience + DNA. */
function buildCreative(campaignId: string, input: GenerationInput, outcomeLabel: string): CreativePlan {
  const { brand, audience, brief } = { ...input, brief: input.brief.trim() };
  const offer = brief || `New from ${brand}`;
  // The Marketing DNA (Sprint 63R) shapes the copy: USP grounds a description and
  // the brand's CTA style closes the primary text. Deterministic — no randomness.
  const usp = input.dna?.usp;
  // CTA prefers the DNA's CTA style, then the remembered Workspace Memory CTA.
  const ctaSource = input.dna?.ctaStyle || input.memory?.ctaPreferences || "";
  const cta = ctaSource ? ctaSource.replace(/\s*\(.*\)\s*/g, "").trim() : null;
  const plan: CreativePlan = {
    campaignId,
    hooks: [
      `Struggling to ${low(outcomeLabel)}? Watch this.`,
      `The ${brand} way to ${low(outcomeLabel)}.`,
      `POV: ${low(audience)} who finally found ${brand}.`,
    ],
    headlines: [`${brand}: ${outcomeLabel}`, `${outcomeLabel}, made simple`, `Built for ${audience}`],
    descriptions: [
      `${brand} helps you ${low(outcomeLabel)}. ${offer}.`,
      usp ? `${usp}. Designed for ${audience}.` : `Designed for ${audience}. See the difference with ${brand}.`,
    ],
    primaryText: [
      `${offer}. Built to ${low(outcomeLabel)}.`,
      cta ? `See why ${audience} choose ${brand}. ${cta}.` : `See why ${audience} choose ${brand}.`,
    ],
  };
  return zCreativePlan.parse(plan);
}

/** One creative task per target platform, alternating video / image. */
function buildAssets(campaignId: string, input: GenerationInput, creative: CreativePlan): AssetPlan {
  const assets: AssetSpec[] = input.platforms.map((platform, i) => ({
    id: `${campaignId}-as${i + 1}`,
    title: `${creative.headlines[i % creative.headlines.length]} · ${platform}`,
    kind: i % 2 === 0 ? "video" : "image",
    platform,
    ownerId: TASK_OWNERS[i % TASK_OWNERS.length],
  }));
  return zAssetPlan.parse({ campaignId, assets });
}

export function generate(rawInput: GenerationInput): GenerationResult {
  const input = zGenerationInput.parse(rawInput);
  const outcome = outcomeById(input.outcomeId);
  const outcomeLabel = outcome?.label ?? "grow";

  const campaignId = `cmp-${input.outcomeId}`;
  const campaignPlan = zCampaignPlan.parse({
    id: campaignId,
    name: `${outcomeLabel} · ${input.brand}`,
    outcomeId: input.outcomeId,
    objective: input.objective,
    audience: input.audience,
    budget: input.budget,
    platforms: input.platforms,
    summary: `${input.brand} campaign to ${low(outcomeLabel)} for ${input.audience}, ${input.platforms.length} placement${input.platforms.length > 1 ? "s" : ""}, ${input.skills.length} skill${input.skills.length === 1 ? "" : "s"}.${input.memory?.campaignStyle ? ` Style: ${input.memory.campaignStyle}.` : ""}`,
  } satisfies CampaignPlan);

  const creativePlan = buildCreative(campaignId, input, outcomeLabel);
  const assetPlan = buildAssets(campaignId, input, creativePlan);

  const approvalPlan = zApprovalPlan.parse({
    campaignId,
    items: assetPlan.assets.map((a, i) => ({
      id: `${campaignId}-ap${i + 1}`,
      assetId: a.id,
      reviewerId: REVIEWER,
      status: "pending" as const,
    })),
  } satisfies ApprovalPlan);

  const queuePlan = zQueuePlan.parse({
    campaignId,
    items: assetPlan.assets.map((a, i) => ({
      id: `${campaignId}-q${i + 1}`,
      assetId: a.id,
      stage: a.kind === "video" ? "videos" : "images",
      assignedId: a.ownerId,
      priority: i === 0 ? ("high" as const) : ("normal" as const),
      status: "queued" as const,
    })),
  } satisfies QueuePlan);

  const metaPayload = buildMetaPayload(campaignPlan, creativePlan);
  const googlePayload = buildGooglePayload(campaignPlan, creativePlan);

  /* ── Derived region views ──────────────────────────────────────────────── */
  const dnaVersion = input.dna?.version;
  const tags = input.skills.length ? input.skills.slice(0, 3) : ["generated"];
  const creatives: CreativeItem[] = assetPlan.assets.map((a, i) => ({
    id: a.id,
    title: a.title,
    media: { kind: a.kind },
    platform: a.platform as PlatformId,
    status: "generated",
    ownerId: a.ownerId as EmployeeId,
    version: 1,
    variants: 2,
    tags,
    bookmarked: false,
    favorite: false,
    recent: true,
    budget: input.budget,
    createdAt: BASE + i * 3_600_000,
    brand: input.brand,
    audience: input.audience,
    campaign: campaignPlan.name,
    objective: input.objective,
    language: "English",
    dnaVersion,
    history: [{ at: BASE + i * 3_600_000, text: `Generated for ${campaignPlan.name}` }],
  }));

  const queueItems: QueueItem[] = queuePlan.items.map((q, i) => ({
    id: q.id,
    creativeId: q.assetId,
    outcomeId: input.outcomeId,
    stageId: q.stage,
    assignedId: q.assignedId as EmployeeId,
    priority: q.priority,
    etaSec: 12 + i * 6,
    status: "queued",
    budget: input.budget,
    dnaVersion,
  }));

  const approvalItems: ApprovalItem[] = approvalPlan.items.map((ap, i) => ({
    id: ap.id,
    creativeId: ap.assetId,
    outcomeId: input.outcomeId,
    assignedId: assetPlan.assets[i].ownerId as EmployeeId,
    reviewerId: ap.reviewerId as EmployeeId,
    priority: i === 0 ? "high" : "normal",
    status: "pending",
    budget: input.budget,
    version: 1,
    comments: [],
    dnaVersion,
    history: [{ id: `${ap.id}-h1`, at: BASE + i * 3_600_000, text: "Submitted for review" }],
  }));

  const stages: GenerationStage[] = GENERATION_STAGES.map((name) => ({ name, status: "complete" }));

  const timeline = GENERATION_STAGES.map((name, i) => ({
    id: `${campaignId}-tl${i + 1}`,
    at: BASE + i * 600_000,
    text: name,
  }));

  const activity = [
    { id: `${campaignId}-ac1`, authorId: "creative-director" as EmployeeId, text: `Assembled "${campaignPlan.name}".` },
    { id: `${campaignId}-ac2`, authorId: "copywriter" as EmployeeId, text: `Wrote ${creativePlan.headlines.length} headlines and ${creativePlan.descriptions.length} descriptions.` },
    { id: `${campaignId}-ac3`, authorId: "automation" as EmployeeId, text: `Queued ${assetPlan.assets.length} creative tasks.` },
    { id: `${campaignId}-ac4`, authorId: REVIEWER, text: `Sent ${approvalPlan.items.length} assets to approval.` },
  ];

  return {
    id: campaignId,
    createdAt: BASE,
    input,
    campaignPlan,
    creativePlan,
    assetPlan,
    approvalPlan,
    queuePlan,
    metaPayload,
    googlePayload,
    stages,
    creatives,
    queueItems,
    approvalItems,
    timeline,
    activity,
  };
}
