"use client";

/**
 * Action Queue — shared client store (Sprint 9, Decision Queue Integration).
 *
 * A module-level, in-memory store (via useSyncExternalStore) that connects AI
 * recommendation approvals to the Action Queue page. NO database, NO Meta/Google
 * API, NO execution — purely local, session-scoped shared state. Approving an AI
 * recommendation enqueues it here; the /dashboard/actions surface reads the same
 * store, so the approved item appears in the queue across client navigation.
 *
 * Resets on a full page reload (intentional — there is no persistence layer).
 */

import { useSyncExternalStore } from "react";

export type ActionStatus = "pending" | "approved" | "dismissed";
export type ActionPriority = "High" | "Medium" | "Low";

export interface QueuedAction {
  id: string;
  title: string;
  /** Where it originated, e.g. "Meta Ads", "Ask Ultrametrics". */
  source: string;
  /** Coarse action kind, e.g. "scale" | "pause" | "budget" | "fix". */
  type?: string;
  rationale?: string;
  expectedImpact?: string;
  priority?: ActionPriority;
  status: ActionStatus;
}

/** Payload an AI card passes when the user approves a recommendation. */
export interface ActionInput {
  title: string;
  source?: string;
  type?: string;
  rationale?: string;
  expectedImpact?: string;
  priority?: ActionPriority;
}

/**
 * Initial queue (Sprint 9, Option A): starts EMPTY — the queue is populated
 * solely by AI-recommendation approvals, so an approved item is the only entry.
 */
const SEED: QueuedAction[] = [];

// ── Store internals ──────────────────────────────────────────────────────────
let state: QueuedAction[] = SEED;
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): QueuedAction[] {
  return state;
}

/** Stable server snapshot (the seed) so SSR + first client render agree. */
function getServerSnapshot(): QueuedAction[] {
  return SEED;
}

// ── Public actions ───────────────────────────────────────────────────────────

/**
 * Enqueue an approved AI recommendation. Returns the new id so the caller can
 * remove it again if the user toggles the approval off.
 */
export function enqueueAction(input: ActionInput): string {
  const id = `ai-${++seq}`;
  const action: QueuedAction = {
    id,
    title: input.title,
    source: input.source ?? "Ask Ultrametrics",
    type: input.type,
    rationale: input.rationale,
    expectedImpact: input.expectedImpact,
    priority: input.priority,
    status: "approved",
  };
  state = [action, ...state];
  emit();
  return id;
}

/** Remove an action (e.g. the user un-approves a recommendation). */
export function removeAction(id: string): void {
  state = state.filter((a) => a.id !== id);
  emit();
}

/** Update an action's status (Approve / Dismiss on the queue page). */
export function setActionStatus(id: string, status: ActionStatus): void {
  state = state.map((a) => (a.id === id ? { ...a, status } : a));
  emit();
}

/** Subscribe a component to the shared Action Queue. */
export function useActionQueue(): QueuedAction[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
