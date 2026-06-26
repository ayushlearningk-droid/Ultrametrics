/**
 * AI Command Center — queue helpers (Sprint 44).
 *
 * Pure, reusable grouping/selection helpers over a command list. No I/O, no
 * mutation — every function returns new structures and leaves the input intact.
 * Deterministic ordering so the (future) UI and eval suite agree.
 */

import type {
  Command,
  CommandCategory,
  Priority,
  ApprovalState,
} from "./types";

const PRIORITY_RANK: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };
const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 } as const;

/** Stable sort key: priority desc, then confidence desc (ties keep input order). */
function recommendationScore(c: Command): number {
  return PRIORITY_RANK[c.priority] * 10 + CONFIDENCE_RANK[c.confidence];
}

/** Group commands by priority bucket (High / Medium / Low). */
export function groupByPriority(
  commands: Command[]
): Record<Priority, Command[]> {
  const out: Record<Priority, Command[]> = { High: [], Medium: [], Low: [] };
  for (const c of commands) out[c.priority].push(c);
  return out;
}

/** Group commands by functional category. Only non-empty buckets are returned. */
export function groupByCategory(
  commands: Command[]
): Partial<Record<CommandCategory, Command[]>> {
  const out: Partial<Record<CommandCategory, Command[]>> = {};
  for (const c of commands) {
    (out[c.category] ??= []).push(c);
  }
  return out;
}

/** Group commands by approval status. */
export function groupByApproval(
  commands: Command[]
): Partial<Record<ApprovalState, Command[]>> {
  const out: Partial<Record<ApprovalState, Command[]>> = {};
  for (const c of commands) {
    (out[c.status] ??= []).push(c);
  }
  return out;
}

/**
 * The single highest-value command still awaiting a decision (pending or
 * simulated), ranked by priority then confidence. Returns null when none remain.
 * Stable: equal-scored commands keep their original order.
 */
export function getNextRecommended(commands: Command[]): Command | null {
  let best: Command | null = null;
  let bestScore = -Infinity;
  for (const c of commands) {
    if (c.status !== "pending" && c.status !== "simulated") continue;
    const score = recommendationScore(c);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/** Full priority-ordered queue (priority desc, confidence desc, stable). */
export function orderByRecommendation(commands: Command[]): Command[] {
  return commands
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const d = recommendationScore(b.c) - recommendationScore(a.c);
      return d !== 0 ? d : a.i - b.i;
    })
    .map(({ c }) => c);
}
