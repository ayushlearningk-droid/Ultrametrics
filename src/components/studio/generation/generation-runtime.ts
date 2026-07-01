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
import { employeeName } from "@/components/studio/employees/employees-data";
import { buildMetaPayload, buildGooglePayload } from "./connectors";
import { initialAssetExecution, initialGenerationExecution, type GenerationExecution } from "./execution";
import { buildGenerationPayload, type GenerationPayload } from "./payload";
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
  /** Async execution summary (Sprint 64.1) — the store updates this during execution. */
  execution: GenerationExecution;
  /** Provider Marketplace input payload (Sprint 64B) — prompt + references + brand assets. */
  payload: GenerationPayload;
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

/**
 * One creative task per target platform. The first creative is IMAGE-first so the
 * single live provider (OpenAI Images) can execute it (Sprint 64Q); the remaining
 * assets keep the original alternating pattern.
 */
function buildAssets(campaignId: string, input: GenerationInput, creative: CreativePlan): AssetPlan {
  const assets: AssetSpec[] = input.platforms.map((platform, i) => ({
    id: `${campaignId}-as${i + 1}`,
    title: `${creative.headlines[i % creative.headlines.length]} · ${platform}`,
    kind: i === 0 ? "image" : i % 2 === 0 ? "video" : "image",
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
    // Honest pre-execution state (Sprint 64.1) — queued, no media until produced.
    execution: initialAssetExecution(),
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

  // Timeline & Activity are PURE PROJECTIONS of real execution (Sprint 64AC).
  // The runtime no longer fabricates events (no BASE clock, no hardcoded
  // durations, no fake research/ROAS/CPA/hook activity). They start empty; the
  // feed projects real events from each asset's execution state plus the
  // appended approval / regeneration events. The store is the single source of truth.
  const timeline: LiveTimelineEvent[] = [];
  const activity: ActivityEvent[] = [];

  // AI Explainability Layer (Sprint 63Y · decoupled from the timeline in 64AC).
  // Built directly from the deterministic stage spec — NOT from fabricated
  // timeline events — so the Explain panel + War Room keep working while the
  // timeline itself is real-execution-only. Grounded in campaign facts.
  const evidence = [
    `Outcome: ${outcomeLabel}`,
    `Audience: ${input.audience}`,
    `Budget: $${input.budget.toLocaleString()}`,
    `Placements: ${input.platforms.join(", ")}`,
  ];
  const explanations: DecisionExplanation[] = LIVE_TIMELINE.map((s, i) => {
    const elab = EXPLAIN_ELAB[s.stage] ?? EXPLAIN_FALLBACK;
    return {
      id: `${campaignId}-ex${i + 1}`,
      stage: s.stage,
      sourceEmployeeId: s.ownerId,
      why: `${employeeName(s.ownerId)} ran "${s.stage}" to move ${campaignPlan.name} toward ${outcomeLabel} for ${input.audience}.`,
      evidence,
      confidence: elab.confidence,
      alternatives: elab.alternatives,
      businessImpact: elab.impact,
      assetId: creatives.length ? creatives[i % creatives.length].id : undefined,
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
    execution: initialGenerationExecution(creatives.length),
    payload: buildGenerationPayload(input),
  };
}
