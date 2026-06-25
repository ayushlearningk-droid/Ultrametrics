/**
 * Marketing Brain — shared helpers (Sprint 39). Pure.
 */

import type { Severity } from "./types";

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function causesText(causes?: string[]): string {
  return (causes ?? []).join(" ").toLowerCase();
}

/** Score (0–100) → severity band (higher score = healthier = lower severity). */
export function severityForScore(score: number): Severity {
  if (score >= 75) return "low";
  if (score >= 50) return "medium";
  if (score >= 30) return "high";
  return "critical";
}

/** Parse a target ROAS the user stated in workspace memory, e.g. "target ROAS 3.0". */
export function parseTargetRoas(memories?: string[]): number | null {
  for (const m of memories ?? []) {
    const mm = /roas[^0-9]{0,15}(\d+(?:\.\d+)?)/i.exec(m);
    if (mm) {
      const v = parseFloat(mm[1]);
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  return null;
}
