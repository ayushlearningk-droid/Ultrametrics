/**
 * Ask Ultrametrics — model router (Phase 1).
 *
 * Pure model selection. Default is Sonnet 4.6 with thinking disabled and low
 * effort (the cheap baseline). Escalates to Opus 4.8 (adaptive thinking + high
 * effort) only on conservative signals. Escalation is STICKY: once a
 * conversation escalates, it stays on Opus (the caller round-trips `escalated`
 * into `signals.stickyEscalated`). Escalation is PLAN-GATED: when opusAllowed is
 * false, the router never escalates.
 *
 * No I/O, no SDK calls — deterministic and unit-testable.
 */

import type { RouterSignals, RouteDecision } from "@/lib/ai/types";
import { detectChangeIntent } from "@/lib/ai/change/change-intent";

const SONNET = "claude-sonnet-4-6" as const;
const OPUS = "claude-opus-4-8" as const;

/**
 * Conservative escalation triggers: deep analysis / reasoning intent, plus
 * marketing decision/diagnostic/ranking phrasings (scale, pause, wasted spend,
 * worst/best performers, "which campaigns…", summaries) — these are analyst
 * questions that benefit from Opus reasoning. Bare metric lookups ("what is my
 * CTR") are deliberately NOT here so single-number questions stay on Sonnet.
 */
const COMPLEX_INTENT =
  /\b(why|analy[sz]e|analysis|compare|comparison|forecast|predict|diagnos|explain the|root cause|optimi[sz]e|recommend|trend|correlat|attribut|scale|pause|wast|underperform|worst|best[- ]?perform|summar|overview|big picture|which campaigns?|should i|saturat|fatigue)\b/i;

/** Token estimate above which a turn is treated as heavy enough to escalate. */
const LARGE_INPUT_TOKENS = 6000;

/** Tool-loop depth at/above which we escalate (multi-step reasoning). */
const DEEP_TOOL_ROUNDS = 2;

const SONNET_DEFAULT: Pick<RouteDecision, "model" | "thinking" | "effort"> = {
  model: SONNET,
  thinking: { type: "disabled" },
  effort: "low",
};

const OPUS_ESCALATED: Pick<RouteDecision, "model" | "thinking" | "effort"> = {
  model: OPUS,
  thinking: { type: "adaptive", display: "summarized" },
  effort: "high",
};

export function routeModel(signals: RouterSignals): RouteDecision {
  // Sprint 12: detect a Change Intelligence question once, attach it to every
  // decision, and treat it as a (plan-gated) escalation signal. Detection is
  // deterministic; it never forces a tool here — the system-prompt guard routes
  // the actual call to get_change_analysis (never get_root_cause).
  const changeIntent = detectChangeIntent(signals.userMessage);
  return { ...selectModel(signals, changeIntent !== null), changeIntent };
}

/** Pure model selection (Sonnet vs Opus). `isChangeIntent` is one escalation signal. */
function selectModel(
  signals: RouterSignals,
  isChangeIntent: boolean
): Omit<RouteDecision, "changeIntent"> {
  // Explicit override (admin/testing) wins, still honoring the plan gate.
  if (signals.explicitModel === OPUS && signals.opusAllowed) {
    return { ...OPUS_ESCALATED, escalated: true, reason: "explicit override → opus" };
  }
  if (signals.explicitModel === SONNET) {
    return { ...SONNET_DEFAULT, escalated: false, reason: "explicit override → sonnet" };
  }

  // Plan gate: starter-tier (or any plan without Opus) never escalates.
  if (!signals.opusAllowed) {
    return { ...SONNET_DEFAULT, escalated: false, reason: "plan does not allow opus" };
  }

  // Sticky: once escalated, stay escalated for the rest of the conversation.
  if (signals.stickyEscalated) {
    return { ...OPUS_ESCALATED, escalated: true, reason: "sticky escalation" };
  }

  // Conservative one-way escalation signals.
  if (signals.toolRoundsSoFar >= DEEP_TOOL_ROUNDS) {
    return { ...OPUS_ESCALATED, escalated: true, reason: `tool rounds ≥ ${DEEP_TOOL_ROUNDS}` };
  }
  if (signals.approxInputTokens >= LARGE_INPUT_TOKENS) {
    return { ...OPUS_ESCALATED, escalated: true, reason: "large input" };
  }
  // Sprint 12: a change question is analysis — escalate so the decomposition is
  // explained well (caught even when "why" is absent, e.g. "CTR increased this week").
  if (isChangeIntent) {
    return { ...OPUS_ESCALATED, escalated: true, reason: "change-analysis intent" };
  }
  if (COMPLEX_INTENT.test(signals.userMessage)) {
    return { ...OPUS_ESCALATED, escalated: true, reason: "complex-analysis intent" };
  }

  return { ...SONNET_DEFAULT, escalated: false, reason: "default" };
}
