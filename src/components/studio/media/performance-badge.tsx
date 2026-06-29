"use client";

/**
 * Production Media — PerformanceBadge (Sprint 63).
 *
 * A real metric pill (label + value) with an abstract tone (emerald / slate /
 * red). Tabular value. Token-based; no hardcoded colors.
 */

import { cn } from "@/lib/utils";
import type { PerformanceMetric } from "./types";

const TONE_CHIP: Record<NonNullable<PerformanceMetric["tone"]>, string> = {
  positive: "chip-emerald",
  neutral: "chip-slate",
  negative: "chip-red",
};

export function PerformanceBadge({ metric, className }: { metric: PerformanceMetric; className?: string }) {
  const tone = metric.tone ?? "neutral";
  return (
    <span className={cn("chip", TONE_CHIP[tone], "gap-1", className)}>
      <span className="text-foreground-muted">{metric.label}</span>
      <span className="font-semibold tabular-nums">{metric.value}</span>
    </span>
  );
}
