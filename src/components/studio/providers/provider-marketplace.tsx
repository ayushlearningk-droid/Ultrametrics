"use client";

/**
 * AI Models (Sprint 64AE) — commercial provider surface.
 *
 * A customer-facing view of the models that power generation. Liveness is read
 * from the SINGLE SOURCE OF TRUTH for execution — live-routing's LIVE_PROVIDERS —
 * never from registry metadata. Only live models are selectable; everything else
 * is an honest, non-selectable "Coming soon." No developer language, no fake
 * credits. UI only — no routing, registry, execution, adapter, or backend change.
 */

import { useMemo, useState } from "react";
import { Server, Image as ImageIcon, Video, Gauge, Clock, Check, Search, Info, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { createDefaultAdapterRegistry } from "@/lib/ai/generation/adapter-registry";
import { rankProviders } from "@/lib/ai/generation/orchestrator";
import { liveDescriptor } from "@/lib/ai/generation/live-routing";
import type { AspectRatio, AssetType, GenerationRequest } from "@/lib/ai/generation/types";
import type { PlatformId } from "@/components/studio/media";
import { useComposer } from "@/components/studio/composer/composer-context";
import { setProviderPreference, useProviderPreference } from "@/components/studio/generation/generation-store";
import { HUB_PROVIDERS, HubInspector } from "./provider-hub";

/** Registry is static — build it once for capability metadata only (not liveness). */
const registry = createDefaultAdapterRegistry();

/** Liveness comes ONLY from live-routing (the execution source of truth). */
function isLive(providerId: string): boolean {
  const d = liveDescriptor(providerId);
  return d.enabled && d.live;
}

interface ProviderRow {
  id: string;
  name: string;
  vendor: string;
  assetTypes: AssetType[];
  aspectRatios: AspectRatio[];
  maxDurationSec?: number;
  negativePrompt: boolean;
  seed: boolean;
  imageToVideo: boolean;
  quality: number | null;
  seconds: number;
}

function buildRows(): ProviderRow[] {
  return registry.list().map((adapter) => {
    const m = adapter.metadata;
    const cap = adapter.capabilities();
    const assetType = m.assetTypes[0];
    const request: GenerationRequest = {
      providerId: m.id,
      assetType,
      prompt: "preview",
      aspectRatio: cap.aspectRatios[0],
      batch: 1,
      durationSec: assetType === "video" ? cap.maxDurationSec : undefined,
    };
    const normalized = adapter.normalizeRequest(request);
    const duration = adapter.estimateDuration(normalized);
    const quality = rankProviders(registry, normalized).find((c) => c.providerId === m.id)?.qualityRank ?? null;
    return {
      id: m.id,
      name: m.name,
      vendor: m.vendor,
      assetTypes: m.assetTypes,
      aspectRatios: cap.aspectRatios,
      maxDurationSec: cap.maxDurationSec,
      negativePrompt: cap.supportsNegativePrompt,
      seed: cap.supportsSeed,
      imageToVideo: cap.supportsImageToVideo,
      quality,
      seconds: duration.seconds,
    };
  });
}

const PROVIDER_ROWS = buildRows();
const LIVE_ROWS = PROVIDER_ROWS.filter((r) => isLive(r.id));

/**
 * Curated "coming soon" line-up (UI only — not in the execution registry). These
 * are never selectable and store no preference.
 */
const COMING_SOON: { name: string; vendor: string }[] = [
  { name: "Claude", vendor: "Anthropic" },
  { name: "Gemini", vendor: "Google" },
  { name: "Flux", vendor: "Black Forest Labs" },
  { name: "Ideogram", vendor: "Ideogram" },
  { name: "Recraft", vendor: "Recraft" },
  { name: "Runway", vendor: "Runway" },
  { name: "Veo", vendor: "Google" },
  { name: "Kling", vendor: "Kuaishou" },
  { name: "Pika", vendor: "Pika" },
  { name: "Luma", vendor: "Luma" },
  { name: "Fal", vendor: "fal.ai" },
  { name: "Replicate", vendor: "Replicate" },
];

const ASPECT_BY_PLATFORM: Record<PlatformId, AspectRatio> = {
  reels: "9:16",
  tiktok: "9:16",
  shorts: "9:16",
  meta: "1:1",
  youtube: "16:9",
};

const DEFAULT_PLATFORMS: PlatformId[] = ["reels", "meta", "tiktok"];

/** Recommend only among LIVE models (highest estimated quality). */
const RECOMMENDED_LIVE_ID = [...LIVE_ROWS].sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))[0]?.id ?? null;

/** Estimated end-to-end speed for the request's placements (relative estimate). */
function estimateSpeed(row: ProviderRow, platforms: PlatformId[]): number {
  const adapter = registry.get(row.id);
  if (!adapter) return 0;
  const assetType = row.assetTypes[0];
  let seconds = 0;
  for (const p of platforms) {
    const request: GenerationRequest = {
      providerId: row.id,
      assetType,
      prompt: "preview",
      aspectRatio: ASPECT_BY_PLATFORM[p] ?? "1:1",
      batch: 1,
      durationSec: assetType === "video" ? row.maxDurationSec : undefined,
    };
    seconds += adapter.estimateDuration(adapter.normalizeRequest(request)).seconds;
  }
  return seconds;
}

function Chip({ label, tone = "chip-slate" }: { label: string; tone?: string }) {
  return <span className={cn("chip", tone)}>{label}</span>;
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 type-caption text-foreground-muted">
      <span className="inline-flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-right font-medium text-foreground/90 tabular-nums">{value}</span>
    </div>
  );
}

/** Estimated Usage — replaces the old credit "Cost Simulator". No fake credits. */
function EstimatedUsage({ row, platforms }: { row: ProviderRow; platforms: PlatformId[] }) {
  const seconds = estimateSpeed(row, platforms);
  return (
    <div className="studio-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Gauge className="h-3.5 w-3.5 text-brand" /> Estimated Usage · {row.name}
      </header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <MetaRow icon={<Gauge className="h-3 w-3" />} label="Estimated Quality" value={row.quality != null ? `${row.quality}/10` : "—"} />
        <MetaRow icon={<Clock className="h-3 w-3" />} label="Estimated Speed" value={`~${seconds}s`} />
        <MetaRow icon={<ImageIcon className="h-3 w-3" />} label="Assets" value={`${platforms.length}`} />
      </div>
      <div className="border-t border-white/[0.06] pt-2.5">
        <span className="type-caption text-foreground-muted">Pricing coming soon — usage is included while in preview.</span>
      </div>
    </div>
  );
}

/** A live, selectable model card. Single primary action ("Use"); Details in overflow. */
function LiveProviderCard({
  row,
  aspect,
  selected,
  recommended,
  onSelect,
  onDetails,
}: {
  row: ProviderRow;
  aspect: AspectRatio;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
  onDetails: () => void;
}) {
  return (
    <div className={cn("studio-card relative flex flex-col gap-3 p-4", selected && "studio-glow ring-1 ring-brand/40")}>
      {/* Overflow menu (Details) */}
      <details className="absolute right-3 top-3 z-10 [&_summary::-webkit-details-marker]:hidden">
        <summary className="studio-focusable inline-flex cursor-pointer list-none items-center rounded-full p-1 text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More</span>
        </summary>
        <div className="absolute right-0 z-20 mt-1 flex min-w-[120px] flex-col rounded-[var(--studio-radius-md)] border border-white/[0.08] bg-[hsl(222_44%_7%)] p-1 shadow-lg">
          <button
            type="button"
            onClick={onDetails}
            className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] px-2.5 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <Info className="h-3 w-3" /> Details
          </button>
        </div>
      </details>

      <div className="flex items-center gap-2.5 pr-8">
        <div className="studio-tile flex h-9 w-9 items-center justify-center text-foreground-muted">
          <Server className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{row.name}</p>
          <p className="truncate type-caption text-foreground-muted">{row.vendor}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Chip label="Connected" tone="chip-emerald" />
        {recommended && <Chip label="Recommended" tone="chip-emerald" />}
        {row.assetTypes.includes("image") && <span className="inline-flex items-center gap-1 chip chip-slate"><ImageIcon className="h-3 w-3" /> Image</span>}
        {row.assetTypes.includes("video") && <span className="inline-flex items-center gap-1 chip chip-slate"><Video className="h-3 w-3" /> Video</span>}
        {row.imageToVideo && <Chip label="Image→Video" />}
      </div>

      {/* Estimates + capability (commercial language) */}
      <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
        <MetaRow icon={<Server className="h-3 w-3" />} label="Availability" value="Live" />
        <MetaRow icon={<Gauge className="h-3 w-3" />} label="Estimated Quality" value={row.quality != null ? `${row.quality}/10` : "—"} />
        <MetaRow icon={<Clock className="h-3 w-3" />} label="Estimated Speed" value={`~${row.seconds}s`} />
        <MetaRow icon={<ImageIcon className="h-3 w-3" />} label="Formats" value={row.aspectRatios.join(", ")} />
      </div>

      {/* Single primary action */}
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "studio-focusable mt-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--studio-radius-md)] px-4 py-2 type-caption font-semibold transition-colors",
          selected ? "bg-brand/15 text-brand" : "bg-brand text-[hsl(var(--brand-foreground))] hover:opacity-90"
        )}
      >
        <Check className="h-3.5 w-3.5" /> {selected ? "Using" : "Use"}
      </button>
      <span className="sr-only">Works with {aspect}</span>
    </div>
  );
}

/** A non-selectable "coming soon" model card. Gray badge, disabled. */
function ComingSoonCard({ name, vendor }: { name: string; vendor: string }) {
  return (
    <div className="studio-card flex flex-col gap-3 p-4 opacity-60" aria-disabled="true">
      <div className="flex items-center gap-2.5">
        <div className="studio-tile flex h-9 w-9 items-center justify-center text-foreground-muted">
          <Server className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{name}</p>
          <p className="truncate type-caption text-foreground-muted">{vendor}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip label="Coming soon" />
      </div>
      <button
        type="button"
        disabled
        className="mt-1 inline-flex cursor-not-allowed items-center justify-center rounded-[var(--studio-radius-md)] border border-white/[0.08] px-4 py-2 type-caption font-semibold text-foreground-muted"
      >
        Coming soon
      </button>
    </div>
  );
}

export function ProviderMarketplace() {
  const preference = useProviderPreference();
  const { brief } = useComposer();
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState<string | null>(null);
  const detailsProvider = details ? HUB_PROVIDERS.find((p) => p.id === details) : undefined;

  const aspect: AspectRatio = brief.platform ? ASPECT_BY_PLATFORM[brief.platform] : "1:1";
  const platforms = brief.platform ? [brief.platform] : DEFAULT_PLATFORMS;

  // The effective model for the usage estimate: the selection, else the recommended live model.
  const effectiveId = (preference && isLive(preference) ? preference : RECOMMENDED_LIVE_ID) ?? null;
  const effectiveRow = effectiveId ? LIVE_ROWS.find((r) => r.id === effectiveId) : undefined;

  const q = query.trim().toLowerCase();
  const liveRows = useMemo(
    () => LIVE_ROWS.filter((r) => !q || r.name.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q)),
    [q]
  );
  const comingSoon = useMemo(
    () => COMING_SOON.filter((c) => !q || c.name.toLowerCase().includes(q) || c.vendor.toLowerCase().includes(q)),
    [q]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Server className="h-3.5 w-3.5 text-brand" /> AI Models
        </span>
        <div className="flex flex-col items-end">
          <button
            type="button"
            aria-pressed={preference === null}
            onClick={() => setProviderPreference(null)}
            className={cn(
              "studio-focusable rounded-full px-3 py-1.5 type-caption font-semibold transition-colors",
              preference === null ? "bg-brand/15 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
            )}
          >
            Auto (Recommended)
          </button>
          <span className="mt-0.5 type-caption text-foreground-muted">We automatically choose the best available model.</span>
        </div>
      </div>

      {/* Estimated usage for the effective model */}
      {effectiveRow && <EstimatedUsage row={effectiveRow} platforms={platforms} />}

      {/* Search */}
      <div className="studio-glass flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models…"
          aria-label="Search models"
          className="w-full bg-transparent type-caption text-foreground outline-none placeholder:text-foreground-muted"
        />
      </div>

      {/* LIVE */}
      {liveRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <span className="h-2 w-2 rounded-full bg-brand" /> Live
          </span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {liveRows.map((row) => (
              <LiveProviderCard
                key={row.id}
                row={row}
                aspect={aspect}
                selected={preference === row.id}
                recommended={row.id === RECOMMENDED_LIVE_ID}
                onSelect={() => setProviderPreference(preference === row.id ? null : row.id)}
                onDetails={() => setDetails(row.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* COMING SOON */}
      {comingSoon.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="type-eyebrow text-foreground-muted">Coming soon</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {comingSoon.map((c) => (
              <ComingSoonCard key={c.name} name={c.name} vendor={c.vendor} />
            ))}
          </div>
        </section>
      )}

      {liveRows.length === 0 && comingSoon.length === 0 && (
        <div className="studio-card px-6 py-10 text-center">
          <p className="type-caption text-foreground-muted">No models match your search.</p>
        </div>
      )}

      {/* Read-only model details */}
      {detailsProvider && <HubInspector provider={detailsProvider} onClose={() => setDetails(null)} />}
    </div>
  );
}
