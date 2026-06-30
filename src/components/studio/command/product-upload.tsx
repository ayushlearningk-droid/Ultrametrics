"use client";

/**
 * AI Studio Command Center — ProductUpload (Sprint 63).
 * Drag & drop + file picker for product media. Presentation only — captures
 * attachment names (no upload/backend). Keyboard + focus + accessible.
 */

import { useRef, useState } from "react";
import { UploadCloud, ImageIcon, Video, Link2, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommand, type Attachment } from "./command-context";

function kindIcon(kind: Attachment["kind"]) {
  if (kind === "image") return <ImageIcon className="h-3 w-3" />;
  if (kind === "video") return <Video className="h-3 w-3" />;
  if (kind === "url") return <Link2 className="h-3 w-3" />;
  return <FileText className="h-3 w-3" />;
}

function kindOf(name: string, type?: string): Attachment["kind"] {
  if (type?.startsWith("image") || /\.(png|jpe?g|webp|gif)$/i.test(name)) return "image";
  if (type?.startsWith("video") || /\.(mp4|mov|webm)$/i.test(name)) return "video";
  return "text";
}

export function ProductUpload() {
  const { attachments, addAttachment, removeAttachment } = useCommand();
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => addAttachment({ name: f.name, kind: kindOf(f.name, f.type) }));
  };

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
          addFiles(e.dataTransfer.files);
        }}
        aria-label="Upload product media — drag and drop or click"
        className={cn(
          "studio-focusable flex items-center justify-center gap-2 rounded-[var(--studio-radius-md)] border border-dashed px-4 py-3 type-caption transition-colors",
          over ? "border-brand/50 bg-brand/[0.06] text-brand" : "border-white/[0.12] text-foreground-muted hover:border-white/[0.2] hover:text-foreground"
        )}
      >
        <UploadCloud className="h-4 w-4" />
        Drop a product image or video — or click to upload
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-1 type-caption text-foreground/90">
              {kindIcon(a.kind)}
              <span className="max-w-[160px] truncate">{a.name}</span>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => removeAttachment(a.id)}
                className="studio-focusable text-foreground-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
