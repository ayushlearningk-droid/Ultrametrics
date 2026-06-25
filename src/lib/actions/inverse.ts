/**
 * Action Engine — inverse-action mapper (Sprint 17).
 *
 * Single source of truth for "what undoes this action". The rollback engine and
 * UI both resolve inverses here — never hardcoded inside the executor. Adding a
 * reversible action type is a one-line change in INVERSE_ACTION.
 *
 * An action with no inverse (e.g. ADJUST_BUDGET, which would need the prior
 * budget value to reverse) maps to null and is therefore not rollbackable.
 */

import type { ActionType } from "@/lib/data/action-queue";

/** action → the action that reverses it. Omitted entries are not reversible. */
const INVERSE_ACTION: Partial<Record<ActionType, ActionType>> = {
  PAUSE_CAMPAIGN: "RESUME_CAMPAIGN",
  RESUME_CAMPAIGN: "PAUSE_CAMPAIGN",
  // ADJUST_BUDGET has no static inverse (needs the prior budget) → not mapped.
};

/** The inverse action type, or null when the action cannot be rolled back. */
export function inverseActionType(
  actionType: ActionType | null | undefined
): ActionType | null {
  if (!actionType) return null;
  return INVERSE_ACTION[actionType] ?? null;
}

/** Whether an action type can be rolled back at all. */
export function isReversible(actionType: ActionType | null | undefined): boolean {
  return inverseActionType(actionType) !== null;
}
