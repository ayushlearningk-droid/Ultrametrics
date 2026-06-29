/**
 * AI Employees Runtime — registry + pipeline (Sprint 63H).
 *
 * The seven employees (identity + personality) and the DETERMINISTIC pipeline
 * the simulation runs. The conversation, artifacts, and confidence are all
 * scripted here — no LLM, no randomness. Adding an employee/stage is a registry
 * edit, not a redesign.
 */

import {
  Crown,
  Palette,
  PenLine,
  ShieldCheck,
  Target,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Confidence, EmployeeId, EmployeeIdentity } from "./types";

export const EMPLOYEES: EmployeeIdentity[] = [
  { id: "ceo", name: "Atlas", role: "CEO AI", personality: "Decisive orchestrator — sets direction, keeps the team aligned." },
  { id: "creative-director", name: "Theo", role: "Creative Director", personality: "Taste-driven and opinionated about hooks and craft." },
  { id: "copywriter", name: "Quill", role: "Copywriter", personality: "Sharp, on-voice, obsessed with the first three seconds." },
  { id: "brand-guardian", name: "Iris", role: "Brand Guardian", personality: "Protective of identity — vetoes anything off-brand." },
  { id: "media-buyer", name: "Maya", role: "Media Buyer", personality: "Performance-obsessed — everything through predicted ROAS." },
  { id: "finance", name: "Sol", role: "Finance AI", personality: "Disciplined steward of budget and pacing." },
  { id: "automation", name: "Nova", role: "Automation AI", personality: "Tireless builder — wires and renders the pipeline." },
];

export const EMPLOYEE_ICON: Record<EmployeeId, LucideIcon> = {
  ceo: Crown,
  "creative-director": Palette,
  copywriter: PenLine,
  "brand-guardian": ShieldCheck,
  "media-buyer": Target,
  finance: Wallet,
  automation: Workflow,
};

export function employeeName(id: EmployeeId): string {
  return EMPLOYEES.find((e) => e.id === id)?.name ?? id;
}

/** One scripted stage of the pipeline. */
export interface PipelineStage {
  id: string;
  ownerId: EmployeeId;
  title: string;
  /** Spoken on the bus when the stage starts working; routed to the next owner. */
  message: string;
  artifact: string;
  confidence?: Confidence;
  priority: number;
  /** Ticks of "working" before completion (drives progress speed). */
  durationTicks: number;
}

/**
 * The deterministic flow:
 * CEO → Creative Director → Copywriter → Brand Guardian → Media Buyer →
 * Finance → Automation → Completed.
 */
export const PIPELINE: PipelineStage[] = [
  { id: "s-brief", ownerId: "ceo", title: "Campaign brief", message: "Launch the festive campaign — make it punchy.", artifact: "Campaign brief", priority: 1, durationTicks: 5 },
  { id: "s-hook", ownerId: "creative-director", title: "Hook directions", message: "Need a stronger, problem-first hook.", artifact: "Hook directions", confidence: "medium", priority: 1, durationTicks: 6 },
  { id: "s-script", ownerId: "copywriter", title: "Scripts", message: "Drafted 3 scripts in our voice.", artifact: "3 scripts", confidence: "high", priority: 1, durationTicks: 6 },
  { id: "s-brand", ownerId: "brand-guardian", title: "Brand check", message: "On-brand ✓ — cleared.", artifact: "Brand check", confidence: "high", priority: 2, durationTicks: 4 },
  { id: "s-forecast", ownerId: "media-buyer", title: "CTR forecast", message: "Predicted CTR +12%.", artifact: "CTR forecast", confidence: "high", priority: 1, durationTicks: 5 },
  { id: "s-budget", ownerId: "finance", title: "Budget", message: "Budget approved.", artifact: "Budget plan", confidence: "high", priority: 2, durationTicks: 4 },
  { id: "s-render", ownerId: "automation", title: "Final render", message: "Rendering the final cut.", artifact: "Final render", priority: 1, durationTicks: 7 },
];
