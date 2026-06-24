"use client";

/**
 * Action Queue — server-backed client store (Sprint 10E).
 *
 * A module-level store (useSyncExternalStore) that mirrors the persisted
 * action_queue via /api/actions, with OPTIMISTIC updates so the UI stays
 * instant. Approving an AI recommendation enqueues optimistically (temp id),
 * POSTs, then swaps the temp id for the server row. Status changes PATCH;
 * removals DELETE. Hydrates from the server on demand and survives reload.
 *
 * No execution — this records decisions only. Session cache resets on reload
 * until hydrateActions() repopulates it from the server.
 */

import { useSyncExternalStore } from "react";
import type { ActionQueueRow } from "@/types/database";

export type ActionStatus = "pending" | "approved" | "dismissed";
export type ActionPriority = "High" | "Medium" | "Low";

/** Sprint 13B: structured executable-target vocabularies (mirror the data layer). */
export type ActionEntityLevel = "account" | "campaign" | "ad";
export type ActionType = "PAUSE_CAMPAIGN" | "RESUME_CAMPAIGN" | "ADJUST_BUDGET";

export interface QueuedAction {
  id: string;
  title: string;
  source: string;
  type?: string;
  rationale?: string;
  expectedImpact?: string;
  priority?: ActionPriority;
  status: ActionStatus;
  // Sprint 13B: structured executable target (present only when guaranteed).
  provider?: string;
  entityLevel?: ActionEntityLevel;
  entityId?: string;
  actionType?: ActionType;
  paramsJson?: Record<string, unknown> | null;
}

/** Payload an AI card passes when the user approves a recommendation. */
export interface ActionInput {
  title: string;
  source?: string;
  type?: string;
  rationale?: string;
  expectedImpact?: string;
  priority?: ActionPriority;
  // Sprint 13B: structured fields — sent ONLY when association is guaranteed.
  provider?: string | null;
  entityLevel?: ActionEntityLevel | null;
  entityId?: string | null;
  actionType?: ActionType | null;
  paramsJson?: Record<string, unknown> | null;
}

// ── Store internals ──────────────────────────────────────────────────────────
const EMPTY: QueuedAction[] = [];
let state: QueuedAction[] = EMPTY;
let seq = 0;
let generation = 0;
const listeners = new Set<() => void>();
/** Temp ids with a POST in flight → lets un-approve cancel the created row. */
const pendingTemps = new Map<string, { cancelled: boolean }>();
/** temp id → server id, so un-approve after a swap deletes the right row. */
const idAlias = new Map<string, string>();

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

/** Stable empty snapshot so SSR + first client render agree (hydrate is async). */
function getServerSnapshot(): QueuedAction[] {
  return EMPTY;
}

function mapRow(row: ActionQueueRow): QueuedAction {
  return {
    id: row.id,
    title: row.title,
    source: row.source ?? "Ask Ultrametrics",
    type: row.type ?? undefined,
    rationale: row.rationale ?? undefined,
    expectedImpact: row.expected_impact ?? undefined,
    priority: row.priority ?? undefined,
    status: row.status,
    // Sprint 13B: structured target (null on legacy/text-only rows).
    provider: row.provider ?? undefined,
    entityLevel: row.entity_level ?? undefined,
    entityId: row.entity_id ?? undefined,
    actionType: row.action_type ?? undefined,
    paramsJson: (row.params_json as Record<string, unknown> | null) ?? null,
  };
}

// ── Hydration / reset (workspace switching, reload persistence) ──────────────

/**
 * Load the queue from the server (RLS-scoped to the active workspace). Bumps a
 * generation so a stale in-flight load (e.g. after a workspace switch) is
 * discarded. Preserves still-in-flight optimistic temp items, deduped by id.
 */
export async function hydrateActions(): Promise<void> {
  const gen = ++generation;
  try {
    const res = await fetch("/api/actions");
    if (!res.ok) return;
    const data = (await res.json()) as { actions?: ActionQueueRow[] };
    if (gen !== generation) return; // superseded by a newer hydrate/reset
    const serverItems = (data.actions ?? []).map(mapRow);
    const serverIds = new Set(serverItems.map((a) => a.id));
    const pendingItems = state.filter(
      (a) => a.id.startsWith("temp-") && pendingTemps.has(a.id) && !serverIds.has(a.id)
    );
    state = [...pendingItems, ...serverItems];
    emit();
  } catch {
    /* best-effort — keep whatever we have */
  }
}

/** Clear the queue (e.g. on workspace switch, before re-hydrating). */
export function resetActions(): void {
  generation++; // discard any in-flight hydrate
  state = EMPTY;
  emit();
}

// ── Mutations (optimistic) ───────────────────────────────────────────────────

/**
 * Optimistically enqueue an approved recommendation and POST it. Returns the
 * TEMP id synchronously (callers track it); the temp id is swapped for the
 * server row on success, and removeAction(tempId) keeps working before/after.
 */
export function enqueueAction(input: ActionInput): string {
  const tempId = `temp-${++seq}`;
  const optimistic: QueuedAction = {
    id: tempId,
    title: input.title,
    source: input.source ?? "Ask Ultrametrics",
    type: input.type,
    rationale: input.rationale,
    expectedImpact: input.expectedImpact,
    priority: input.priority,
    status: "approved",
    // Sprint 13B: carry structured fields when present (POST body sends them too).
    ...(input.provider != null ? { provider: input.provider } : {}),
    ...(input.entityLevel != null ? { entityLevel: input.entityLevel } : {}),
    ...(input.entityId != null ? { entityId: input.entityId } : {}),
    ...(input.actionType != null ? { actionType: input.actionType } : {}),
    ...(input.paramsJson !== undefined ? { paramsJson: input.paramsJson } : {}),
  };
  state = [optimistic, ...state];
  emit();
  pendingTemps.set(tempId, { cancelled: false });

  void fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`POST failed (${res.status})`);
      const data = (await res.json()) as { action?: ActionQueueRow };
      if (!data.action) throw new Error("No action returned");
      const entry = pendingTemps.get(tempId);
      pendingTemps.delete(tempId);
      const mapped = mapRow(data.action);

      if (entry?.cancelled) {
        // Un-approved while in flight → drop it and delete the created row.
        state = state.filter((a) => a.id !== tempId && a.id !== mapped.id);
        emit();
        void fetch(`/api/actions/${mapped.id}`, { method: "DELETE" }).catch(
          () => {}
        );
        return;
      }

      idAlias.set(tempId, mapped.id);
      // Swap temp → server row, dropping any pre-existing dup of the server id.
      state = state.flatMap((a) => {
        if (a.id === tempId) return [mapped];
        if (a.id === mapped.id) return [];
        return [a];
      });
      emit();
    })
    .catch(() => {
      pendingTemps.delete(tempId);
      state = state.filter((a) => a.id !== tempId);
      emit();
    });

  return tempId;
}

/** Remove an action (un-approve). Works for temp ids before/after the swap. */
export function removeAction(id: string): void {
  const resolved = idAlias.get(id) ?? id;
  state = state.filter((a) => a.id !== id && a.id !== resolved);
  emit();

  if (id.startsWith("temp-") && resolved === id) {
    // Still in flight (no server id yet) → cancel the POST's created row.
    const entry = pendingTemps.get(id);
    if (entry) entry.cancelled = true;
    return;
  }

  idAlias.delete(id);
  void fetch(`/api/actions/${resolved}`, { method: "DELETE" }).catch(() => {});
}

/** Update an action's status (Approve / Dismiss on the queue page). */
export function setActionStatus(id: string, status: ActionStatus): void {
  const resolved = idAlias.get(id) ?? id;
  const prev = state.find((a) => a.id === id || a.id === resolved)?.status;
  state = state.map((a) =>
    a.id === id || a.id === resolved ? { ...a, status } : a
  );
  emit();

  if (resolved.startsWith("temp-")) return; // not persisted yet; reconciles on swap

  const revert = () => {
    if (!prev) return;
    state = state.map((a) => (a.id === resolved ? { ...a, status: prev } : a));
    emit();
  };

  void fetch(`/api/actions/${resolved}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
    .then((res) => {
      if (!res.ok) revert();
    })
    .catch(revert);
}

/** Subscribe a component to the shared Action Queue. */
export function useActionQueue(): QueuedAction[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
