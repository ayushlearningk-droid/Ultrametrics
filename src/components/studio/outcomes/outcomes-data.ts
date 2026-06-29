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

export interface Outcome {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const OUTCOMES: Outcome[] = [
  { id: "increase-roas", label: "Increase ROAS", icon: TrendingUp, description: "Squeeze more return from current spend." },
  { id: "launch-product", label: "Launch Product", icon: Rocket, description: "Go to market with a full campaign." },
  { id: "festival-campaign", label: "Create Festival Campaign", icon: PartyPopper, description: "Seasonal, on-brand creative at scale." },
  { id: "get-leads", label: "Get More Leads", icon: UserPlus, description: "Drive qualified sign-ups." },
  { id: "beat-competitor", label: "Beat Competitor", icon: Swords, description: "Out-create a named rival." },
  { id: "ugc-campaign", label: "Generate UGC Campaign", icon: Users, description: "Authentic creator-style ads." },
  { id: "increase-ctr", label: "Increase CTR", icon: MousePointerClick, description: "Sharper hooks, higher click-through." },
  { id: "recover-campaign", label: "Recover Declining Campaign", icon: Activity, description: "Heal fatigue, restore performance." },
];

export function outcomeById(id: string): Outcome | undefined {
  return OUTCOMES.find((o) => o.id === id);
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
