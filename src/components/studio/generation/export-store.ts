"use client";

/**
 * Export Center — open/close store (Sprint 63.7).
 *
 * A tiny module-level store for the Export Drawer's open state, so the Export
 * button (in the Inspector) and the drawer (mounted once in the workspace) share
 * one source without a new provider. No backend.
 */

import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function openExport(): void {
  open = true;
  emit();
}

export function closeExport(): void {
  open = false;
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useExportOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
