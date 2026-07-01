"use client";

/**
 * AI Studio — ReferenceUpload (Sprint 65.0).
 *
 * The REAL creation-input uploader: reads actual file bytes (FileReader →
 * data URL) and stores them as reference assets in the existing Generation Store.
 * Supports the file picker, drag & drop, Ctrl+V paste (via the exported
 * ingestFiles), and multiple reference images, each with a real thumbnail
 * preview. No backend, no network, no providers, no mock names.
 */

import { useRef, useState } from "react";
import { UploadCloud, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { addReferenceAsset, removeReferenceAsset, useReferenceAssets } from "@/components/studio/generation/generation-store";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Read real image/video files into the Generation Store. Shared by picker/drop/paste. */
export function ingestFiles(files: FileList | File[] | null): void {
  if (!files) return;
  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image") && !file.type.startsWith("video")) continue;
    void readAsDataUrl(file).then((dataUrl) =>
      addReferenceAsset({ name: file.name, kind: file.type.startsWith("video") ? "video" : "image", dataUrl })
    );
  }
}

export function ReferenceUpload() {
  const assets = useReferenceAssets();
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          ingestFiles(e.dataTransfer.files);
        }}
        aria-label="Add reference images — drag and drop, paste, or click"
        className={cn(
          "studio-focusable flex items-center justify-center gap-2 rounded-[var(--studio-radius-md)] border border-dashed px-4 py-3 type-caption transition-colors",
          over ? "border-brand/50 bg-brand/[0.06] text-brand" : "border-white/[0.12] text-foreground-muted hover:border-white/[0.2] hover:text-foreground"
        )}
      >
        <UploadCloud className="h-4 w-4" />
        Drop reference images, paste, or click to upload
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          ingestFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((a) => (
            <div key={a.id} className="group relative h-16 w-16 overflow-hidden rounded-[var(--studio-radius-md)] border border-white/[0.08] bg-white/[0.03]">
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-foreground-muted">
                  <Video className="h-5 w-5" />
                </div>
              )}
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => removeReferenceAsset(a.id)}
                className="studio-focusable absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
