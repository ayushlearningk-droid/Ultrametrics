/**
 * Action Engine — execution state machine (Sprint 14A).
 *
 * The deterministic lifecycle of one execution ATTEMPT. Pure data + pure
 * functions: no I/O, no provider logic, no persistence. The executor drives
 * transitions through here and refuses any edge not declared in TRANSITIONS, so
 * an attempt can never reach an undefined state.
 *
 * Dry-run note (Sprint 14A): provider execution is not enabled, so the executor
 * halts at `validating` and never enters `running` or any terminal-success path.
 * Those states are defined here because they are part of the real lifecycle the
 * future executor will use — the machine is complete; only the executor is
 * deliberately stopped early.
 */

/** Every state an execution attempt can occupy. Mirrors the DB CHECK constraint. */
export const EXECUTION_STATES = [
  "not_requested",
  "queued",
  "validating",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  // ── Rollback lifecycle (Sprint 17) — carried by the rollback execution ──
  "rollback_requested",
  "rolling_back",
  "rolled_back",
  "rollback_failed",
] as const;

export type ExecutionState = (typeof EXECUTION_STATES)[number];

/** Terminal states — no outgoing transitions; the attempt is finished. */
export const TERMINAL_STATES: ReadonlySet<ExecutionState> = new Set([
  "succeeded",
  "failed",
  "cancelled",
  "rolled_back",
  "rollback_failed",
]);

/**
 * Allowed transitions, keyed by source state.
 *
 * A normal attempt begins at `queued` and ends at succeeded/failed/cancelled.
 * `succeeded` is terminal — a rollback is a SEPARATE execution (never an in-place
 * transition of the original), so the original row never leaves `succeeded`.
 *
 * The rollback execution begins at `rollback_requested`:
 *   rollback_requested → rolling_back | cancelled
 *   rolling_back       → rolled_back | rollback_failed | cancelled
 *   rollback_failed    → rolling_back            (retry the rollback)
 */
export const TRANSITIONS: Readonly<Record<ExecutionState, readonly ExecutionState[]>> = {
  not_requested: ["queued"],
  queued: ["validating", "cancelled"],
  validating: ["running", "failed", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: ["queued"],
  cancelled: [],
  rollback_requested: ["rolling_back", "cancelled"],
  rolling_back: ["rolled_back", "rollback_failed", "cancelled"],
  rolled_back: [],
  rollback_failed: ["rolling_back"],
};

/** True when `to` is a declared successor of `from`. */
export function canTransition(from: ExecutionState, to: ExecutionState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(state: ExecutionState): boolean {
  return TERMINAL_STATES.has(state);
}

/** Type guard for untrusted strings (e.g. a DB row read back). */
export function isExecutionState(value: unknown): value is ExecutionState {
  return (
    typeof value === "string" &&
    (EXECUTION_STATES as readonly string[]).includes(value)
  );
}

/** Raised when the executor attempts an undeclared transition (a programming
 *  error, never user input). */
export class InvalidTransitionError extends Error {
  constructor(
    readonly from: ExecutionState,
    readonly to: ExecutionState
  ) {
    super(`Invalid execution transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Assert a transition is legal, returning the target state. Throws
 * InvalidTransitionError otherwise. The executor calls this before every write
 * so an illegal edge fails loudly instead of corrupting the attempt.
 */
export function assertTransition(
  from: ExecutionState,
  to: ExecutionState
): ExecutionState {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
  return to;
}
