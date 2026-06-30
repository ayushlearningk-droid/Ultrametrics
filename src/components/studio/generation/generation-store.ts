"use client";

/**
 * Campaign Generation Runtime — store (Sprint 63O).
 *
 * A tiny module-level pub/sub holding the latest generated campaign. It lives
 * outside React so the result survives the entry → workspace remount (the
 * Command Center generates, the Unified Workspace consumes). No backend.
 */

import { useSyncExternalStore } from "react";
import { registerCreatives } from "@/components/studio/creative/creative-data";
import type { GenerationResult } from "./generation-runtime";

let current: GenerationResult | null = null;
/** Shared selected asset id (Sprint 63Z) — one selection across every region. */
let selectedAssetId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Replace the active generated campaign and register its creatives for lookup. */
export function setGeneration(result: GenerationResult): void {
  current = result;
  registerCreatives(result.creatives);
  // Default the shared selection to the newest generated asset.
  selectedAssetId = result.creatives.length ? result.creatives[result.creatives.length - 1].id : null;
  emit();
}

export function clearGeneration(): void {
  current = null;
  selectedAssetId = null;
  emit();
}

/** Focus one generated asset across all regions (Timeline · Activity · Queue · Approval · Inspector). */
export function selectAsset(id: string | null): void {
  if (id === selectedAssetId) return;
  selectedAssetId = id;
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): GenerationResult | null {
  return current;
}

/** Subscribe a component to the active generated campaign (null until generated). */
export function useGeneration(): GenerationResult | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** Subscribe a component to the shared selected asset id. */
export function useSelectedAsset(): string | null {
  return useSyncExternalStore(subscribe, () => selectedAssetId, () => null);
}
