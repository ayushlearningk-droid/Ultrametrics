"use client";

/**
 * Campaign Generation Runtime — store (Sprint 63O).
 *
 * A tiny module-level pub/sub holding the latest generated campaign. It lives
 * outside React so the result survives the entry → workspace remount (the
 * Command Center generates, the Unified Workspace consumes). No backend.
 */

import { useSyncExternalStore } from "react";
import { registerCreatives, type CreativeStatusId } from "@/components/studio/creative/creative-data";
import type { GenerationResult, ActivityEvent, LiveTimelineEvent } from "./generation-runtime";
import {
  initialAssetExecution,
  deriveGenerationExecution,
  type AssetExecution,
  type GenerationExecution,
} from "./execution";

let current: GenerationResult | null = null;
/** Shared selected asset id (Sprint 63Z) — one selection across every region. */
let selectedAssetId: string | null = null;
/** Real uploaded reference assets (Sprint 65.0) — input, not output. */
let referenceAssets: ReferenceAsset[] = [];
let refSeq = 0;
/** Preferred provider id (Sprint 64C) — null = auto-routed. */
let providerPreference: string | null = null;
const EMPTY_REFS: ReferenceAsset[] = [];
const listeners = new Set<() => void>();

/** A real uploaded reference asset — actual file bytes as a data URL. */
export interface ReferenceAsset {
  id: string;
  name: string;
  kind: "image" | "video";
  /** data:... URL produced from the real file (no mock, no upload, no network). */
  dataUrl: string;
}

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

/** Read the active generation non-reactively (for actions outside React). */
export function getCurrentGeneration(): GenerationResult | null {
  return current;
}

let eventSeq = 0;
/**
 * Record a real approval decision as live Activity + Timeline events (Sprint 64Y)
 * with a real timestamp, linked to the asset. Keeps the Activity and Timeline
 * feeds truthful — approvals now appear there as they happen.
 */
export function recordApprovalEvent(assetId: string, title: string, description: string): void {
  if (!current) return;
  const at = Date.now();
  const key = `apv-${eventSeq++}`;
  const activity: ActivityEvent = {
    id: `ac-${key}`,
    authorId: "brand-guardian",
    at,
    category: "Approval",
    title,
    description,
    assetId,
    stage: "Approval Requested",
  };
  const timeline: LiveTimelineEvent = {
    id: `lt-${key}`,
    at,
    ownerId: "brand-guardian",
    stage: title,
    status: "complete",
    durationSec: 0,
    assetId,
  };
  current = { ...current, activity: [...current.activity, activity], timeline: [...current.timeline, timeline] };
  emit();
}

/** Focus one generated asset across all regions (Timeline · Activity · Queue · Approval · Inspector). */
export function selectAsset(id: string | null): void {
  if (id === selectedAssetId) return;
  selectedAssetId = id;
  emit();
}

/* ── Execution state (Sprint 64.1 — P0.2) ─────────────────────────────────────
 * The store is the single source of truth for async execution. These mutators
 * patch one asset's execution and re-derive the generation summary immutably,
 * keeping the creative registry in sync so every region resolves the same state.
 * No executor, no providers, no timers — a future executor calls these.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Asset synchronization (Sprint 65.1) — mirror a completed execution's real,
 * persisted media URL onto the creative's renderable MediaSource. Every studio
 * surface (Movie · Canvas · Creatives · Inspector · Queue · Approval) renders
 * `media.src`; without this the generated asset is stored on `execution.mediaUrl`
 * but never displayed. Provider-agnostic: any provider that sets `mediaUrl` shows
 * everywhere. No-op until the asset completes with a real URL.
 */
function syncMedia(creative: GenerationResult["creatives"][number]): GenerationResult["creatives"][number] {
  const exec = creative.execution;
  if (!exec || exec.status !== "completed" || !exec.mediaUrl) return creative;
  if (creative.media.src === exec.mediaUrl) return creative;
  const poster = creative.media.kind === "video" ? exec.thumbnailUrl ?? creative.media.poster : creative.media.poster;
  return { ...creative, media: { ...creative.media, src: exec.mediaUrl, poster } };
}

/** Patch one asset's execution state and re-derive the generation summary. */
export function setAssetExecution(assetId: string, patch: Partial<AssetExecution>): void {
  if (!current) return;
  let updated: GenerationResult["creatives"][number] | undefined;
  const creatives = current.creatives.map((c) => {
    if (c.id !== assetId) return c;
    updated = syncMedia({ ...c, execution: { ...(c.execution ?? initialAssetExecution()), ...patch } });
    return updated;
  });
  if (!updated) return;
  const execution = deriveGenerationExecution(creatives, current.execution.currentJobId);
  current = { ...current, creatives, execution };
  registerCreatives([updated]);
  emit();
}

/**
 * Approve / reject a generated creative (Sprint 64X — Creative Gallery). Patches
 * the creative's review status in the single source of truth and keeps the
 * registry in sync. Presentation-state transition only — no publishing.
 */
export function setCreativeStatus(assetId: string, status: CreativeStatusId): void {
  if (!current) return;
  let updated: GenerationResult["creatives"][number] | undefined;
  const creatives = current.creatives.map((c) => {
    if (c.id !== assetId) return c;
    updated = { ...c, status };
    return updated;
  });
  if (!updated) return;
  current = { ...current, creatives };
  registerCreatives([updated]);
  emit();
}

/** Set (or clear) the asset currently executing, and re-derive the summary. */
export function setCurrentJob(assetId: string | null): void {
  if (!current) return;
  current = { ...current, execution: deriveGenerationExecution(current.creatives, assetId) };
  emit();
}

/** Reset all execution back to the honest queued state (e.g. before a re-run). */
export function resetExecution(): void {
  if (!current) return;
  // Clear the mirrored generated media too (Sprint 65.1) so a re-run shows an
  // honest empty frame while queued, not the previous run's asset.
  const creatives = current.creatives.map((c) => ({
    ...c,
    media: c.media.src ? { ...c.media, src: undefined, poster: undefined } : c.media,
    execution: initialAssetExecution(),
  }));
  current = { ...current, creatives, execution: deriveGenerationExecution(creatives, null) };
  registerCreatives(creatives);
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

/* ── Reference assets (Sprint 65.0) — real uploaded input, in this store only ── */

/** Add a real uploaded reference asset (deterministic id). */
export function addReferenceAsset(asset: Omit<ReferenceAsset, "id">): void {
  referenceAssets = [...referenceAssets, { ...asset, id: `ref-${refSeq++}` }];
  emit();
}

export function removeReferenceAsset(id: string): void {
  const next = referenceAssets.filter((r) => r.id !== id);
  if (next.length === referenceAssets.length) return;
  referenceAssets = next;
  emit();
}

export function clearReferenceAssets(): void {
  if (referenceAssets.length === 0) return;
  referenceAssets = [];
  emit();
}

/** Read the current reference assets (non-reactive). */
export function getReferenceAssets(): ReferenceAsset[] {
  return referenceAssets;
}

/** Subscribe a component to the uploaded reference assets. */
export function useReferenceAssets(): ReferenceAsset[] {
  return useSyncExternalStore(subscribe, () => referenceAssets, () => EMPTY_REFS);
}

/* ── Provider preference (Sprint 64C) — UI selection only, in this store ────── */

/** Set (or clear with null) the preferred provider id. No execution, no calls. */
export function setProviderPreference(id: string | null): void {
  if (id === providerPreference) return;
  providerPreference = id;
  emit();
}

export function getProviderPreference(): string | null {
  return providerPreference;
}

/** Subscribe a component to the selected provider preference. */
export function useProviderPreference(): string | null {
  return useSyncExternalStore(subscribe, () => providerPreference, () => null);
}

/** Read the generation-level execution summary (null until generated). Sprint 64.1. */
export function getGenerationExecution(): GenerationExecution | null {
  return current?.execution ?? null;
}

/** Read one asset's execution state from the store (null when absent). Sprint 64.1. */
export function getAssetExecution(assetId: string): AssetExecution | null {
  return current?.creatives.find((c) => c.id === assetId)?.execution ?? null;
}
