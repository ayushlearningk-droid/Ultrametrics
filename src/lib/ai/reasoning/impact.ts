/**
 * Business Impact Engine (Sprint 34).
 *
 * Translates the GROUNDED estimated-impact ranges (from get_recommendations'
 * AI-014 estimated_impact) into a plain-language business-impact statement with
 * its assumptions. It never invents numbers: with no ranges it reports the
 * impact as not quantified. Ranges are POTENTIAL outcomes from closing the gap
 * to benchmark — framed as such, never guaranteed/forecast.
 */

import type { RecInput, BusinessImpact, ImpactRange } from "./types";

function fmtRange(r: ImpactRange): string {
  const sign = r.direction === "decrease" ? "−" : "+";
  const verb = r.direction === "recover" ? "recover " : "";
  return `${verb}${sign}${r.lowPct}–${sign}${r.highPct}% ${r.metric}`;
}

/**
 * Aggregate the business impact across recommendations. Uses only the ranges +
 * assumptions the tool provided; deduplicates assumptions; stays qualitative
 * when nothing is quantified.
 */
export function estimateBusinessImpact(recs: RecInput[]): BusinessImpact {
  const ranges = recs.flatMap((r) => r.impactRanges ?? []);
  const assumptions = Array.from(
    new Set(
      recs
        .map((r) => r.impactAssumption?.trim())
        .filter((a): a is string => Boolean(a))
    )
  );

  if (ranges.length === 0) {
    return {
      summary:
        "Impact is directional — the available data doesn't support a quantified estimate for these actions.",
      assumptions,
      quantified: false,
    };
  }

  // Lead with the top recommendation's ranges (most material), capped.
  const lead = (recs.find((r) => (r.impactRanges ?? []).length > 0)?.impactRanges ??
    []) as ImpactRange[];
  const parts = lead.slice(0, 3).map(fmtRange);

  return {
    summary: `Potential upside if executed: ${parts.join(", ")}.`,
    assumptions,
    quantified: true,
  };
}
