"use client";

/**
 * Provider Hub — read-only inspector (Sprint 64I · consolidated 64K).
 *
 * The single provider catalog is the Provider Marketplace (the action surface).
 * The Hub is now only the read-only inspector opened from a marketplace card —
 * there is no second provider grid. The registry is the single source; this file
 * exposes the static registry projection and the inspector overlay. No store, no
 * selection, no runtime, no APIs, no connections.
 */

import { Server, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createDefaultAdapterRegistry } from "@/lib/ai/generation/adapter-registry";
import type { AspectRatio, AssetType, ProviderStatus } from "@/lib/ai/generation/types";
import { useDialog } from "@/components/studio/generation/use-dialog";

export interface HubProvider {
  id: string;
  name: string;
  vendor: string;
  description: string;
  status: ProviderStatus;
  executionMode: string;
  assetTypes: AssetType[];
  aspectRatios: AspectRatio[];
  maxBatch: number;
  maxDurationSec?: number;
  negativePrompt: boolean;
  seed: boolean;
  imageToVideo: boolean;
}

/** Registry is static — read the metadata once. */
export const HUB_PROVIDERS: HubProvider[] = createDefaultAdapterRegistry()
  .list()
  .map((adapter) => {
    const m = adapter.metadata;
    const cap = adapter.capabilities();
    return {
      id: m.id,
      name: m.name,
      vendor: m.vendor,
      description: m.description,
      status: m.status,
      executionMode: m.executionMode,
      assetTypes: m.assetTypes,
      aspectRatios: cap.aspectRatios,
      maxBatch: cap.maxBatch,
      maxDurationSec: cap.maxDurationSec,
      negativePrompt: cap.supportsNegativePrompt,
      seed: cap.supportsSeed,
      imageToVideo: cap.supportsImageToVideo,
    };
  });

/** Planned/Connected derived only from executionMode. */
export function connectedLabel(executionMode: string): string {
  return executionMode === "live" ? "Connected" : "Planned";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 type-caption text-foreground-muted">{label}</span>
      <span className="min-w-0 text-right type-caption font-medium text-foreground/90">{value}</span>
    </div>
  );
}

/** Read-only provider inspector — mounted only while open. */
export function HubInspector({ provider, onClose }: { provider: HubProvider; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`Provider: ${provider.name}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="studio-card relative flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto p-5 outline-none">
        <header className="flex items-start gap-3">
          <div className="studio-tile flex h-10 w-10 shrink-0 items-center justify-center text-brand">
            <Server className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">Provider · read-only</span>
            <h2 className="type-body font-bold text-foreground">{provider.name}</h2>
            <p className="type-caption text-foreground-muted">{provider.vendor}</p>
          </div>
          <span className={cn("chip", provider.executionMode === "live" ? "chip-emerald" : "chip-slate")}>{connectedLabel(provider.executionMode)}</span>
          <button type="button" onClick={onClose} className="studio-focusable text-foreground-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <p className="type-caption text-foreground">{provider.description}</p>

        <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
          <Field label="Status" value={provider.status} />
          <Field label="State" value={`${connectedLabel(provider.executionMode)} · ${provider.executionMode}`} />
          <Field label="Asset types" value={provider.assetTypes.join(", ")} />
          <Field label="Aspect ratios" value={provider.aspectRatios.join(", ")} />
          <Field label="Max batch" value={provider.maxBatch} />
          <Field label="Max duration" value={provider.maxDurationSec != null ? `${provider.maxDurationSec}s` : "—"} />
          <Field label="Negative prompt" value={provider.negativePrompt ? "Yes" : "No"} />
          <Field label="Seed" value={provider.seed ? "Yes" : "No"} />
          <Field label="Image→Video" value={provider.imageToVideo ? "Yes" : "No"} />
        </div>
      </div>
    </div>
  );
}
