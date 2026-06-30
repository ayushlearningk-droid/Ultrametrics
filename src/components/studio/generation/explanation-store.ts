"use client";

/**
 * AI Explainability Layer — open/close store (Sprint 63Y).
 *
 * A tiny module-level store holding which decision explanation is open (by
 * timeline stage). Lives outside React so any surface — Inspector, Approval,
 * Timeline, Activity Bus — can open the same explanation overlay without prop
 * drilling or a new provider. No backend.
 */

import { useSyncExternalStore } from "react";

interface ExplanationState {
  open: boolean;
  stage: string | null;
}

let state: ExplanationState = { open: false, stage: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Open the explanation for a timeline stage (null → the campaign's first decision). */
export function openExplanation(stage: string | null): void {
  state = { open: true, stage };
  emit();
}

export function closeExplanation(): void {
  state = { open: false, stage: state.stage };
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useExplanation(): ExplanationState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
