/**
 * Ask Ultrametrics — Change Intelligence validation cases (Sprint 12, Phase C).
 *
 * Deterministic, self-checking validation of the Change Intelligence Engine and
 * its routing. Pure (no I/O, no model): builds two real windows per scenario via
 * the SAME toTotals() the engine uses, runs the live detector + decomposition
 * engine, and asserts the grounded outcome. Exercises the four headline metrics
 * plus the insufficient_data guard, and verifies routing always selects
 * get_change_analysis and NEVER get_root_cause for a change question.
 *
 * Has no callers in app code — it is a checked, runnable harness (typechecks with
 * the rest of the build; execute with a TS runner to see PASS/FAIL output).
 */

import type { MetricTotals, RawMetricSet } from "@/lib/metrics/types";
import { toTotals } from "@/lib/metrics/derive";
import { explainChange, type ChangeMetric } from "@/lib/ai/change/change-analysis";
import { detectChangeIntent } from "@/lib/ai/change/change-intent";

/** Build a full MetricTotals from raw inputs (derived ratios via toTotals). */
function totals(raw: Partial<RawMetricSet>): MetricTotals {
  return toTotals({
    spend: raw.spend ?? 0,
    revenue: raw.revenue ?? 0,
    impressions: raw.impressions ?? 0,
    clicks: raw.clicks ?? 0,
    conversions: raw.conversions ?? 0,
    reach: raw.reach ?? 0,
  });
}

interface ChangeCase {
  name: string;
  prompt: string;
  metric: ChangeMetric;
  previous: MetricTotals;
  current: MetricTotals;
  expectDirection: "up" | "down";
  expectPrimaryDriver: string;
}

/** The four required scenarios (one per headline metric). */
export const CHANGE_CASES: ChangeCase[] = [
  {
    name: "ROAS decrease (spend-driven)",
    prompt: "why did roas drop",
    metric: "roas",
    // ROAS 5.0 → 3.0: revenue −10%, spend +50% → spend dominates.
    previous: totals({ revenue: 1000, spend: 200, clicks: 100, impressions: 5000 }),
    current: totals({ revenue: 900, spend: 300, clicks: 120, impressions: 5200 }),
    expectDirection: "down",
    expectPrimaryDriver: "spend",
  },
  {
    name: "CTR increase (clicks-driven)",
    prompt: "why did ctr increase this week",
    metric: "ctr",
    // CTR 1.0% → 2.5%: clicks +200%, impressions +20% → clicks dominate.
    previous: totals({ clicks: 100, impressions: 10000, spend: 100 }),
    current: totals({ clicks: 300, impressions: 12000, spend: 150 }),
    expectDirection: "up",
    expectPrimaryDriver: "clicks",
  },
  {
    name: "CPC increase (spend-driven)",
    prompt: "why did cpc rise",
    metric: "cpc",
    // CPC 1.0 → 2.0: spend +200%, clicks +50% → spend dominates.
    previous: totals({ spend: 100, clicks: 100, impressions: 8000 }),
    current: totals({ spend: 300, clicks: 150, impressions: 8200 }),
    expectDirection: "up",
    expectPrimaryDriver: "spend",
  },
  {
    name: "Conversions decrease (rate-driven)",
    prompt: "why did conversions fall",
    metric: "conversions",
    // Conversions 50 → 30: clicks +10%, conversion_rate −45% → rate dominates.
    previous: totals({ conversions: 50, clicks: 1000, spend: 500, impressions: 20000 }),
    current: totals({ conversions: 30, clicks: 1100, spend: 520, impressions: 21000 }),
    expectDirection: "down",
    expectPrimaryDriver: "conversion_rate",
  },
];

export interface ValidationResult {
  pass: boolean;
  lines: string[];
}

/**
 * Run all validation cases. Returns overall pass + a human-readable line per
 * assertion. Pure — safe to call from a test/script.
 */
export function runChangeValidation(): ValidationResult {
  const lines: string[] = [];
  let pass = true;

  const check = (label: string, ok: boolean, detail = "") => {
    if (!ok) pass = false;
    lines.push(`${ok ? "PASS" : "FAIL"} — ${label}${detail ? `: ${detail}` : ""}`);
  };

  for (const c of CHANGE_CASES) {
    // 1. Routing: a change question must select get_change_analysis, never root cause.
    const intent = detectChangeIntent(c.prompt);
    check(`[route] "${c.prompt}" detected`, intent !== null);
    check(
      `[route] "${c.prompt}" → get_change_analysis`,
      intent?.tool === "get_change_analysis",
      String(intent?.tool)
    );
    check(
      `[route] "${c.prompt}" never routes to root_cause`,
      (intent?.tool as string) !== "get_root_cause"
    );
    check(`[route] "${c.prompt}" metric = ${c.metric}`, intent?.metric === c.metric, String(intent?.metric));

    // 2. Decomposition: grounded, exact, expected primary driver + direction.
    const ex = explainChange(c.current, c.previous, c.metric, {
      comparable: true,
      lookbackDays: 7,
    });
    check(`[engine] ${c.name} status ok`, ex.status === "ok", ex.reason ?? "");
    check(`[engine] ${c.name} direction ${c.expectDirection}`, ex.direction === c.expectDirection, String(ex.direction));
    check(
      `[engine] ${c.name} primary driver ${c.expectPrimaryDriver}`,
      ex.primaryDriver === c.expectPrimaryDriver,
      `${ex.primaryDriver ?? "(mixed)"} / attribution=${ex.attribution}`
    );
    // Drivers' contribution shares must sum to ~1 (exact log identity).
    const shareSum = (ex.drivers ?? []).reduce((a, d) => a + d.contributionShare, 0);
    check(`[engine] ${c.name} driver shares sum ≈ 1`, Math.abs(shareSum - 1) < 1e-9, shareSum.toFixed(6));
  }

  // 3. insufficient_data — non-comparable windows return no numbers, no cause.
  const incomparable = explainChange(
    totals({ revenue: 900, spend: 300 }),
    totals({ revenue: 1000, spend: 200 }),
    "roas",
    { comparable: false, lookbackDays: 7 }
  );
  check(
    "[guard] non-comparable windows → insufficient_data",
    incomparable.status === "insufficient_data" && incomparable.current === undefined,
    incomparable.reason ?? ""
  );

  // 4. insufficient_data — below the volume floor (spend < MIN_SPEND) → no cause.
  const subFloor = explainChange(
    totals({ revenue: 30, spend: 10, clicks: 5, impressions: 100 }),
    totals({ revenue: 40, spend: 12, clicks: 6, impressions: 120 }),
    "roas",
    { comparable: true, lookbackDays: 1 }
  );
  check(
    "[guard] below volume floor → insufficient_data",
    subFloor.status === "insufficient_data",
    subFloor.reason ?? ""
  );

  return { pass, lines };
}
