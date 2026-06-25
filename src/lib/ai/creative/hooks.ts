/**
 * Creative Studio — Hook Generator (Sprint 37).
 *
 * Deterministic hook IDEAS across six categories, grounded in the diagnosed
 * creative problem (CreativeSignals). Bracketed [placeholders] mark where the
 * user fills product specifics — no invented metrics, no fabricated claims.
 * Pure; text only.
 */

import type { CreativeSignals, HookGroup } from "./types";

/** A short, grounded framing of the dominant problem to seed hooks. */
function focusOf(signals: CreativeSignals): string {
  if (signals.hookQuality === "weak" || signals.fatigueScore >= 60)
    return "[the #1 frustration]";
  if (signals.offerMatch === "weak") return "[the objection to your offer]";
  if (signals.ctaQuality === "weak") return "[taking the next step]";
  if (signals.audienceMatch === "weak") return "[what your audience really wants]";
  return "[the result your customer wants]";
}

export function generateHooks(signals: CreativeSignals): HookGroup[] {
  const focus = focusOf(signals);
  return [
    {
      category: "Scroll Stopper",
      hooks: [
        `Stop scrolling if you struggle with ${focus}.`,
        `POV: you finally fixed ${focus}.`,
        `The mistake quietly costing you [result].`,
      ],
    },
    {
      category: "Curiosity",
      hooks: [
        `What nobody tells you about ${focus}.`,
        `I tried [approach] for 30 days — here's what happened.`,
        `The real reason [outcome] isn't happening yet.`,
      ],
    },
    {
      category: "Problem",
      hooks: [
        `Struggling with ${focus}? You're not alone.`,
        `${focus} is costing you more than you think.`,
        `If [problem], watch this before you spend another rupee.`,
      ],
    },
    {
      category: "Offer",
      hooks: [
        `Get [outcome] without [objection].`,
        `[Offer] — only until [date].`,
        `Why [audience] are switching to [product].`,
      ],
    },
    {
      category: "UGC",
      hooks: [
        `Honestly didn't expect [product] to [result].`,
        `Real talk: [product] changed how I [activity].`,
        `Day 1 vs Day 30 with [product].`,
      ],
    },
    {
      category: "Emotional",
      hooks: [
        `You deserve [emotional outcome].`,
        `Remember when ${focus}? Not anymore.`,
        `This is for anyone tired of [frustration].`,
      ],
    },
  ];
}
