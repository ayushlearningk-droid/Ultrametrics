"use client";

/**
 * Production Creative Browser — CreativeQuickPreview (Sprint 63).
 * A floating preview overlay for the selected creative: large media + full
 * metadata + actions. Esc / backdrop close. Keyboard + focus. Token-based.
 */

import { X } from "lucide-react";
import { VideoPreviewCard, CreativeThumbnail, PerformanceBadge } from "@/components/studio/media";
import { useDialog } from "@/components/studio/generation/use-dialog";
import { useCreativeBrowser, useCreativeById } from "./creative-context";
import { CreativeStatus } from "./creative-status";
import { CreativeMetadata } from "./creative-metadata";
import { CreativeActions } from "./creative-actions";

export function CreativeQuickPreview() {
  const { previewId, setPreviewId } = useCreativeBrowser();
  const item = useCreativeById(previewId);
  const ref = useDialog<HTMLDivElement>(!!previewId && !!item, () => setPreviewId(null));

  if (!previewId || !item) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onPointerDown={() => setPreviewId(null)} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal aria-label={`Preview ${item.title}`} className="studio-surface-raised relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden outline-none">
        <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="type-body font-semibold text-foreground">{item.title}</span>
            <CreativeStatus status={item.status} />
          </div>
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setPreviewId(null)}
            className="studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {item.media.kind === "video" ? (
            <VideoPreviewCard platform={item.platform} metrics={item.metrics} />
          ) : (
            <div className="overflow-hidden rounded-[var(--studio-radius-lg)]">
              <CreativeThumbnail media={item.media} aspect="video" />
            </div>
          )}

          <CreativeMetadata item={item} />

          {item.metrics && item.metrics.length > 0 && (
            <div className="flex gap-1.5">
              {item.metrics.map((m) => (
                <PerformanceBadge key={m.label} metric={m} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span key={t} className="chip chip-slate">#{t}</span>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="type-caption text-foreground-muted">{item.variants} variants · v{item.version}</span>
            <CreativeActions onPreview={() => undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}
