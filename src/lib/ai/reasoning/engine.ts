/**
 * Marketing Reasoning Engine (Sprint 34).
 *
 * Deterministically composes a grounded analyst narrative from the existing
 * tool outputs (headline · trends · causes · recommendations) plus workspace
 * memory/watch-outs. Reuses the Priority, Business-Impact, and Confidence
 * engines. Pure: no I/O, no model call, and nothing is invented — every clause
 * derives from its input and is omitted when the input is absent.
 */

import type { ReasoningInput, ReasoningResult, TrendInput } from "./types";
import { prioritize } from "./priority";
import { estimateBusinessImpact } from "./impact";
import { overallConfidence } from "./confidence";

function money(v: number, currency?: string): string {
  return `${currency ? currency + " " : ""}${v.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}
function ratio(v: number): string {
  return v.toFixed(2);
}
function humanize(raw: string): string {
  const s = raw.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Top measurable changes as "CTR up 18%" phrases (largest magnitude first). */
function topChanges(trends: TrendInput[], n: number): string[] {
  return [...trends]
    .filter((t) => t.status !== "stable" && Boolean(t.changeLabel))
    .map((t) => ({
      t,
      mag: Math.abs(parseFloat(t.changeLabel.replace(/[^0-9.\-]/g, ""))) || 0,
    }))
    .sort((a, b) => b.mag - a.mag)
    .slice(0, n)
    .map(({ t }) => {
      const up = t.changeLabel.trim().startsWith("+");
      const num = t.changeLabel.replace(/[+-]/, "").trim();
      return `${t.metric.toUpperCase()} ${up ? "up" : "down"} ${num}`;
    });
}

/** Run the full reasoning pass. */
export function reason(input: ReasoningInput): ReasoningResult {
  const { headline, currency, trends, causes, recommendations, watchOuts } = input;

  const prioritizedActions = prioritize(recommendations);
  const businessImpact = estimateBusinessImpact(recommendations);
  const confidence = overallConfidence(recommendations, causes);

  const topCause = [...causes].sort(
    (a, b) => (SEVERITY_RANK[(b.severity ?? "").toLowerCase()] ?? 0) -
      (SEVERITY_RANK[(a.severity ?? "").toLowerCase()] ?? 0)
  )[0];

  const diagnosis = topCause
    ? `${humanize(topCause.primaryCause)}${topCause.severity ? ` (${topCause.severity})` : ""}`
    : null;

  const changes = topChanges(trends, 2);

  const evidence: string[] = [
    `${money(headline.spend, currency)} spent at ROAS ${ratio(headline.roas)}` +
      (typeof headline.revenue === "number"
        ? ` on ${money(headline.revenue, currency)} revenue`
        : ""),
  ];
  if (changes.length > 0) evidence.push(changes.join(", "));
  if (topCause?.evidence) evidence.push(topCause.evidence);

  const risks: string[] = [
    ...causes.map(
      (c) =>
        `${humanize(c.primaryCause)}${c.severity ? ` (${c.severity})` : ""}`
    ),
    ...(watchOuts ?? []),
  ];

  const opportunities = prioritizedActions.slice(0, 3).map((a) => a.action);

  // Executive summary — grounded, concise, no generic AI phrasing.
  const summaryParts: string[] = [
    `${money(headline.spend, currency)} spent at ROAS ${ratio(headline.roas)}.`,
  ];
  if (changes.length > 0) summaryParts.push(`${changes.join(", ")}.`);
  if (diagnosis) summaryParts.push(`Top risk: ${diagnosis}.`);
  if (prioritizedActions.length > 0) {
    const high = prioritizedActions.filter((a) => a.priority === "High").length;
    summaryParts.push(
      `${prioritizedActions.length} action${prioritizedActions.length === 1 ? "" : "s"} ready` +
        (high > 0 ? ` (${high} high-priority)` : "") +
        ` — start with ${prioritizedActions[0].action}.`
    );
  } else if ((watchOuts ?? []).length > 0) {
    summaryParts.push(`${watchOuts!.length} watch-out(s) to review.`);
  }

  const expectedOutcome = businessImpact.quantified
    ? `${businessImpact.summary}${
        businessImpact.assumptions[0]
          ? ` Assumes: ${businessImpact.assumptions[0]}`
          : ""
      }`
    : null;

  return {
    executiveSummary: summaryParts.join(" "),
    diagnosis,
    evidence,
    businessImpact,
    risks,
    opportunities,
    prioritizedActions,
    expectedOutcome,
    confidence,
  };
}
