/**
 * Risk Graph (Sprint 39).
 *
 * Detects active risks from grounded signals + root causes + trends, each with
 * severity, confidence, and a recommended mitigation. Only triggered risks are
 * returned (no fabrication). Ranked by severity. Pure.
 */

import type { CreativeInput, CreativeSignals } from "@/lib/ai/creative/types";
import type { Risk, Severity } from "./types";
import { causesText } from "./util";

const SEV_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function detectRisks(
  input: CreativeInput,
  signals: CreativeSignals
): Risk[] {
  const causes = causesText(input.causes);
  const out: Risk[] = [];

  if (signals.ctaQuality === "weak" || signals.offerMatch === "weak")
    out.push({
      type: "Budget Waste",
      severity: "high",
      confidence: signals.confidence,
      mitigation: "Reallocate spend away from non-converting campaigns.",
    });

  if (signals.fatigueScore >= 60)
    out.push({
      type: "Creative Fatigue",
      severity: signals.fatigueScore >= 80 ? "critical" : "high",
      confidence: signals.confidence,
      mitigation: "Launch fresh creative (new hook + angle).",
    });

  if (/cpc/.test(causes))
    out.push({
      type: "High CPC",
      severity: "high",
      confidence: "medium",
      mitigation: "Test cost caps and review the bid strategy.",
    });

  if (input.ctrTrend === "declining")
    out.push({
      type: "Falling CTR",
      severity: "medium",
      confidence: "high",
      mitigation: "Refresh the hook and first 3 seconds.",
    });

  if (/roas/.test(causes))
    out.push({
      type: "Low ROAS",
      severity: "high",
      confidence: "medium",
      mitigation: "Pause low-ROAS campaigns; concentrate on converters.",
    });

  if (/learn/.test(causes))
    out.push({
      type: "Learning Limited",
      severity: "medium",
      confidence: "medium",
      mitigation: "Consolidate budgets/audiences to exit the learning phase.",
    });

  const freq = input.frequency ?? 0;
  if (signals.audienceMatch === "weak" || freq >= 3)
    out.push({
      type: "Audience Saturation",
      severity: freq >= 4 ? "high" : "medium",
      confidence: signals.confidence,
      mitigation: "Expand audiences / refresh creative to lower frequency.",
    });

  return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
}
