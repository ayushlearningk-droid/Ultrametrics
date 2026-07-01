"use client";

/**
 * Production Export Center (Sprint 63.7).
 *
 * Replaces the faded Inspector "Export" button with a real Export Drawer. The
 * asset to export comes from the existing Shared Selection; the drawer offers the
 * production export formats, a live deterministic preview, and export settings
 * (naming · resolution · watermark). Deterministic UX only — no backend, no
 * rendering, no provider execution. "Prepare" produces a deterministic manifest
 * (filename + format + resolution), nothing more.
 */

import { useCallback, useState } from "react";
import { Upload, X, Film, Image as ImageIcon, FileArchive, FileText, Link2, LayoutTemplate, BarChart3, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreativeThumbnail } from "@/components/studio/media";
import { resolveCreative } from "@/components/studio/creative/creative-data";
import { useGeneration, useSelectedAsset } from "./generation-store";
import { openExport, closeExport, useExportOpen } from "./export-store";
import { useDialog } from "./use-dialog";

interface ExportFormat {
  id: string;
  label: string;
  icon: LucideIcon;
  ext: string;
}

const FORMATS: ExportFormat[] = [
  { id: "mp4", label: "MP4", icon: Film, ext: "mp4" },
  { id: "image", label: "Image", icon: ImageIcon, ext: "png" },
  { id: "zip", label: "ZIP", icon: FileArchive, ext: "zip" },
  { id: "pdf", label: "PDF Brief", icon: FileText, ext: "pdf" },
  { id: "share", label: "Share Link", icon: Link2, ext: "url" },
  { id: "meta", label: "Meta Draft", icon: LayoutTemplate, ext: "json" },
  { id: "google", label: "Google Ads Assets", icon: BarChart3, ext: "zip" },
];

const RESOLUTIONS = ["1080p", "720p", "4K"] as const;

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

/** Reusable Export button — opens the drawer for the shared-selected asset. */
export function ExportButton() {
  return (
    <button
      type="button"
      onClick={openExport}
      title="Export the selected asset"
      className="studio-focusable flex w-full items-center gap-2 rounded-[var(--studio-radius-sm)] px-3 py-2 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
    >
      <Upload className="h-3.5 w-3.5" />
      Export
    </button>
  );
}

export function ExportDrawer() {
  const isOpen = useExportOpen();
  const selected = useSelectedAsset();
  const gen = useGeneration();

  const [formatId, setFormatId] = useState("mp4");
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>("1080p");
  const [watermark, setWatermark] = useState(true);
  const [name, setName] = useState("");
  const [prepared, setPrepared] = useState<string | null>(null);

  const close = useCallback(() => {
    setPrepared(null);
    closeExport();
  }, []);
  const ref = useDialog<HTMLDivElement>(isOpen, close);

  if (!isOpen) return null;

  const creative = selected ? resolveCreative(selected) : undefined;
  const format = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0];
  const baseName = name.trim() || creative?.title || gen?.campaignPlan.name || "asset";
  const filename = `${slug(baseName)}-${resolution}${watermark ? "-wm" : ""}.${format.ext}`;

  // Real generated assets in the current generation (Sprint 64O) — no placeholders.
  const realAssets = (gen?.creatives ?? []).filter(
    (c) => c.execution?.status === "completed" && !!c.execution.mediaUrl && !c.execution.mediaUrl.startsWith("placeholder://")
  );
  const ready = realAssets.length > 0;

  // Build the export package on the server and download the ZIP. No client zipping.
  const runExport = async () => {
    if (!gen || realAssets.length === 0) return;
    const payload = {
      name: baseName,
      prompt: gen.input.brief,
      assets: realAssets.map((c) => ({
        id: c.id,
        title: c.title,
        url: c.execution!.mediaUrl!,
        provider: c.execution!.provider,
        resolution: c.execution!.resolution,
        mimeType: c.execution!.mimeType,
        latencyMs: c.execution!.latencyMs,
        cost: c.execution!.cost,
        seed: c.execution!.seed,
        generationTimeMs: c.execution!.generationTimeMs,
      })),
      generation: { campaignPlan: gen.campaignPlan, creativePlan: gen.creativePlan, timeline: gen.timeline, activity: gen.activity, execution: gen.execution },
      brand: { dna: gen.input.dna, brandAssets: gen.input.brandAssets },
      metadata: { format: format.id, resolution, watermark, providerPreference: gen.input.providerPreference, outcomeId: gen.input.outcomeId },
    };
    try {
      const res = await fetch("/api/studio/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        setPrepared(null);
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${slug(baseName)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setPrepared(`${slug(baseName)}.zip`);
    } catch {
      setPrepared(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Export Center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div ref={ref} tabIndex={-1} className="studio-card relative flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-none p-5 outline-none">
        <header className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <Upload className="h-3.5 w-3.5 text-brand" /> Export Center
          </span>
          <button type="button" onClick={close} className="studio-focusable ml-auto text-foreground-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        {!creative ? (
          <div className="studio-card flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="type-body font-semibold text-foreground">No asset selected</p>
            <p className="type-caption text-foreground-muted">Pick a creative — selection is shared across the workspace.</p>
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="flex flex-col gap-2">
              <span className="type-eyebrow text-foreground-muted">Preview</span>
              <div className="overflow-hidden rounded-[var(--studio-radius-md)]">
                <CreativeThumbnail media={creative.media} aspect="video" />
              </div>
              <p className="truncate type-caption font-semibold text-foreground">{creative.title}</p>
              <p className="truncate type-caption text-foreground-muted">{filename}</p>
              {creative.execution?.mediaUrl && (
                <p className="truncate type-caption text-foreground-muted">Source: {creative.execution.mediaUrl}</p>
              )}
            </div>

            {/* Formats */}
            <div className="flex flex-col gap-2">
              <span className="type-eyebrow text-foreground-muted">Format</span>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={formatId === f.id}
                    onClick={() => { setFormatId(f.id); setPrepared(null); }}
                    className={cn(
                      "studio-focusable inline-flex items-center gap-2 rounded-[var(--studio-radius-sm)] border px-2.5 py-2 type-caption transition-colors",
                      formatId === f.id ? "border-brand/40 bg-brand/10 font-semibold text-brand" : "border-white/[0.08] text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
                    )}
                  >
                    <f.icon className="h-3.5 w-3.5 shrink-0" /> {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="flex flex-col gap-3">
              <span className="type-eyebrow text-foreground-muted">Settings</span>

              <label className="flex flex-col gap-1.5">
                <span className="type-caption text-foreground-muted">Name</span>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setPrepared(null); }}
                  placeholder={creative.title}
                  className="studio-focusable rounded-[var(--studio-radius-md)] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 type-caption text-foreground placeholder:text-foreground-muted/60"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="type-caption text-foreground-muted">Resolution</span>
                <div className="flex gap-1.5">
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={resolution === r}
                      onClick={() => { setResolution(r); setPrepared(null); }}
                      className={cn(
                        "studio-focusable flex-1 rounded-[var(--studio-radius-sm)] border px-2.5 py-1.5 type-caption transition-colors",
                        resolution === r ? "border-brand/40 bg-brand/10 font-semibold text-brand" : "border-white/[0.08] text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setWatermark((w) => !w); setPrepared(null); }}
                aria-pressed={watermark}
                className="studio-focusable flex items-center justify-between rounded-[var(--studio-radius-md)] border border-white/[0.08] px-3 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <span className="type-caption text-foreground">Watermark</span>
                <span className={cn("flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", watermark ? "bg-brand/60" : "bg-white/[0.12]")}>
                  <span className={cn("h-4 w-4 rounded-full bg-white transition-transform", watermark && "translate-x-4")} />
                </span>
              </button>
            </div>

            {/* Prepare (deterministic — no rendering) */}
            <div className="mt-auto flex flex-col gap-2 border-t border-white/[0.06] pt-3">
              {prepared && (
                <div className="flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-brand/10 px-3 py-2 type-caption text-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="truncate">Downloaded <span className="font-semibold">{prepared}</span></span>
                </div>
              )}
              {!ready && (
                <p className="type-caption text-foreground-muted">No generated assets available.</p>
              )}
              <button
                type="button"
                onClick={() => void runExport()}
                disabled={!ready}
                className={cn(
                  "studio-focusable flex items-center justify-center gap-2 rounded-[var(--studio-radius-md)] px-4 py-2.5 type-body font-semibold transition-transform",
                  ready
                    ? "bg-brand text-[hsl(var(--brand-foreground))] hover:scale-[1.01] active:scale-100"
                    : "cursor-not-allowed bg-brand/15 text-brand opacity-60"
                )}
              >
                <Upload className="h-4 w-4" /> Export ZIP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
