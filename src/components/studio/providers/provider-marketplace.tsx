"use client";

/**
 * Provider Health Center (Sprint 64E).
 *
 * A production view over the existing provider registry. Every value shown is
 * derived ONLY from existing registry/adapter/orchestrator metadata — status,
 * asset types, relative quality, relative cost, estimated speed, max duration,
 * aspect-ratio support, capability flags, and badges. Compatibility with the
 * current Generation Input reuses the existing adapter.validate() logic (not
 * duplicated). Search + category filters are pure UI. Selecting a provider writes
 * a preference to the existing Generation Store. No backend, no APIs, no
 * execution, no fabricated metrics.
 */

import { useMemo, useState } from "react";
import { Server, Image as ImageIcon, Video, Gauge, Coins, Clock, Check, Search, Lightbulb, Sigma, Columns, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { createDefaultAdapterRegistry } from "@/lib/ai/generation/adapter-registry";
import { rankProviders } from "@/lib/ai/generation/orchestrator";
import type { AspectRatio, AssetType, GenerationRequest, ProviderStatus } from "@/lib/ai/generation/types";
import type { PlatformId } from "@/components/studio/media";
import { useComposer } from "@/components/studio/composer/composer-context";
import { setProviderPreference, useProviderPreference } from "@/components/studio/generation/generation-store";
import { HUB_PROVIDERS, HubInspector } from "./provider-hub";

/** Registry is static — build it once and reuse for metadata + compatibility. */
const registry = createDefaultAdapterRegistry();

interface ProviderRow {
  id: string;
  name: string;
  vendor: string;
  assetTypes: AssetType[];
  status: ProviderStatus;
  executionMode: string;
  aspectRatios: AspectRatio[];
  maxBatch: number;
  maxDurationSec?: number;
  negativePrompt: boolean;
  seed: boolean;
  imageToVideo: boolean;
  quality: number | null;
  credits: number;
  seconds: number;
  recommended: boolean;
}

function buildRows(): ProviderRow[] {
  const rows: ProviderRow[] = registry.list().map((adapter) => {
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
    const cost = adapter.estimateCost(normalized);
    const duration = adapter.estimateDuration(normalized);
    const quality = rankProviders(registry, normalized).find((c) => c.providerId === m.id)?.qualityRank ?? null;
    return {
      id: m.id,
      name: m.name,
      vendor: m.vendor,
      assetTypes: m.assetTypes,
      status: m.status,
      executionMode: m.executionMode,
      aspectRatios: cap.aspectRatios,
      maxBatch: cap.maxBatch,
      maxDurationSec: cap.maxDurationSec,
      negativePrompt: cap.supportsNegativePrompt,
      seed: cap.supportsSeed,
      imageToVideo: cap.supportsImageToVideo,
      quality,
      credits: cost.credits,
      seconds: duration.seconds,
      recommended: false,
    };
  });

  // "Recommended" = top relative quality within its asset-type group (orchestrator policy).
  const maxImg = Math.max(0, ...rows.filter((r) => r.assetTypes.includes("image")).map((r) => r.quality ?? 0));
  const maxVid = Math.max(0, ...rows.filter((r) => r.assetTypes.includes("video")).map((r) => r.quality ?? 0));
  for (const r of rows) {
    r.recommended =
      (r.assetTypes.includes("image") && r.quality === maxImg) ||
      (r.assetTypes.includes("video") && r.quality === maxVid);
  }
  return rows;
}

const PROVIDER_ROWS = buildRows();

type Category = "All" | "Image" | "Video" | "Multi-modal";
const CATEGORIES: Category[] = ["All", "Image", "Video", "Multi-modal"];

const ASPECT_BY_PLATFORM: Record<PlatformId, AspectRatio> = {
  reels: "9:16",
  tiktok: "9:16",
  shorts: "9:16",
  meta: "1:1",
  youtube: "16:9",
};

type Compatibility = "Compatible" | "Partially Compatible" | "Unavailable";
const COMPAT_CHIP: Record<Compatibility, string> = {
  Compatible: "chip-emerald",
  "Partially Compatible": "chip-slate",
  Unavailable: "chip-red",
};

/** Reuse the existing adapter validation to classify compatibility. No duplication. */
function compatibilityFor(row: ProviderRow, aspectRatio: AspectRatio): Compatibility {
  const adapter = registry.get(row.id);
  if (!adapter) return "Unavailable";
  const request: GenerationRequest = {
    providerId: row.id,
    assetType: row.assetTypes[0],
    prompt: "preview",
    aspectRatio,
    batch: 1,
    durationSec: row.assetTypes[0] === "video" ? row.maxDurationSec : undefined,
  };
  const v = adapter.validate(request);
  if (v.ok) return "Compatible";
  const onlyAspect = v.errors.length > 0 && v.errors.every((e) => e.toLowerCase().includes("aspect ratio"));
  return onlyAspect ? "Partially Compatible" : "Unavailable";
}

/** Target placements for the whole request (matches build-input's default). */
const DEFAULT_PLATFORMS: PlatformId[] = ["reels", "meta", "tiktok"];

interface Totals {
  credits: number;
  seconds: number;
  assets: number;
}

/** Sum estimateCost()/estimateDuration() over the request's target assets. Deterministic. */
function estimateTotals(row: ProviderRow, platforms: PlatformId[]): Totals {
  const adapter = registry.get(row.id);
  if (!adapter) return { credits: 0, seconds: 0, assets: 0 };
  const assetType = row.assetTypes[0];
  let credits = 0;
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
    const normalized = adapter.normalizeRequest(request);
    credits += adapter.estimateCost(normalized).credits;
    seconds += adapter.estimateDuration(normalized).seconds;
  }
  return { credits, seconds, assets: platforms.length };
}

function Chip({ label, tone = "chip-slate" }: { label: string; tone?: string }) {
  return <span className={cn("chip", tone)}>{label}</span>;
}

/** Deterministic Cost Simulator for the selected provider (Sprint 64F). */
function CostSimulator({ row, platforms }: { row: ProviderRow; platforms: PlatformId[] }) {
  const assetType = row.assetTypes[0];
  const recommended = PROVIDER_ROWS.find((r) => r.recommended && r.assetTypes.includes(assetType));
  const totals = estimateTotals(row, platforms);

  const isRec = recommended?.id === row.id;
  const cheaper = !!recommended && row.credits < recommended.credits;
  const faster = !!recommended && row.seconds < recommended.seconds;
  const higher = !!recommended && (row.quality ?? 0) > (recommended.quality ?? 0);
  const equivalent = !!recommended && !cheaper && !faster && !higher && !isRec;

  const why: string[] = [];
  if (isRec) why.push(`Recommended: highest relative quality for ${assetType}.`);
  if (recommended && higher) why.push(`Higher relative quality (${row.quality} vs ${recommended.quality}).`);
  if (recommended && cheaper) why.push(`Cheaper estimate (${row.credits} vs ${recommended.credits} cr).`);
  if (recommended && faster) why.push(`Faster estimate (~${row.seconds}s vs ~${recommended.seconds}s).`);
  if (recommended && (row.maxDurationSec ?? 0) > (recommended.maxDurationSec ?? 0)) why.push(`Supports longer videos (${row.maxDurationSec}s).`);
  why.push("Preferred provider selected.");

  return (
    <div className="studio-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Sigma className="h-3.5 w-3.5 text-brand" />
        Cost Simulator · {row.name}
      </header>

      {/* Per-asset estimates */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetaRow icon={<Coins className="h-3 w-3" />} label="Credits" value={`${row.credits}`} />
        <MetaRow icon={<Clock className="h-3 w-3" />} label="Duration" value={`~${row.seconds}s`} />
        <MetaRow icon={<Gauge className="h-3 w-3" />} label="Quality" value={row.quality != null ? `${row.quality}/10` : "—"} />
        <MetaRow icon={<Coins className="h-3 w-3" />} label="Rel. cost" value={`${row.credits} cr`} />
      </div>

      {/* Comparison vs recommended */}
      {recommended && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
          <span className="type-caption text-foreground-muted">vs {recommended.name}:</span>
          {isRec && <Chip label="Recommended" tone="chip-emerald" />}
          {cheaper && <Chip label="Cheaper" tone="chip-emerald" />}
          {faster && <Chip label="Faster" tone="chip-emerald" />}
          {higher && <Chip label="Higher Quality" tone="chip-emerald" />}
          {equivalent && <Chip label="Equivalent" />}
        </div>
      )}

      {/* Why this provider? (Explainability) */}
      <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
        <span className="flex items-center gap-1.5 type-caption text-foreground-muted">
          <Lightbulb className="h-3 w-3 text-brand" /> Why this provider?
        </span>
        <ul className="flex flex-col gap-1">
          {why.map((w) => (
            <li key={w} className="flex items-start gap-1.5 type-caption text-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand" /> {w}
            </li>
          ))}
        </ul>
      </div>

      {/* Whole-request totals */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-2.5 type-caption text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-brand" /> Total ~{totals.credits} cr
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-brand" /> Total ~{totals.seconds}s
        </span>
        <span className="type-caption text-foreground-muted">across {totals.assets} asset{totals.assets === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 type-caption text-foreground-muted">
      <span className="inline-flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-right font-medium text-foreground/90 tabular-nums">{value}</span>
    </div>
  );
}

function ProviderCard({
  row,
  compatibility,
  selected,
  onSelect,
  inCompare,
  onToggleCompare,
  compareFull,
  onDetails,
}: {
  row: ProviderRow;
  compatibility: Compatibility;
  selected: boolean;
  onSelect: () => void;
  inCompare: boolean;
  onToggleCompare: () => void;
  compareFull: boolean;
  onDetails: () => void;
}) {
  return (
    <div className={cn("studio-card studio-card-interactive relative flex flex-col p-4", selected && "studio-glow ring-1 ring-brand/40")}>
      {/* Toolbar (siblings of the select button — never nested) */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={onDetails}
          title="Provider details (read-only)"
          className="studio-focusable inline-flex items-center gap-1 rounded-full px-2 py-1 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <Info className="h-3 w-3" /> Details
        </button>
        <button
          type="button"
          onClick={onToggleCompare}
          aria-pressed={inCompare}
          disabled={compareFull && !inCompare}
          title={compareFull && !inCompare ? "Comparison is full (3)" : "Add to comparison"}
          className={cn(
            "studio-focusable inline-flex items-center gap-1 rounded-full px-2 py-1 type-caption transition-colors",
            inCompare ? "bg-brand/15 font-semibold text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground",
            compareFull && !inCompare && "cursor-not-allowed opacity-40"
          )}
        >
          <Columns className="h-3 w-3" /> {inCompare ? "Comparing" : "Compare"}
        </button>
      </div>

      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="studio-focusable flex flex-col gap-3 pt-7 text-left"
      >
      <div className="flex items-center gap-2.5">
        <div className="studio-tile flex h-9 w-9 items-center justify-center text-foreground-muted">
          <Server className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{row.name}</p>
          <p className="truncate type-caption text-foreground-muted">{row.vendor}</p>
        </div>
        {selected && <Check className="h-4 w-4 text-brand" />}
      </div>

      {/* Badges — from existing metadata */}
      <div className="flex flex-wrap gap-1.5">
        {row.recommended && <Chip label="Recommended" tone="chip-emerald" />}
        {row.executionMode === "live" && <Chip label="Connected" tone="chip-emerald" />}
        {row.status === "planned" && <Chip label="Planned" />}
        {row.executionMode === "disabled" && <Chip label="Disabled" />}
        <span className={cn("chip", COMPAT_CHIP[compatibility])}>{compatibility}</span>
      </div>

      {/* Capability chips — from existing metadata only */}
      <div className="flex flex-wrap gap-1.5">
        {row.assetTypes.includes("image") && <span className="inline-flex items-center gap-1 chip chip-slate"><ImageIcon className="h-3 w-3" /> Image</span>}
        {row.assetTypes.includes("video") && <span className="inline-flex items-center gap-1 chip chip-slate"><Video className="h-3 w-3" /> Video</span>}
        {row.imageToVideo && <Chip label="Image→Video" />}
        {row.negativePrompt && <Chip label="Neg. prompt" />}
        {row.seed && <Chip label="Seed" />}
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
        <MetaRow icon={<Server className="h-3 w-3" />} label="Status" value={`${row.status} · ${row.executionMode}`} />
        <MetaRow icon={<Gauge className="h-3 w-3" />} label="Quality" value={row.quality != null ? `${row.quality}/10` : "—"} />
        <MetaRow icon={<Coins className="h-3 w-3" />} label="Cost" value={`${row.credits} cr (rel.)`} />
        <MetaRow icon={<Clock className="h-3 w-3" />} label="Speed" value={`~${row.seconds}s (rel.)`} />
        <MetaRow icon={<Video className="h-3 w-3" />} label="Max duration" value={row.maxDurationSec != null ? `${row.maxDurationSec}s` : "—"} />
        <MetaRow icon={<ImageIcon className="h-3 w-3" />} label="Aspect ratios" value={row.aspectRatios.join(", ")} />
      </div>
      </button>
    </div>
  );
}

/** Capability chips for one provider, reused in the comparison table. */
function CapabilityChips({ row }: { row: ProviderRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      {row.assetTypes.includes("image") && <Chip label="Image" />}
      {row.assetTypes.includes("video") && <Chip label="Video" />}
      {row.imageToVideo && <Chip label="Img→Video" />}
      {row.negativePrompt && <Chip label="Neg." />}
      {row.seed && <Chip label="Seed" />}
    </div>
  );
}

/** Deterministic side-by-side comparison (Sprint 64G). Up to 3 providers. */
function ComparisonTable({ providers, aspect, onRemove }: { providers: ProviderRow[]; aspect: AspectRatio; onRemove: (id: string) => void }) {
  const maxQuality = Math.max(...providers.map((p) => p.quality ?? 0));
  const minCost = Math.min(...providers.map((p) => p.credits));
  const minSpeed = Math.min(...providers.map((p) => p.seconds));

  const best = "font-semibold text-brand";

  return (
    <div className="studio-card flex flex-col gap-3 overflow-x-auto p-4">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Columns className="h-3.5 w-3.5 text-brand" />
        Comparison · {providers.length}/3
      </header>
      <table className="w-full min-w-[520px] border-collapse type-caption">
        <thead>
          <tr>
            <th className="w-32 px-2 py-2 text-left type-caption text-foreground-muted">Attribute</th>
            {providers.map((p) => (
              <th key={p.id} className="px-3 py-2 text-left align-top">
                <div className="flex items-center gap-1.5">
                  <span className="type-caption font-semibold text-foreground">{p.name}</span>
                  <button type="button" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`} className="studio-focusable text-foreground-muted hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {p.recommended && <span className="chip chip-emerald mt-1 inline-block">Recommended</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-foreground">
          <Tr label="Status">{providers.map((p) => <Td key={p.id}>{p.status} · {p.executionMode}</Td>)}</Tr>
          <Tr label="Asset Types">{providers.map((p) => <Td key={p.id}>{p.assetTypes.join(", ")}</Td>)}</Tr>
          <Tr label="Quality">{providers.map((p) => <Td key={p.id} className={cn((p.quality ?? 0) === maxQuality && best)}>{p.quality != null ? `${p.quality}/10` : "—"}</Td>)}</Tr>
          <Tr label="Cost">{providers.map((p) => <Td key={p.id} className={cn(p.credits === minCost && best)}>{p.credits} cr</Td>)}</Tr>
          <Tr label="Speed">{providers.map((p) => <Td key={p.id} className={cn(p.seconds === minSpeed && best)}>~{p.seconds}s</Td>)}</Tr>
          <Tr label="Max Duration">{providers.map((p) => <Td key={p.id}>{p.maxDurationSec != null ? `${p.maxDurationSec}s` : "—"}</Td>)}</Tr>
          <Tr label="Aspect Ratios">{providers.map((p) => <Td key={p.id}>{p.aspectRatios.join(", ")}</Td>)}</Tr>
          <Tr label="Compatibility">{providers.map((p) => <Td key={p.id}><span className={cn("chip", COMPAT_CHIP[compatibilityFor(p, aspect)])}>{compatibilityFor(p, aspect)}</span></Td>)}</Tr>
          <Tr label="Capabilities">{providers.map((p) => <Td key={p.id}><CapabilityChips row={p} /></Td>)}</Tr>
        </tbody>
      </table>
    </div>
  );
}

function Tr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-white/[0.06]">
      <th scope="row" className="px-2 py-2 text-left align-top type-caption font-medium text-foreground-muted">{label}</th>
      {children}
    </tr>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-top type-caption text-foreground/90 tabular-nums", className)}>{children}</td>;
}

export function ProviderMarketplace() {
  const preference = useProviderPreference();
  const { brief } = useComposer();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [compare, setCompare] = useState<string[]>([]);
  const [details, setDetails] = useState<string | null>(null);
  const detailsProvider = details ? HUB_PROVIDERS.find((p) => p.id === details) : undefined;

  const aspect: AspectRatio = brief.platform ? ASPECT_BY_PLATFORM[brief.platform] : "1:1";
  const platforms = brief.platform ? [brief.platform] : DEFAULT_PLATFORMS;
  const selectedRow = preference ? PROVIDER_ROWS.find((r) => r.id === preference) : undefined;

  const toggleCompare = (id: string) =>
    setCompare((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));
  const compareRows = compare
    .map((id) => PROVIDER_ROWS.find((r) => r.id === id))
    .filter((r): r is ProviderRow => Boolean(r));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROVIDER_ROWS.filter((r) => {
      const inQuery = !q || r.name.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q) || r.id.includes(q);
      const inCategory =
        category === "All" ||
        (category === "Image" && r.assetTypes.includes("image")) ||
        (category === "Video" && r.assetTypes.includes("video")) ||
        (category === "Multi-modal" && r.assetTypes.length > 1);
      return inQuery && inCategory;
    });
  }, [query, category]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Server className="h-3.5 w-3.5 text-brand" />
          Provider Health · {PROVIDER_ROWS.length} in registry · compatibility for {aspect}
        </span>
        <button
          type="button"
          aria-pressed={preference === null}
          onClick={() => setProviderPreference(null)}
          className={cn(
            "studio-focusable rounded-full px-3 py-1.5 type-caption font-semibold transition-colors",
            preference === null ? "bg-brand/15 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          )}
        >
          Auto-route
        </button>
      </div>

      {/* Cost Simulator — shown when a provider is selected */}
      {selectedRow && <CostSimulator row={selectedRow} platforms={platforms} />}

      {/* Comparison Center — up to 3 providers side-by-side */}
      {compareRows.length >= 2 ? (
        <ComparisonTable providers={compareRows} aspect={aspect} onRemove={toggleCompare} />
      ) : compareRows.length === 1 ? (
        <div className="studio-card px-4 py-3 type-caption text-foreground-muted">
          Add another provider to compare (up to 3).
        </div>
      ) : null}

      {/* Search + category filters */}
      <div className="flex flex-col gap-3">
        <div className="studio-glass flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search providers — name or vendor…"
            aria-label="Search providers"
            className="w-full bg-transparent type-caption text-foreground outline-none placeholder:text-foreground-muted"
          />
        </div>
        <div className="studio-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "studio-focusable shrink-0 rounded-full px-3 py-1.5 type-caption transition-colors",
                category === c ? "bg-brand/15 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="studio-card px-6 py-10 text-center">
          <p className="type-caption text-foreground-muted">No providers match your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <ProviderCard
              key={row.id}
              row={row}
              compatibility={compatibilityFor(row, aspect)}
              selected={preference === row.id}
              onSelect={() => setProviderPreference(preference === row.id ? null : row.id)}
              inCompare={compare.includes(row.id)}
              onToggleCompare={() => toggleCompare(row.id)}
              compareFull={compare.length >= 3}
              onDetails={() => setDetails(row.id)}
            />
          ))}
        </div>
      )}

      {/* Read-only Provider Hub inspector (Sprint 64K) — the single Hub surface. */}
      {detailsProvider && <HubInspector provider={detailsProvider} onClose={() => setDetails(null)} />}
    </div>
  );
}
