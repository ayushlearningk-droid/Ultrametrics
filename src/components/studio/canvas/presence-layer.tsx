"use client";

/**
 * Living Canvas — AI presence cursors (Sprint 63G).
 *
 * Renders floating AI cursors in world space (idle demo roster). Foundation
 * only — no realtime, no collaboration logic. Reduced-motion safe (the float is
 * a token animation disabled under prefers-reduced-motion).
 */

import { MousePointer2 } from "lucide-react";
import { DEMO_PRESENCE } from "./presence";

export function PresenceLayer() {
  return (
    <>
      {DEMO_PRESENCE.map((p, i) => (
        <div
          key={p.id}
          aria-hidden
          className="studio-cursor-float pointer-events-none absolute"
          style={{ left: p.x, top: p.y, animationDelay: `${i * 1.4}s` }}
        >
          <MousePointer2 className="h-4 w-4 -rotate-12 text-brand/70" fill="currentColor" />
          <span className="mt-0.5 inline-block rounded-[var(--studio-radius-sm)] bg-brand/15 px-1.5 py-0.5 type-caption text-brand">
            {p.name}
          </span>
        </div>
      ))}
    </>
  );
}
