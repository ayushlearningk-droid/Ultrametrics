"use client";

/**
 * Production Media — MediaFrame (Sprint 63).
 *
 * The shared media surface used by every media card. Renders a real <img> or an
 * autoplay-on-hover <video> when a source is provided; otherwise an honest,
 * neutral empty-media frame (a muted glyph) — never a fake gradient masquerading
 * as content. Reuses the studio-media token. No business logic.
 */

import { useRef, useState } from "react";
import { Image as ImageIcon, Video as VideoIcon, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaSource } from "./types";

function EmptyFrame({ kind }: { kind: MediaSource["kind"] }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/[0.015] text-foreground-muted/40">
      {kind === "video" ? <VideoIcon className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
    </div>
  );
}

function PlayOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/30 text-foreground/80 backdrop-blur-sm">
        <Play className="h-4 w-4" />
      </span>
    </div>
  );
}

export function MediaFrame({ media, className }: { media: MediaSource; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const hasSrc = Boolean(media.src);

  if (media.kind === "image") {
    return (
      <div className={cn("studio-media relative h-full w-full overflow-hidden", className)}>
        {hasSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.src} alt={media.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <EmptyFrame kind="image" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("studio-media relative h-full w-full overflow-hidden", className)}
      onMouseEnter={() => {
        if (!hasSrc) return;
        void videoRef.current?.play();
        setPlaying(true);
      }}
      onMouseLeave={() => {
        if (!hasSrc) return;
        const v = videoRef.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
        setPlaying(false);
      }}
    >
      {hasSrc ? (
        <>
          <video
            ref={videoRef}
            src={media.src}
            poster={media.poster}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
          {!playing && <PlayOverlay />}
        </>
      ) : (
        <EmptyFrame kind="video" />
      )}
    </div>
  );
}
