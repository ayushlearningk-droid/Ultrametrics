"use client";

/**
 * Creative Gallery (Sprint 64X).
 *
 * Every generated creative appears here automatically, straight from the
 * Generation Store (the single source of truth). Each asset shows its live
 * status, provider, prompt, generation time and cost, and supports Preview,
 * Download, Remix, Regenerate, Approve, Reject and History. Remix / Regenerate
 * re-run the SAME live pipeline for that one asset (executeGeneration with a
 * single id); Approve / Reject patch the creative's review status in the store.
 * No new runtime, no redesign — presentation + existing store mutators only.
 */

import { useEffect, useState } from "react";
import { Download, RefreshCw, Sparkles, Check, X, Eye, Clock, Coins, Cpu, History, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreativeThumbnail } from "@/components/studio/media";
import { EXECUTION_LABEL } from "./execution";
import { useGeneration, setCreativeStatus, selectAsset } from "./generation-store";
import { executeGeneration } from "./executor";
import { useDialog } from "./use-dialog";
import type { GenerationResult } from "./generation-runtime";
import type { CreativeItem } from "@/components/studio/creative/creative-data";

const STATUS_TONE: Record<string, string> = {
  queued: "chip-slate",
  running: "chip-slate",
  completed: "chip-emerald",
  failed: "chip-red",
  cancelled: "chip-slate",
};

function fmtTime(ms: number | undefined): string {
  if (!ms || ms <= 0) return "—";
  const s = ms / 1000;
  return s >= 10 ? `${Math.round(s)}s` : `${s.toFixed(1)}s`;
}
function fmtCost(c: number | undefined): string {
  return c && c > 0 ? `${c.toFixed(2)} cr` : "—";
}

/** Trigger a browser download of a real generated asset. */
function download(src: string, name: string): void {
  const a = document.createElement("a");
  a.href = src;
  a.download = name;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 type-caption text-foreground-muted">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="shrink-0">{label}</span>
      <span className="ml-auto truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function GalleryActions({ creative, gen, compact }: { creative: CreativeItem; gen: GenerationResult; compact?: boolean }) {
  const ex = creative.execution;
  const completed = ex?.status === "completed";
  const src = ex?.mediaUrl;
  const approved = creative.status === "approved";
  const rejected = creative.status === "archived";

  const Btn = ({ onClick, title, icon: Icon, active, disabled, tone }: { onClick: () => void; title: string; icon: typeof Check; active?: boolean; disabled?: boolean; tone?: "brand" | "red" }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "studio-focusable inline-flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] border transition-colors",
        disabled ? "cursor-not-allowed border-white/[0.06] text-foreground-muted/40" : "border-white/[0.08] text-foreground-muted hover:bg-white/[0.06] hover:text-foreground",
        active && tone === "brand" && "border-brand/40 bg-brand/10 text-brand",
        active && tone === "red" && "border-red-400/40 bg-red-400/10 text-red-300"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      <Btn onClick={() => src && download(src, `${creative.id}.png`)} title="Download" icon={Download} disabled={!src} />
      <Btn onClick={() => void executeGeneration(gen, [creative.id])} title="Remix" icon={Sparkles} />
      <Btn onClick={() => void executeGeneration(gen, [creative.id])} title="Regenerate" icon={RefreshCw} />
      <Btn onClick={() => setCreativeStatus(creative.id, "approved")} title="Approve" icon={Check} disabled={!completed} active={approved} tone="brand" />
      <Btn onClick={() => setCreativeStatus(creative.id, "archived")} title="Reject" icon={X} disabled={!completed} active={rejected} tone="red" />
    </div>
  );
}

function PreviewModal({ creative, gen, onClose }: { creative: CreativeItem; gen: GenerationResult; onClose: () => void }) {
  const ex = creative.execution;
  const ref = useDialog<HTMLDivElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Preview ${creative.title}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="studio-card relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto p-5 outline-none">
        <header className="flex items-center gap-2">
          <p className="truncate type-body font-semibold text-foreground">{creative.title}</p>
          <span className={cn("chip shrink-0", STATUS_TONE[ex?.status ?? "queued"])}>{EXECUTION_LABEL[ex?.status ?? "queued"]}</span>
          <button type="button" onClick={onClose} className="studio-focusable ml-auto text-foreground-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-hidden rounded-[var(--studio-radius-md)]">
          <CreativeThumbnail media={creative.media} aspect={creative.media.kind === "video" ? "video" : "square"} />
        </div>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <MetaRow icon={Cpu} label="Provider" value={ex?.provider ?? "—"} />
          <MetaRow icon={Clock} label="Generation time" value={fmtTime(ex?.generationTimeMs ?? ex?.latencyMs)} />
          <MetaRow icon={Coins} label="Cost" value={fmtCost(ex?.cost)} />
          <MetaRow icon={Eye} label="Status" value={EXECUTION_LABEL[ex?.status ?? "queued"]} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="type-eyebrow text-foreground-muted">Prompt</span>
          <p className="type-caption text-foreground-muted">{gen.input.brief || creative.title}</p>
          {ex?.error && <p className="type-caption text-red-300">{ex.error}</p>}
        </div>

        {creative.history && creative.history.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
              <History className="h-3 w-3" /> History
            </span>
            {creative.history.map((h, i) => (
              <p key={i} className="type-caption text-foreground-muted">
                {new Date(h.at).toLocaleString()} — {h.text}
              </p>
            ))}
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-3">
          <GalleryActions creative={creative} gen={gen} />
        </div>
      </div>
    </div>
  );
}

function GalleryCard({ creative, gen, onPreview }: { creative: CreativeItem; gen: GenerationResult; onPreview: () => void }) {
  const ex = creative.execution;
  const status = ex?.status ?? "queued";
  const completed = status === "completed" && !!ex?.mediaUrl;
  const failed = status === "failed" || status === "cancelled";

  // Subtle entrance — the card fades/rises in as it appears in the Gallery.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <div
      className={cn(
        "studio-card flex flex-col gap-2.5 p-3 transition-all duration-500",
        mounted ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      )}
    >
      {completed ? (
        <button
          type="button"
          onClick={() => {
            selectAsset(creative.id);
            onPreview();
          }}
          title="Preview"
          className="studio-focusable group relative overflow-hidden rounded-[var(--studio-radius-md)]"
        >
          <CreativeThumbnail media={creative.media} aspect={creative.media.kind === "video" ? "video" : "square"} />
          {/* Success celebration — a brief breathing check on the fresh asset. */}
          <span className="studio-breathe absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[hsl(var(--brand-foreground))] shadow">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Eye className="h-5 w-5 text-white" />
          </span>
        </button>
      ) : failed ? (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[var(--studio-radius-md)] border border-red-400/30 bg-red-400/[0.06] p-3 text-center">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <p className="max-w-full truncate type-caption text-foreground-muted">{ex?.error ?? "Generation failed."}</p>
          <button
            type="button"
            onClick={() => void executeGeneration(gen, [creative.id])}
            className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] bg-brand px-3 py-1.5 type-caption font-semibold text-[hsl(var(--brand-foreground))] transition-transform hover:scale-[1.02] active:scale-100"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : (
        // Beautiful skeleton while queued / generating (real state — no fake timer).
        <div className="relative aspect-square w-full animate-pulse overflow-hidden rounded-[var(--studio-radius-md)] bg-white/[0.06]">
          <span className="absolute inset-0 flex items-center justify-center type-caption text-foreground-muted">
            {status === "running" ? "Generating…" : "Queued"}
          </span>
        </div>
      )}

      <p className="truncate type-caption font-semibold text-foreground">{creative.title}</p>

      <div className="flex flex-col gap-1">
        <MetaRow icon={Cpu} label="Provider" value={ex?.provider ?? "—"} />
        <MetaRow icon={Clock} label="Time" value={fmtTime(ex?.generationTimeMs ?? ex?.latencyMs)} />
        <MetaRow icon={Coins} label="Cost" value={fmtCost(ex?.cost)} />
      </div>

      <GalleryActions creative={creative} gen={gen} compact />
    </div>
  );
}

export function CreativeGallery() {
  const gen = useGeneration();
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (!gen || gen.creatives.length === 0) {
    return (
      <div className="studio-card px-6 py-12 text-center">
        <p className="type-caption text-foreground-muted">No creatives yet — generate a campaign to fill the gallery.</p>
      </div>
    );
  }

  const preview = previewId ? gen.creatives.find((c) => c.id === previewId) : undefined;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand" /> Creative Gallery
        </span>
        <span className="ml-auto type-caption tabular-nums text-foreground-muted">{gen.creatives.length} assets</span>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {gen.creatives.map((c) => (
          <GalleryCard key={c.id} creative={c} gen={gen} onPreview={() => setPreviewId(c.id)} />
        ))}
      </div>

      {preview && <PreviewModal creative={preview} gen={gen} onClose={() => setPreviewId(null)} />}
    </section>
  );
}
