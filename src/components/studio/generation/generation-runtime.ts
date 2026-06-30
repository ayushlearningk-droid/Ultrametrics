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
import { MOVIE_LABEL } from "@/components/studio/movie/movie-runtime";
import { employeeName } from "@/components/studio/employees/employees-data";
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
  timeline: LiveTimelineEvent[];
  activity: ActivityEvent[];
  explanations: DecisionExplanation[];
}

/** AI Explainability Layer (Sprint 63Y) — a complete explanation per decision. */
export interface DecisionExplanation {
  id: string;
  stage: string;
  sourceEmployeeId: EmployeeId;
  /** Why this decision was made. */
  why: string;
  /** Grounded evidence (campaign facts only — no fabricated metrics). */
  evidence: string[];
  confidence: "high" | "medium" | "low";
  /** Alternatives considered. */
  alternatives: string[];
  /** Expected business impact. */
  businessImpact: string;
  /** Linked generated asset (focused in the Inspector). */
  assetId?: string;
}

/** Per-stage elaboration: confidence · alternatives · business impact. Deterministic. */
const EXPLAIN_ELAB: Record<string, { confidence: "high" | "medium" | "low"; alternatives: string[]; impact: string }> = {
  "Brief Received": { confidence: "high", alternatives: ["Defer until more inputs", "Start from a template"], impact: "Sets scope and prevents rework downstream." },
  "Research Started": { confidence: "medium", alternatives: ["Skip research and reuse last brief", "Outsource references"], impact: "Grounds creative in proven angles." },
  "Competitor Analysis": { confidence: "high", alternatives: ["Ignore competitors", "Copy the category leader"], impact: "Finds the open angle rivals miss." },
  "Audience Analysis": { confidence: "high", alternatives: ["Broad untargeted reach", "Reuse a stale segment"], impact: "Concentrates spend on the highest-intent segment." },
  "Strategy Built": { confidence: "high", alternatives: ["Single-channel push", "Discount-led plan"], impact: "Aligns creative, audience and budget on one outcome." },
  "Hooks Generated": { confidence: "medium", alternatives: ["One safe hook", "Trend-chasing hook"], impact: "Raises hook rate in the first 3 seconds." },
  "Storyboard Generated": { confidence: "medium", alternatives: ["Static image only", "Talking-head only"], impact: "Improves watch-through with a clear arc." },
  "Copy Generated": { confidence: "high", alternatives: ["Long-form copy", "Feature-led copy"], impact: "Lifts CTR with benefit-first, on-voice lines." },
  "Creative Generated": { confidence: "high", alternatives: ["Fewer placements", "Generic crops"], impact: "Produces native assets per placement." },
  "Queue Created": { confidence: "high", alternatives: ["Manual handoff", "Single batch"], impact: "Parallelizes production with clear ownership." },
  "Approval Requested": { confidence: "medium", alternatives: ["Auto-publish", "Skip brand review"], impact: "Protects the brand before any spend." },
  "Campaign Ready": { confidence: "high", alternatives: ["Hold for more variants", "Launch unreviewed"], impact: "Brief-to-render package ready to launch." },
};
const EXPLAIN_FALLBACK = { confidence: "medium" as const, alternatives: ["Maintain the current plan"], impact: "Advances the campaign toward the chosen outcome." };

/** One event of the Production AI Activity Bus (Sprint 63W). */
export interface ActivityEvent {
  id: string;
  authorId: EmployeeId;
  at: number;
  category: string;
  title: string;
  description: string;
  /** Linked generated asset (focused in the Inspector). */
  assetId?: string;
  /** Linked Live Timeline stage. */
  stage?: string;
}

/** One event of the Production Live Timeline (Sprint 63V). */
export interface LiveTimelineEvent {
  id: string;
  at: number;
  ownerId: EmployeeId;
  stage: string;
  status: "complete" | "ready";
  durationSec: number;
  /** Reused Movie action label, when the stage maps to a Movie stage. */
  detail?: string;
  /** Linked generated asset (opens in the Inspector). */
  assetId?: string;
}

/** The deterministic 12-stage timeline spec — reuses Movie stage labels. */
interface LiveStageSpec {
  stage: string;
  ownerId: EmployeeId;
  movieStageId?: string;
  durationSec: number;
  ready?: boolean;
}
const LIVE_TIMELINE: LiveStageSpec[] = [
  { stage: "Brief Received", ownerId: "ceo", durationSec: 8 },
  { stage: "Research Started", ownerId: "creative-director", movieStageId: "s-hook", durationSec: 20 },
  { stage: "Competitor Analysis", ownerId: "media-buyer", durationSec: 24 },
  { stage: "Audience Analysis", ownerId: "media-buyer", durationSec: 18 },
  { stage: "Strategy Built", ownerId: "ceo", movieStageId: "s-brief", durationSec: 14 },
  { stage: "Hooks Generated", ownerId: "creative-director", durationSec: 22 },
  { stage: "Storyboard Generated", ownerId: "creative-director", durationSec: 26 },
  { stage: "Copy Generated", ownerId: "copywriter", movieStageId: "s-script", durationSec: 20 },
  { stage: "Creative Generated", ownerId: "automation", movieStageId: "s-render", durationSec: 30 },
  { stage: "Queue Created", ownerId: "automation", durationSec: 10 },
  { stage: "Approval Requested", ownerId: "brand-guardian", movieStageId: "s-brand", durationSec: 12 },
  { stage: "Campaign Ready", ownerId: "ceo", durationSec: 6, ready: true },
];

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

  // Production Live Timeline (Sprint 63V): 12 deterministic events, cumulative
  // times derived from each stage's duration (no timers), each linked to a
  // generated asset so selecting it opens the Inspector.
  let cursor = BASE;
  const timeline: LiveTimelineEvent[] = LIVE_TIMELINE.map((s, i) => {
    const at = cursor;
    cursor += s.durationSec * 1000;
    return {
      id: `${campaignId}-lt${i + 1}`,
      at,
      ownerId: s.ownerId,
      stage: s.stage,
      status: s.ready ? "ready" : "complete",
      durationSec: s.durationSec,
      detail: s.movieStageId ? MOVIE_LABEL[s.movieStageId] : undefined,
      assetId: creatives.length ? creatives[i % creatives.length].id : undefined,
    };
  });

  // AI Activity Bus (Sprint 63W): deterministic events emitted by the runtime,
  // each anchored to a Live Timeline stage (reusing its timestamp + linked
  // asset). No timers, no notifications — pure derivation.
  const tlByStage = new Map(timeline.map((t) => [t.stage, t]));
  const assetCount = assetPlan.assets.length;
  const activitySpec: { authorId: EmployeeId; category: string; title: string; description: string; stage: string }[] = [
    { authorId: "creative-director", category: "Research", title: "Finished competitor research", description: "Mapped rival angles and gaps.", stage: "Competitor Analysis" },
    { authorId: "media-buyer", category: "Forecast", title: "Predicted ROAS", description: `Modeled expected return for ${input.audience}.`, stage: "Audience Analysis" },
    { authorId: "finance", category: "Finance", title: "Calculated CPA", description: "Set the target cost per acquisition.", stage: "Strategy Built" },
    { authorId: "creative-director", category: "Creative", title: "Generated hooks", description: `Drafted ${creativePlan.hooks.length} problem-first hooks.`, stage: "Hooks Generated" },
    { authorId: "automation", category: "Creative", title: "Created storyboard", description: "Sequenced the shots.", stage: "Storyboard Generated" },
    { authorId: "copywriter", category: "Copy", title: "Wrote ad copy", description: `${creativePlan.headlines.length} headlines, ${creativePlan.descriptions.length} descriptions.`, stage: "Copy Generated" },
    { authorId: "automation", category: "Creative", title: "Generated creative", description: `Produced ${assetCount} assets.`, stage: "Creative Generated" },
    { authorId: "automation", category: "Connector", title: "Prepared Meta payload", description: "Built a PAUSED campaign payload (not published).", stage: "Creative Generated" },
    { authorId: "automation", category: "Queue", title: "Queue created", description: `${assetCount} creative tasks queued.`, stage: "Queue Created" },
    { authorId: REVIEWER, category: "Approval", title: "Approval requested", description: `Sent ${approvalPlan.items.length} assets to review.`, stage: "Approval Requested" },
    { authorId: "ceo", category: "Ready", title: "Campaign ready", description: "Brief to render — ready to launch.", stage: "Campaign Ready" },
  ];
  const activity: ActivityEvent[] = activitySpec.map((a, i) => {
    const tl = tlByStage.get(a.stage);
    return {
      id: `${campaignId}-ac${i + 1}`,
      authorId: a.authorId,
      at: tl?.at ?? BASE,
      category: a.category,
      title: a.title,
      description: a.description,
      assetId: tl?.assetId,
      stage: a.stage,
    };
  });

  // AI Explainability Layer (Sprint 63Y): one complete explanation per timeline
  // decision, grounded in campaign facts only. Reuses the timeline (stage,
  // employee, timestamp, asset) and the per-stage elaboration. Deterministic.
  const evidence = [
    `Outcome: ${outcomeLabel}`,
    `Audience: ${input.audience}`,
    `Budget: $${input.budget.toLocaleString()}`,
    `Placements: ${input.platforms.join(", ")}`,
  ];
  const explanations: DecisionExplanation[] = timeline.map((t) => {
    const elab = EXPLAIN_ELAB[t.stage] ?? EXPLAIN_FALLBACK;
    return {
      id: `${campaignId}-ex-${t.id}`,
      stage: t.stage,
      sourceEmployeeId: t.ownerId,
      why: `${employeeName(t.ownerId)} ran "${t.stage}" to move ${campaignPlan.name} toward ${outcomeLabel} for ${input.audience}.`,
      evidence,
      confidence: elab.confidence,
      alternatives: elab.alternatives,
      businessImpact: elab.impact,
      assetId: t.assetId,
    };
  });

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
    explanations,
  };
}
