/**
 * AI Command Center — approval model (Sprint 44).
 *
 * A reusable, pure approval state machine. This sprint covers the pre-execution
 * lifecycle only: pending → simulated → approved/rejected. The `executed` and
 * `rolled_back` states are reserved for a FUTURE execution pipeline and are
 * declared as legal targets so consumers can render them, but this layer never
 * performs execution or rollback — it only validates/records intent. No I/O.
 */

import type { ApprovalState, ApprovalTransition, Command } from "./types";

/** Legal transitions. `executed`/`rolled_back` belong to the future pipeline. */
const TRANSITIONS: Record<ApprovalState, ApprovalState[]> = {
  pending: ["simulated", "approved", "rejected"],
  simulated: ["approved", "rejected"],
  approved: ["executed", "rejected"],
  rejected: ["pending"],
  // Terminal for this layer (owned by the future execution pipeline).
  executed: ["rolled_back"],
  rolled_back: [],
};

/** The initial approval state for a freshly mapped command. */
export function initialApprovalState(): ApprovalState {
  return "pending";
}

/** Whether a state transition is allowed by the model. */
export function canTransition(from: ApprovalState, to: ApprovalState): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Validate a transition, returning the resulting state (or the unchanged state
 * with a reason when rejected). Pure — never mutates the input.
 */
export function transition(
  from: ApprovalState,
  to: ApprovalState
): ApprovalTransition {
  if (canTransition(from, to)) return { ok: true, state: to };
  return {
    ok: false,
    state: from,
    reason: `Illegal transition: ${from} → ${to}.`,
  };
}

/** Apply an approval decision to a command, returning a NEW command. */
export function applyDecision(
  command: Command,
  to: ApprovalState
): { command: Command; transition: ApprovalTransition } {
  const t = transition(command.status, to);
  return {
    command: t.ok ? { ...command, status: t.state } : command,
    transition: t,
  };
}

/** Convenience guards used by future UI to gate controls. */
export function isActionable(state: ApprovalState): boolean {
  return state === "pending" || state === "simulated";
}
export function isApproved(state: ApprovalState): boolean {
  return state === "approved";
}
export function isTerminal(state: ApprovalState): boolean {
  return state === "rejected" || state === "rolled_back";
}
