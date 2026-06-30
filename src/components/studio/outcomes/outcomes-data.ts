/**
 * Outcome Engine — outcomes + deterministic plan (Sprint 63J).
 *
 * Outcome-first: the user chooses a business outcome, never a tool. Selecting an
 * outcome assembles a fixed, deterministic plan (Brand → … → Analytics), each
 * step owned by an AI employee (reused from the Employees Runtime registry).
 * Presentation only — no generation, no APIs, no providers.
 */

import {
  TrendingUp,
  Rocket,
  PartyPopper,
  UserPlus,
  Swords,
  Users,
  MousePointerClick,
  Activity,
  ShieldCheck,
  Crosshair,
  Sparkles,
  PenLine,
  LayoutPanelTop,
  Image as ImageIcon,
  Video,
  Mic,
  Captions,
  Globe,
  Send,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { EmployeeId } from "@/components/studio/employees/types";
import type { PlatformId } from "@/components/studio/media";

/** Outcome Intelligence categories (Sprint 63T). */
export type OutcomeCategory = "Growth" | "Sales" | "Branding" | "Performance" | "Seasonal" | "Retention";

export const OUTCOME_CATEGORIES: OutcomeCategory[] = [
  "Growth",
  "Sales",
  "Branding",
  "Performance",
  "Seasonal",
  "Retention",
];

export interface Outcome {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /* ── Outcome Intelligence (Sprint 63T) ── */
  category: OutcomeCategory;
  /** Expected KPIs this outcome moves. */
  kpis: string[];
  /** Recommended AI employees for this outcome (reused Employees registry). */
  employees: EmployeeId[];
  /** Estimated end-to-end duration. */
  duration: string;
  /** What the campaign ships. */
  deliverables: string[];
  /** Recommended placements. */
  platforms: PlatformId[];
  /** Defaults that auto-populate the Command Center brief on selection. */
  objective: string;
  audience: string;
}

export const OUTCOMES: Outcome[] = [
  {
    id: "increase-roas",
    label: "Increase ROAS",
    icon: TrendingUp,
    description: "Squeeze more return from current spend.",
    category: "Performance",
    kpis: ["ROAS", "CPA", "Conversion rate"],
    employees: ["media-buyer", "creative-director", "finance"],
    duration: "5–7 days",
    deliverables: ["3 hook variants", "Budget reallocation plan", "Performance forecast"],
    platforms: ["meta", "reels", "tiktok"],
    objective: "Conversions",
    audience: "High-intent purchasers",
  },
  {
    id: "launch-product",
    label: "Launch Product",
    icon: Rocket,
    description: "Go to market with a full campaign.",
    category: "Sales",
    kpis: ["Revenue", "New customers", "AOV"],
    employees: ["ceo", "creative-director", "copywriter", "media-buyer"],
    duration: "10–14 days",
    deliverables: ["Launch creative set", "Landing page", "Phased media plan"],
    platforms: ["meta", "reels", "youtube", "tiktok"],
    objective: "Sales",
    audience: "New prospective buyers",
  },
  {
    id: "festival-campaign",
    label: "Create Festival Campaign",
    icon: PartyPopper,
    description: "Seasonal, on-brand creative at scale.",
    category: "Seasonal",
    kpis: ["Reach", "Engagement rate", "Revenue"],
    employees: ["creative-director", "brand-guardian", "automation"],
    duration: "7–10 days",
    deliverables: ["Seasonal creative pack", "Story/Reel set", "Promo offer copy"],
    platforms: ["reels", "tiktok", "shorts"],
    objective: "Engagement",
    audience: "Seasonal shoppers",
  },
  {
    id: "get-leads",
    label: "Get More Leads",
    icon: UserPlus,
    description: "Drive qualified sign-ups.",
    category: "Growth",
    kpis: ["Leads", "Cost per lead", "Lead quality"],
    employees: ["media-buyer", "copywriter", "automation"],
    duration: "5–7 days",
    deliverables: ["Lead-gen creative", "Form / landing page", "Audience segments"],
    platforms: ["meta", "youtube"],
    objective: "Lead generation",
    audience: "Qualified prospects",
  },
  {
    id: "beat-competitor",
    label: "Beat Competitor",
    icon: Swords,
    description: "Out-create a named rival.",
    category: "Branding",
    kpis: ["Share of voice", "CTR", "Brand lift"],
    employees: ["creative-director", "media-buyer", "brand-guardian"],
    duration: "7–10 days",
    deliverables: ["Competitive angle deck", "Differentiated hooks", "Comparison creative"],
    platforms: ["meta", "youtube", "reels"],
    objective: "Brand awareness",
    audience: "Competitor's audience",
  },
  {
    id: "ugc-campaign",
    label: "Generate UGC Campaign",
    icon: Users,
    description: "Authentic creator-style ads.",
    category: "Branding",
    kpis: ["Engagement rate", "CTR", "Watch time"],
    employees: ["creative-director", "copywriter", "automation"],
    duration: "5–8 days",
    deliverables: ["UGC scripts", "Creator-style videos", "Caption set"],
    platforms: ["tiktok", "reels", "shorts"],
    objective: "Engagement",
    audience: "Social-native viewers",
  },
  {
    id: "increase-ctr",
    label: "Increase CTR",
    icon: MousePointerClick,
    description: "Sharper hooks, higher click-through.",
    category: "Performance",
    kpis: ["CTR", "Hook rate", "CPC"],
    employees: ["creative-director", "copywriter", "media-buyer"],
    duration: "3–5 days",
    deliverables: ["Hook test matrix", "Thumb-stopping openers", "Caption variants"],
    platforms: ["reels", "tiktok", "shorts"],
    objective: "Traffic",
    audience: "Cold scrollers",
  },
  {
    id: "recover-campaign",
    label: "Recover Declining Campaign",
    icon: Activity,
    description: "Heal fatigue, restore performance.",
    category: "Retention",
    kpis: ["Frequency", "ROAS", "Fatigue score"],
    employees: ["media-buyer", "creative-director", "finance"],
    duration: "4–6 days",
    deliverables: ["Fatigue diagnosis", "Refresh creative", "Pacing adjustment"],
    platforms: ["meta", "reels"],
    objective: "Conversions",
    audience: "Existing reached audience",
  },
];

export function outcomeById(id: string): Outcome | undefined {
  return OUTCOMES.find((o) => o.id === id);
}

/** Outcomes belonging to a category (preserves declaration order). Deterministic. */
export function outcomesByCategory(category: OutcomeCategory): Outcome[] {
  return OUTCOMES.filter((o) => o.category === category);
}

/** One step of the assembled plan, owned by an AI employee. */
export interface PlanStep {
  id: string;
  label: string;
  icon: LucideIcon;
  ownerId: EmployeeId;
  detail: string;
}

/**
 * The deterministic plan chain. Same backbone for every outcome (the OS always
 * runs the full pipeline); the outcome frames the headline. Each step is owned
 * by the employee whose specialty it is.
 */
export const PLAN_STEPS: PlanStep[] = [
  { id: "brand", label: "Brand", icon: ShieldCheck, ownerId: "brand-guardian", detail: "Pull brand voice, colors, and rules." },
  { id: "competitors", label: "Competitors", icon: Crosshair, ownerId: "media-buyer", detail: "Scan rival creative and angles." },
  { id: "audience", label: "Audience", icon: Users, ownerId: "media-buyer", detail: "Target the right segment." },
  { id: "hooks", label: "Winning Hooks", icon: Sparkles, ownerId: "creative-director", detail: "Draft problem-first hooks." },
  { id: "scripts", label: "Scripts", icon: PenLine, ownerId: "copywriter", detail: "Write on-voice scripts." },
  { id: "storyboards", label: "Storyboards", icon: LayoutPanelTop, ownerId: "creative-director", detail: "Sequence the shots." },
  { id: "images", label: "Images", icon: ImageIcon, ownerId: "automation", detail: "Produce key visuals." },
  { id: "videos", label: "Videos", icon: Video, ownerId: "automation", detail: "Assemble the cuts." },
  { id: "voice", label: "Voice", icon: Mic, ownerId: "automation", detail: "Add voice-over." },
  { id: "captions", label: "Captions", icon: Captions, ownerId: "copywriter", detail: "Sync captions." },
  { id: "landing", label: "Landing Page", icon: Globe, ownerId: "automation", detail: "Build the destination." },
  { id: "publishing", label: "Publishing", icon: Send, ownerId: "automation", detail: "Schedule and publish." },
  { id: "analytics", label: "Analytics", icon: BarChart3, ownerId: "media-buyer", detail: "Measure and learn." },
];

/** Assemble the plan for an outcome. Deterministic. */
export function buildPlan(outcomeId: string): PlanStep[] {
  // The backbone is constant; outcomeId is validated so unknown ids yield no plan.
  return outcomeById(outcomeId) ? PLAN_STEPS : [];
}
