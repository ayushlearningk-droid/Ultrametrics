/**
 * Production Prompt Composer — option data + deterministic derivations (Sprint 63).
 *
 * Outcome-first command-center options. Reuses OUTCOMES (Outcome Engine) and the
 * Forecast Foundation. Pure data + deterministic estimators — no backend, no AI,
 * no generation.
 */

import type { LucideIcon } from "lucide-react";
import { OUTCOMES } from "@/components/studio/outcomes/outcomes-data";
import type { PlatformId } from "@/components/studio/media";
import type {
  ForecastHorizon,
  ForecastMetric,
  HistoricalPoint,
} from "@/lib/ai/forecast";

export interface ChipOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

/** Outcome options reuse the Outcome Engine catalog. */
export const OUTCOME_OPTIONS: ChipOption[] = OUTCOMES.map((o) => ({ id: o.id, label: o.label, icon: o.icon }));

export const PLATFORM_OPTIONS: { id: PlatformId; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "reels", label: "Reels" },
  { id: "shorts", label: "Shorts" },
  { id: "meta", label: "Meta" },
  { id: "youtube", label: "YouTube" },
];

export const AUDIENCE_OPTIONS: ChipOption[] = [
  { id: "lapsed", label: "Lapsed buyers" },
  { id: "new", label: "New visitors" },
  { id: "high-intent", label: "High-intent" },
  { id: "lookalike", label: "Lookalike" },
  { id: "retargeting", label: "Retargeting" },
];

export const BRAND_OPTIONS: ChipOption[] = [
  { id: "default", label: "Default brand" },
  { id: "aurora", label: "Aurora" },
  { id: "northwind", label: "Northwind" },
];

export const CAMPAIGN_OPTIONS: ChipOption[] = [
  { id: "spring-sale", label: "Spring Sale" },
  { id: "always-on", label: "Always-on" },
  { id: "launch", label: "Launch" },
];

export const OBJECTIVE_OPTIONS: ChipOption[] = [
  { id: "conversions", label: "Conversions" },
  { id: "awareness", label: "Awareness" },
  { id: "traffic", label: "Traffic" },
  { id: "leads", label: "Leads" },
  { id: "installs", label: "App installs" },
];

export const TONE_OPTIONS: ChipOption[] = [
  { id: "bold", label: "Bold" },
  { id: "playful", label: "Playful" },
  { id: "premium", label: "Premium" },
  { id: "trustworthy", label: "Trustworthy" },
  { id: "urgent", label: "Urgent" },
];

export const LANGUAGE_OPTIONS: ChipOption[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "hi", label: "Hindi" },
];

export const DURATION_OPTIONS: ChipOption[] = [
  { id: "6s", label: "6s" },
  { id: "15s", label: "15s" },
  { id: "30s", label: "30s" },
  { id: "60s", label: "60s" },
];

export const STYLE_OPTIONS: ChipOption[] = [
  { id: "ugc", label: "UGC" },
  { id: "cinematic", label: "Cinematic" },
  { id: "minimal", label: "Minimal" },
  { id: "bold-graphic", label: "Bold graphic" },
  { id: "avatar", label: "Talking avatar" },
];

export const CTA_OPTIONS: ChipOption[] = [
  { id: "shop", label: "Shop now" },
  { id: "learn", label: "Learn more" },
  { id: "signup", label: "Sign up" },
  { id: "offer", label: "Get offer" },
];

/* ── Deterministic cost estimate ─────────────────────────────────────────── */
export interface CostEstimate {
  tokens: number;
  costUsd: number;
  timeSec: number;
}

/** Count of brief fields the user has filled — drives the estimate. */
export function deriveCost(filledFields: number, durationId?: string): CostEstimate {
  const durationFactor = durationId ? Number.parseInt(durationId, 10) || 15 : 15;
  const tokens = 1200 + filledFields * 420 + durationFactor * 30;
  const costUsd = Math.round((tokens / 1000) * 0.012 * 100) / 100;
  const timeSec = 8 + Math.round(durationFactor / 3) + filledFields;
  return { tokens, costUsd, timeSec };
}

/* ── Deterministic forecast seed (history for the Forecast Foundation) ─────── */
export const FORECAST_METRIC: ForecastMetric = "ctr";
export const FORECAST_HORIZON: ForecastHorizon = "30d";

/**
 * Build a deterministic CTR history from the brief signals (budget + objective).
 * Higher budget + conversion objectives trend slightly up — purely illustrative,
 * fed into the real Forecast engine. No randomness.
 */
export function forecastSeed(budget: number, objectiveId?: string): HistoricalPoint[] {
  const base = 0.018;
  const slope = (objectiveId === "conversions" ? 0.0006 : 0.0003) + Math.min(0.0006, budget / 2_000_000);
  return Array.from({ length: 20 }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    value: Math.max(0.005, base + i * slope),
  }));
}
